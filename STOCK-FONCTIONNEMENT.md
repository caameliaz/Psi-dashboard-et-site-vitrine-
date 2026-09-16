# Fonctionnement du stock — guide de référence

Ce document explique COMMENT fonctionne le système de stock (produits finis, matières
premières, liste d'achat, liste de production, stock commercial) et POURQUOI il est conçu
ainsi. Organisé par fonctionnalité, dans le même ordre que `TESTS-STOCK.md` (le plan de test
correspondant, avec ce qu'il faut vérifier pour chaque cas critique décrit ici).

Fichier central de toute la logique : `src/lib/order-stock.ts`. Traçabilité affichée
("Commandes concernées", badge "Bloqué") : `src/lib/stock-traceability.ts`.

## 0. Le vocabulaire

Pour un **produit** :
- **Disponible** (`available`) : prêt à vendre, pas rattaché à une commande précise. Depuis
  l'ajout du stock commercial, inclut aussi ce qui est physiquement chez un commercial.
- **Réservé** (`reserved`) : mis de côté pour une commande confirmée, rien n'a encore
  physiquement bougé (pas produit, pas livré).
- **En livraison** / **En retour** : états annexes, peu automatisés (correction manuelle).
- **Total** = Disponible + Réservé.
- **Hors commerciaux** = Disponible + Réservé − attribué aux commerciaux (`StockAssignment`) —
  ce qui est réellement en entrepôt ou engagé sur une commande, retiré de ce qui est dans un
  camion/chez un commercial.

Pour une **matière première** : mêmes champs `available`/`reserved`, pas de notion de
commercial (jamais attribuée à un employé).

Sur une ligne de liste d'achat/production, trois natures de besoin, jamais mélangées :
- **`neededQuantity`** (besoin réel) : dérivé des commandes en cours + tout ajout manuel
  persistant (`manualQuantity`, inclus DEDANS `neededQuantity`, jamais un champ à part dans le
  total affiché).
- **`bufferQuantity`** (rattrapage préventif) : `stockMax − available` si `available` est sous
  son seuil de réassort, sinon 0. Ne réserve JAMAIS de matière/stock — un simple indicateur
  (voir §10 pour ce qui pilote ce calcul).
- **Total affiché** = `neededQuantity + bufferQuantity`.

Tout ceci est **recalculé à neuf à chaque action** (jamais accumulé/incrémenté à la main), pour
ne jamais dériver au fil des cycles réserve/relâche.

## 0bis. Cycle de vie d'une commande et statuts

1. **Création** : articles à `stockPath = NONE`, rien touché au stock. Statut `En attente`.
2. **Confirmation** (`confirmStock`), passage à `Confirmé` : pour chaque article,
   - ce qui est déjà `available` est pris directement → `stockPath = FROM_STOCK`, `available
     → reserved`.
   - le manquant d'un produit **acheté** → `PURCHASE_PENDING`, ligne d'achat produit créée/mise
     à jour (`resyncPurchaseLineForProduct`).
   - le manquant d'un produit **fabriqué** → `IN_PRODUCTION`, ligne de production créée/mise à
     jour (`resyncProductionLine`) : à chaque hausse du besoin réel, elle réserve ce qu'elle
     peut de matière (`reserveRawMaterialsForProduction`), et passe `BLOQUE` si la recette ne
     peut pas être entièrement couverte.
3. **checkCompletion** : dès que tous les articles sont résolus (`FROM_STOCK` ou
   `resolvedQuantity ≥ quantity`), la commande passe automatiquement à **Disponible**
   (ex-"Produit").
4. **Marquer Disponible** (bouton manuel — voir §4 "Marquer commandes produites").
5. **Livrée** (`deliverStock`) : `reserved` du produit baisse du `resolvedQuantity` de chaque
   article — et si un commercial est verrouillé dessus (cf. §12), son stock baisse aussi.
6. **Annulée** (`cancelStock`, voir §7) : possible depuis `En attente`/`Confirmé` uniquement.

La priorité (`priority`) n'est modifiable QUE sur "Confirmé", et ne déclenche rien dans
l'instant — elle compte juste comme "le plus ancien" au prochain évènement qui recalcule le
stock (voir §13, FIFO).

## 1. Bouton "Produire" (marquer une ligne de production fabriquée)

`PATCH /api/production-list/[id]` : vérifie D'ABORD que `available + reserved` (toutes matières
de la recette) suffit pour TOUTE la quantité demandée — sinon refus net (409), rien n'est
modifié.

**Produit fabriqué sans AUCUNE recette définie** : jamais produit en silence. La route renvoie
`409 { error: 'NO_RECIPE', productId, reference, name }` tant que l'appelant n'a pas choisi
explicitement, via le body de la requête :
- `allowNoRecipe: true` — continuer sans recette (comportement historique : aucune
  vérification/consommation de matière, juste un avertissement renvoyé après coup) ;
- `recipeOverride: [{ rawMaterialId, quantity }]` — une recette saisie à la volée pour CETTE
  production seulement (cf. `RecipeEntryModal`, `src/components/ui/NoRecipeModal.tsx`), utilisée
  exactement comme une vraie recette pour vérifier/consommer la matière ; `saveRecipe: true` en
  plus la persiste sur le produit (`saveProductRecipe`, réconciliation globale incluse) avant de
  produire — sinon elle ne sert que pour cet appel, jamais écrite dans `RecipeItem`.

Consommation en 3 temps, matière par matière :
1. Le besoin déjà reconnu de la ligne vient d'abord de son propre `reserved`.
2. Le surplus (buffer, ou quantité forcée au-delà du besoin réel) prend sur `available`.
3. S'il en manque encore, **vol assumé** dans le `reserved` du pot commun — potentiellement
   compté pour D'AUTRES lignes "À produire". Ces autres lignes sont réévaluées juste après
   (`reassessProductionForMaterial`, FIFO cross-produit par vraie ancienneté de commande — voir
   §13) : les plus récentes basculent "Bloquée" en priorité, le manquant résultant remonte dans
   la liste d'achat matière.

Angle mort documenté, non corrigé : ce vol (étape 3) peut créditer à tort un commercial
verrouillé sur la ligne victime si l'auto-attribution est active (cf. §12.5).

Le produit fabriqué est ensuite distribué aux commandes liées en FIFO par produit
(`distributeProduction`, voir §13), le reliquat part en `available`.

## 2. Bouton "Commander" (liste d'achat matière / produit acheté)

Rejouable plusieurs fois : prend d'abord sur `neededQuantity` puis sur `bufferQuantity`, jamais
plus que le manquant actuel. `orderedQuantity` est figé une fois commandé (jamais recalculé
ensuite) — `neededQuantity`/`bufferQuantity`, eux, continuent d'évoluer normalement derrière,
même après la commande fournisseur.

Ce qui est déjà commandé (l'"en-transit" = `orderedQuantity − receivedQuantity`) compte comme du
stock sécurisé dans le calcul de couverture du besoin (voir `resyncMaterialPurchaseNeed` §0) —
c'est ce qui évite qu'une carte réclame à tort un réassort déjà en route, même si le besoin ou
le buffer sont recalculés entre-temps (annulation de la commande d'origine, nouvelle commande…).
Le statut reste "Commandé" jusqu'à réception, jamais supprimé automatiquement une fois passé.

## 3. Bouton "Réceptionner"

**"Valider réception"** : refuse si tout le commandé est déjà reçu, ou si la quantité dépasse ce
qu'il reste à recevoir.
- **Matière première** → toujours ajoutée en `available`, puis débloque les lignes de
  production "Bloquée" en attente sur cette matière (`unblockProductionForMaterial`, FIFO
  cross-produit — voir §13), en distribuant progressivement (pas tout-ou-rien : une ligne se
  débloque dès qu'elle est entièrement couverte, les suivantes attendent leur tour).
- **Produit acheté** → distribué aux commandes clients liées en FIFO par produit
  (`distributeToLinkedItems`), le reliquat part en `available`.

Une ligne ne passe "Reçu" que lorsque **besoin ET buffer sont à 0, ET** tout le commandé a été
reçu (`receivedQuantity ≥ orderedQuantity`) — la double condition évite qu'une réception minime
ferme la carte à tort juste parce que l'en-transit restant couvrait déjà le besoin recalculé.

## 4. "Marquer commandes produites" (bouton "Marquer Disponible", `forceCompleteOrder`)

Force la résolution du manquant d'une commande/devis encore incomplet, dans cet ordre strict,
par article :
1. Le disponible du produit.
2. Le réservé d'une AUTRE commande/devis déjà active (Disponible ou Confirmée) sur ce même
   produit — vol assumé, toujours la plus récemment créée en premier (FIFO par produit inversé,
   voir §13). Si le donneur était "Disponible", il repasse "Confirmée" et son manquant
   réapparaît normalement dans la liste concernée.
3. Pour un produit **fabriqué** seulement : fabrication immédiate avec la matière déjà
   réservée.

Si un manquant persiste après ces trois étapes : blocage net (409, `PRODUCT_SHORTFALL`), rien
n'est modifié — sauf option explicite "forcer quand même", qui accepte l'écart. Cette action ne
redistribue jamais aux autres commandes en attente sur le même produit ; elle ne sert que celle
qu'on force.

**Produit fabriqué sans AUCUNE recette** (étape 3) : même principe qu'au §1 — jamais fabriqué en
silence (`previewForceCompleteShortfall` distingue ces produits à part, `noRecipeProducts`, du
vrai manquant chiffré `shortfalls`). Tant qu'aucun produit de la commande/du devis n'est dans ce
cas, ni `409 { error: 'NO_RECIPE', products }` ne bloque le passage à "Disponible" : avant ce
chantier, `manufacturableUnits` traitait "pas de recette" comme "tout est fabricable" et une
commande pouvait passer "Disponible" sans jamais vérifier la moindre matière — corrigé. Mêmes
options `allowNoRecipe` / `recipeOverride` + `saveRecipe` qu'au §1, portées cette fois par le
body de `PATCH /api/orders|quotes/[id]` (`status: 'PRODUITE'`) ; côté matière, une recette saisie
à la volée (non sauvegardée) n'ayant jamais été réservée à l'avance, l'étape 3 consomme alors
directement sur le `available` de la matière (`manufactureWithOverride`) plutôt que sur son
`reserved` — jamais de vol chez une autre ligne dans ce cas précis.

## 5. "Commandes concernées" (traçabilité affichée, `stock-traceability.ts`)

Sur une carte matière :
- **Uniquement les commandes réellement "Bloquées"** (le réservé actuel ne suffit pas à les
  couvrir, simulation FIFO cumulée) apparaissent avec le badge — une commande couverte
  n'apparaît pas dans cet état, même si la carte existe à cause d'une autre commande ou du
  buffer.
- Quantité affichée = le manquant réel de CETTE commande, converti en unités de matière (ratio
  de recette) — jamais le manquant produit brut, et jamais son besoin total si une partie est
  déjà couverte par ce qu'il reste du pool avant elle en FIFO (`missingQty`, différence de
  cumul).
- Le produit concerné est précisé entre parenthèses si la matière est partagée par plusieurs
  produits.
- **"Réassort préventif (RÉF produit)"** : une ligne par produit dont le buffer cascade sur
  cette matière — mais seulement la part qui dépasserait le coussin de sécurité de la matière
  (`available − son propre seuil`) ; le buffer peut consommer ce coussin librement, seul le
  dépassement compte comme manquant. Cumul FIFO si plusieurs produits cascadent.
- **"Réassort préventif"** (sans produit) : le buffer PROPRE de la matière (son propre seuil).
- **"Ajouté manuellement"** : la part de `manualQuantity`.

Le statut "Bloqué" n'existe qu'au niveau de la commande individuelle listée ici — jamais au
niveau de la carte/ligne elle-même.

## 6. Modification de commande (`adjustOrderItemQuantity`)

- **Augmentation** : reprend d'abord sur le disponible, sinon repart en production/achat
  (mêmes mécanismes qu'une confirmation, cf. §0bis).
- **Réduction** : `reserved → available` pour l'excédent déjà résolu ; si l'article était
  `IN_PRODUCTION`, la matière correspondante est relâchée d'autant.
- Le surplus ainsi libéré est immédiatement réaffecté aux AUTRES commandes en attente sur ce
  même produit (FIFO par produit, voir §13) — jamais laissé "libre" sans vérification.
- La matière relâchée par la réduction propose aussi son dispo à d'autres produits "Bloqués"
  qui partagent cette matière (`unblockProductionForMaterial`, FIFO cross-produit).

## 7. Annulation de commande (`cancelStock` → `releaseOrderItemStock`)

Même mécanique que la réduction de quantité (§6), appliquée à la totalité de l'article :
`reserved → available`, matière `IN_PRODUCTION` relâchée. Le surplus produit est réaffecté aux
autres commandes en attente (FIFO par produit), et la matière libérée déclenche le même
déblocage cross-produit que §6.

Ce qui est déjà commandé chez le fournisseur (§2) reste comptabilisé comme sécurisé : annuler la
commande client d'origine ne fait pas réapparaître de manquant trompeur tant que l'en-transit
suffit toujours à couvrir le besoin recalculé.

(Note : "Retour" — `returnStock` — se contente d'incrémenter `returned` ; la remise en stock
disponible est une action manuelle séparée, pas automatisée.)

## 8. Restock (réapprovisionnement manuel dédié, page Stock)

- **Mode "produire"** (produit fabriqué) : `available` du produit augmente, les matières de sa
  recette sont consommées immédiatement (`available` matière diminue d'autant, refusé si la
  matière ne suffit pas) — une vraie fabrication, jamais une réservation. Ensuite,
  `reallocateAvailableStock` comble en priorité les commandes en attente sur ce produit, et le
  buffer des matières consommées est recalculé.
- **Mode "acheter"**, ou restock direct d'une matière : `available` augmente simplement. Pour
  une matière, ça débloque les lignes de production "Bloquée" en attente
  (`unblockProductionForMaterial`, FIFO cross-produit) et recalcule le buffer. Pour un produit,
  ça déclenche `reallocateAvailableStock` comme ci-dessus.

## 9. Modification manuelle de stock (correction directe d'un champ)

Un champ est fixé à une valeur exacte (pas un delta) :
- **Disponible, à la baisse** : seul le buffer se recalcule (le besoin réel ne dépend que des
  commandes actives, jamais d'une simple correction de stock).
- **Disponible, à la hausse** : `reallocateAvailableStock` comble d'abord les commandes en
  attente sur ce produit (FIFO), le reliquat compte comme buffer ; pour une matière, ça débloque
  les lignes "Bloquée" en attente.
- **Réservé, sur une matière** : recalcule immédiatement le besoin réel de toutes les lignes qui
  en dépendent ; à la baisse, `reassessProductionForMaterial` revérifie ces lignes (FIFO
  cross-produit, voir §13) — les plus récentes rebasculent "Bloquée" en premier.
- **Réservé, sur un produit** : à la baisse, `reassessProductReserved` reprend la couverture aux
  commandes/devis actifs concernés (FIFO par produit, les plus récentes perdent en premier) ; à
  la hausse, aucun effet — une hausse manuelle du réservé n'invente pas de commande
  supplémentaire à mieux couvrir.

## 10. Modification du seuil (seuil d'achat, seuil de production, stock max)

Ces trois champs (`purchaseThreshold`, `productionThreshold`, `stockMax`) ne pilotent QUE le
calcul du buffer (`bufferQuantity = stockMax − available` si `available` est sous le seuil
concerné, sinon 0) — jamais le besoin réel, qui ne dépend que des commandes/devis actifs.

- Sur une **matière** (`PATCH /api/raw-materials/[id]`) : tout changement de `stockMax` ou
  `purchaseThreshold` déclenche `resyncMaterialBufferOnly`, un recalcul immédiat limité au
  buffer de la ligne d'achat de cette matière — le besoin réel des lignes de production qui en
  dépendent n'est pas retouché par ce seul changement.
- Sur un **produit** (`PATCH /api/products/[id]`) : tout changement de `stockMax`,
  `purchaseThreshold` ou `productionThreshold` recalcule ensemble les DEUX lignes concernées
  (`resyncProductionLine` + `resyncPurchaseLineForProduct`).
- Le buffer ne descend jamais sous 0 (`Math.max(0, stockMax − available)`).
- Comme le buffer ne réserve jamais de matière/stock (§0), un changement de seuil ne fait jamais
  basculer une ligne entre "À produire" et "Bloquée" — seul le rapport besoin réel / matière
  réservée décide de ce statut.

## 11. Modification des recettes

Relâche/réserve la matière à neuf selon l'ancienne puis la nouvelle recette, puis déclenche une
**réconciliation GLOBALE** de chaque matière touchée (`reconcileMaterialAcrossAllLines`) — pas
seulement pour le produit dont la recette vient de changer. C'est le seul endroit du système qui
peut **rétrograder** une ligne déjà "À produire" au profit d'une autre plus ancienne
(normalement, cf. §13, une ligne acquise n'est jamais remise en question).

Le tri se fait en FIFO cross-produit (§13) : par vraie commande d'origine la plus
ancienne/prioritaire encore en attente sur chaque ligne, jamais par date de création de la
ligne elle-même. La liste d'achat de chaque matière touchée est recalculée immédiatement, sans
action supplémentaire.

## 12. Stock commercial

- **Attribution** (page Stock → "+ Attribuer du stock") : ne touche JAMAIS `available`/
  `reserved` — seul `StockAssignment` bouge. Plafonnée sur le stock **"Hors commerciaux"**
  (`available + reserved − déjà attribué`), jamais sur `available` seul — sinon on pourrait
  attribuer plusieurs fois le même stock.
- **Auto-attribution** (case à cocher sur une commande "En attente"/"Confirmé", nécessite un
  commercial assigné) : dès que du stock est réservé pour cette commande, la même quantité est
  automatiquement créditée au commercial (`syncCommercialAssignment`, branché sur les 9 points
  du fichier où `resolvedQuantity` change). **Verrouillage** : le commercial crédité une
  première fois reste le même pour cet article, même si "Pris en charge par" change ensuite
  (pas de transfert automatique, pour ne jamais compter le même stock deux fois). Décocher la
  case retire immédiatement le crédit déjà donné.
- **Livraison** : retire du `StockAssignment` du commercial verrouillé jusqu'à concurrence de ce
  qu'il a réellement ; jamais `available` touché directement — si le commercial n'a pas assez,
  l'écart se répercute naturellement dans la formule "Hors commerciaux" (`reserved` baisse
  toujours du plein montant, l'attribué baisse de moins que ça).
- **12.5 Angle mort connu** (référencé depuis §1) : un vol de matière forcé par "Marquer
  fabriquée" au-delà du réel disponible peut créditer à tort un commercial verrouillé sur la
  ligne victime, même si la matière n'a jamais réellement couvert cette part. Non corrigé.

## 13. FIFO — deux mécanismes séparés

- **Par produit** (`fifoCompare` directement sur les commandes) : `reallocateAvailableStock`,
  `reassessProductReserved`, `distributeToLinkedItems`, le "vol" de `forceCompleteOrder` (§4,
  inversé : le plus récent d'abord). Compare des commandes du MÊME produit — la commande porte
  déjà sa propre date, jamais de bug possible.
- **Cross-produit** (plusieurs produits partagent une matière) : `unblockProductionForMaterial`,
  `reassessProductionForMaterial`, `reconcileMaterialAcrossAllLines`. Trient les LIGNES DE
  PRODUCTION entre elles — la clé de tri est la **vraie commande la plus ancienne/prioritaire
  encore en attente sur chaque ligne** (`productionLineFifoKey`/`sortLinesByFifo`), jamais la
  date de création de la ligne elle-même (qui peut diverger si une ligne a été supprimée puis
  recréée après un passage à 0 besoin).
- **Règle commune** : priorité toujours = prioritaire d'abord, puis le plus ancien. Une ligne/
  commande plus ancienne n'est JAMAIS délestée au profit d'une plus récente — sauf le cas
  volontaire du changement de recette (§11, seul endroit qui peut aussi rétrograder une ligne
  déjà "À produire").
- **Limite assumée** : une ligne déjà "À produire" (matière acquise) n'est JAMAIS remise en
  question par une réception de stock ou une annulation — seules deux actions EXPLICITES
  peuvent voler du `reserved` déjà acquis : "Marquer fabriquée" (§1, matière) et "Marquer
  Disponible" (§4, produit fini).
