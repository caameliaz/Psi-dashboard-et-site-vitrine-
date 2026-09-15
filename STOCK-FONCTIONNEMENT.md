# Fonctionnement du stock — guide de référence

Ce document explique COMMENT fonctionne le système de stock (produits finis, matières
premières, liste d'achat, liste de production, stock commercial) et POURQUOI il est conçu
ainsi. Pour un plan de test avec des chiffres concrets à vérifier, voir `TESTS-STOCK.md`.

Fichier central de toute la logique : `src/lib/order-stock.ts`. Traçabilité affichée
("Commandes concernées", badge "Bloqué") : `src/lib/stock-traceability.ts`.

## 1. Le vocabulaire

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
  son seuil de réassort, sinon 0. Ne réserve JAMAIS de matière/stock — un simple indicateur.
- **Total affiché** = `neededQuantity + bufferQuantity`.

Tout ceci est **recalculé à neuf à chaque action** (jamais accumulé/incrémenté à la main), pour
ne jamais dériver au fil des cycles réserve/relâche.

## 2. Cycle de vie d'une commande

1. **Création** : articles à `stockPath = NONE`, rien touché au stock.
2. **Confirmation** (`confirmStock`) : pour chaque article,
   - ce qui est déjà `available` est pris directement → `stockPath = FROM_STOCK`, `available
     → reserved`.
   - le manquant d'un produit **acheté** → `PURCHASE_PENDING`, ligne d'achat produit créée/mise
     à jour (`resyncPurchaseLineForProduct`).
   - le manquant d'un produit **fabriqué** → `IN_PRODUCTION`, ligne de production créée/mise à
     jour (`resyncProductionLine`), matière réservée si possible.
3. **checkCompletion** : dès que tous les articles sont résolus (`FROM_STOCK` ou
   `resolvedQuantity ≥ quantity`), la commande passe automatiquement **Disponible** (ex-"Produit").
4. **Marquer Disponible** (bouton manuel, `forceCompleteOrder`) : force la résolution du
   manquant en cherchant, dans l'ordre, le disponible → le réservé d'une autre commande déjà
   Disponible/Confirmée (vol, la plus récente d'abord) → fabrication immédiate avec la matière
   déjà réservée. Bloque net (ou accepte l'écart si "forcer quand même") si rien ne suffit.
5. **Livrée** (`deliverStock`) : `reserved` du produit baisse du `resolvedQuantity` de chaque
   article — et si un commercial est verrouillé dessus (cf. §7), son stock baisse aussi.

## 3. Liste d'achat — en détail

Deux natures de ligne : **matière première** (`resyncMaterialPurchaseNeed`) ou **produit
acheté** (`resyncPurchaseLineForProduct`) — logique similaire, appliquée un cran plus haut/bas.

### Pourquoi une carte existe
`neededQuantity > 0` OU `bufferQuantity > 0`, où :
- `neededQuantity` (matière) = Σ (ratio recette × besoin réel de chaque ligne de production qui
  l'utilise) + `manualQuantity` — moins ce qui est déjà couvert (`reserved + en-transit +
  available`). **Le buffer du produit fabriqué cascade dans ce calcul** : même si la matière
  elle-même est au-dessus de son seuil, le buffer d'un produit qui l'utilise peut créer un
  manquant matière.
- `bufferQuantity` (matière) = son propre `stockMax − available` si sous son propre seuil,
  réduit de ce qui est déjà couvert en excédent du besoin réel.
- Pour un produit acheté : même logique, le "réel" vient directement des commandes
  `PURCHASE_PENDING` sur ce produit, l'"en-transit" = déjà commandé au fournisseur pas encore
  reçu.

### "Commandes concernées" sur une carte matière
- **Uniquement les commandes réellement "Bloquées"** (le réservé actuel ne suffit pas à les
  couvrir, simulation FIFO cumulée) — une commande couverte n'apparaît pas, même si la carte
  existe à cause d'une autre commande/du buffer.
- Quantité affichée = **le manquant réel de CETTE commande, converti en unités de matière**
  (ratio de recette), jamais le manquant produit brut, et jamais son besoin total si une partie
  est déjà couverte par ce qu'il reste du pool avant elle en FIFO (`missingQty`, différence de
  cumul).
- Le produit concerné est précisé entre parenthèses si la matière est partagée par plusieurs
  produits.
- **"Réassort préventif (RÉF produit)"** : une ligne par produit dont le buffer cascade sur
  cette matière — mais seulement la part qui dépasserait le **coussin de sécurité** de la
  matière (`available − son propre seuil`) ; le buffer peut consommer ce coussin librement,
  seul le dépassement compte comme manquant. Cumul FIFO si plusieurs produits cascadent.
- **"Réassort préventif"** (sans produit) : le buffer PROPRE de la matière (son propre seuil).
- **"Ajouté manuellement"** : la part de `manualQuantity`.

### Actions
- **"Commander"** : rejouable plusieurs fois, prend d'abord sur `neededQuantity` puis sur
  `bufferQuantity`, jamais plus que le manquant actuel. `orderedQuantity` figé une fois
  commandé (jamais recalculé), `neededQuantity`/`bufferQuantity` continuent d'évoluer derrière.
- **"Valider réception"** : refuse si tout le commandé est déjà reçu ou si la quantité dépasse
  ce qu'il reste à recevoir. Matière → toujours en `available`, débloque les lignes de
  production Bloquées en attente (`unblockProductionForMaterial`). Produit acheté → distribué
  aux commandes liées en FIFO (`distributeToLinkedItems`), le reliquat part en `available`.
  Passe "Reçu" seulement quand besoin ET buffer sont à 0 ET tout le commandé est arrivé.

## 4. Liste de production — en détail

- Une ligne par produit fabriqué (jamais dupliquée) ; statut `A_PRODUIRE` / `BLOQUE` / `PRODUIT`.
- `neededQuantity` = Σ manquant réel des commandes `IN_PRODUCTION` sur ce produit +
  `manualQuantity`. `bufferQuantity` = `stockMax − available` si sous seuil.
- **Réservation de matière** : seul le besoin RÉEL réserve de la matière (jamais le buffer,
  décision produit explicite). À chaque hausse du besoin réel, réserve ce qu'elle peut
  (`reserveRawMaterialsForProduction`) ; passe `BLOQUE` si la recette ne peut pas être
  entièrement couverte.
- **"Marquer fabriquée"** (`PATCH /api/production-list/[id]`) : vérifie D'ABORD que
  `available + reserved` (toutes matières de la recette) suffit pour TOUTE la quantité
  demandée — sinon refus net (409), rien n'est modifié. Si un produit fabriqué n'a AUCUNE
  recette définie, ça produit quand même (pas de blocage), mais avec un **avertissement**
  explicite (pas de vérification/consommation possible).
  Consommation en 3 temps par matière :
  1. Le besoin déjà reconnu de la ligne vient d'abord de son propre `reserved`.
  2. Le surplus (buffer, ou quantité forcée) prend sur `available`.
  3. S'il en manque encore, **vol assumé** dans le `reserved` du pot commun — potentiellement
     compté pour D'AUTRES lignes "À produire". Ces autres lignes sont réévaluées juste après
     (`reassessProductionForMaterial`, FIFO par vraie ancienneté de commande) : les plus
     récentes basculent "Bloquée" en priorité.
  3 bis. Ce vol peut créditer à tort un commercial verrouillé sur la ligne victime si
  l'auto-attribution est active (angle mort documenté, non corrigé).
- Le produit fabriqué est ensuite distribué aux commandes liées en FIFO
  (`distributeProduction`), le reliquat part en `available`.

## 5. Tout ce qui influence stock et listes

| Action | Ce qui bouge | Répercussion sur les listes |
|---|---|---|
| **Restock** (page Stock, mode "produire") | `available` produit +, matières de sa recette − (si assez, sinon refusé) | `reallocateAvailableStock` (comble en priorité les commandes en attente sur ce produit) + buffer des matières consommées recalculé |
| **Restock** (mode "acheter") ou matière | `available` + | Matière : débloque les lignes en attente (`unblockProductionForMaterial`) + buffer. Produit : `reallocateAvailableStock`. |
| **Correction de stock** | Champ fixé à une valeur exacte | Recalcul du buffer (jamais le besoin réel), réaffectation si le disponible augmente |
| **Modification de quantité d'une commande** (`adjustOrderItemQuantity`) | Réduction : `reserved`→`available` pour l'excédent déjà résolu, matière relâchée si `IN_PRODUCTION` | Réaffectation immédiate du surplus aux AUTRES commandes en attente ; matière relâchée propose le dispo à d'autres produits Bloqués (`unblockProductionForMaterial`) ; hausse : reprend d'abord sur dispo, sinon repart en production/achat |
| **Annulation** (`cancelStock` → `releaseOrderItemStock`) | `reserved`→`available`, matière `IN_PRODUCTION` relâchée | Idem modification : réaffectation produit + déblocage cross-produit sur la matière libérée |
| **Retour** (`returnStock`) | `returned` + | Aucune (remise en stock disponible = action manuelle séparée) |
| **Changement de RECETTE** | Relâche/réserve à neuf selon l'ancienne puis la nouvelle recette | Réconciliation GLOBALE de chaque matière touchée (`reconcileMaterialAcrossAllLines`) — seul cas qui peut rétrograder une ligne "À produire" au profit d'une plus ancienne |

## 6. Priorité FIFO — deux mécanismes séparés

- **Par produit** (`fifoCompare` directement sur les commandes) : `reallocateAvailableStock`,
  `reassessProductReserved`, `distributeToLinkedItems`, le "vol" de `forceCompleteOrder`
  (inversé : le plus récent d'abord). Compare des commandes du MÊME produit — jamais eu de bug
  possible, la commande porte déjà sa propre date.
- **Cross-produit** (plusieurs produits partagent une matière) : `unblockProductionForMaterial`,
  `reassessProductionForMaterial`, `reconcileMaterialAcrossAllLines`. Trient les LIGNES DE
  PRODUCTION entre elles — la clé de tri est la **vraie commande la plus ancienne/prioritaire
  encore en attente sur chaque ligne** (`productionLineFifoKey`/`sortLinesByFifo`), jamais la
  date de création de la ligne elle-même (qui peut diverger si une ligne a été supprimée puis
  recréée après un passage à 0 besoin).
- **Règle commune** : priorité toujours = prioritaire d'abord, puis le plus ancien. Une ligne/
  commande plus ancienne n'est JAMAIS délestée au profit d'une plus récente — sauf le cas
  volontaire du changement de recette (réconciliation globale, seul endroit qui peut aussi
  rétrograder une ligne déjà "À produire").
- **Limite assumée** : une ligne déjà "À produire" (matière acquise) n'est JAMAIS remise en
  question par une réception de stock ou une annulation — seules deux actions EXPLICITES
  peuvent voler du `reserved` déjà acquis : "Marquer fabriquée" (matière) et "Marquer
  Disponible" (produit fini).

## 7. Stock par commercial

- **Attribution** (page Stock → "+ Attribuer du stock") : ne touche JAMAIS `available`/
  `reserved` — seul `StockAssignment` bouge. Plafonnée sur le stock **"Hors commerciaux"**
  (`available + reserved − déjà attribué`), jamais sur `available` seul — sinon on pourrait
  attribuer plusieurs fois le même stock.
- **Auto-attribution** (case à cocher sur une commande "En attente"/"Confirmé", nécessite un
  commercial assigné) : dès que du stock est réservé pour cette commande, la même quantité est
  automatiquement créditée au commercial (`syncCommercialAssignment`, branché sur les 9 points
  du fichier où `resolvedQuantity` change). **Verrouillage** : le commercial crédité une
  première fois reste le même pour cet article, même si "Pris en charge par" change ensuite
  (pas de transfert automatique, pour ne jamais compter le même stock deux fois).
  Décocher la case retire immédiatement le crédit déjà donné.
- **Livraison** : retire du `StockAssignment` du commercial verrouillé jusqu'à concurrence de
  ce qu'il a réellement ; jamais `available` touché directement — si le commercial n'a pas
  assez, l'écart se répercute naturellement dans la formule "Hors commerciaux" (`reserved`
  baisse toujours du plein montant, l'attribué baisse de moins que ça).

## 8. Statuts commande/devis

`En attente` → `Confirmé` (`confirmStock`) → `Disponible` (auto via `checkCompletion`, ou forcé
via "Marquer Disponible") → `Livré` (`deliverStock`) → éventuellement `Retourné`. `Annulé`
possible depuis `En attente`/`Confirmé` (`cancelStock`). La priorité (`priority`) n'est
modifiable QUE sur "Confirmé", et ne déclenche rien dans l'instant — compte juste comme "le
plus ancien" au prochain évènement qui recalcule le stock.
