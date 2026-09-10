# Plan de test — Liste d'achat / Liste de production

Prenez un produit **fabriqué** avec une recette (1 matière suffit, ratio 1:1 pour retrouver
facilement les chiffres ci-dessous), et si possible un deuxième produit en mode **acheté**.
Gardez 3 pages ouvertes en parallèle : la fiche produit/matière (page Stock), la liste de
production, la liste d'achat.

Réglages suggérés pour retomber sur les chiffres de référence ci-dessous :
matière `stockMax=2000, purchaseThreshold=500` ; produit fabriqué `stockMax=100,
purchaseThreshold=50, productionThreshold=50` ; recette ratio `1`.

## Préparation
Notez au départ : disponible/réservé du produit et de la matière, seuils, stock max, contenu
des listes (doivent être vides ou stables sur ce produit/matière).

## 1. Confirmation → création des lignes
Produit dispo=3, matière dispo=5, commande de 20.
- [ ] Après confirmation : produit `available=0 reserved=3` ; ligne production `needed=17
  buffer=100 status=BLOQUE` (5 pris sur la matière, 12 manquants) ; ligne achat matière
  `needed=112 buffer=2000 status=A_COMMANDER`.
- [ ] "Commandes concernées" sur les deux lignes affiche bien cette commande.

## 2. Modification de quantité (matière abondante, dispo produit=0)
Commande de 20 confirmée → matière `available=880 reserved=120`, ligne production
`needed=20 buffer=100 status=A_PRODUIRE`.
- [ ] Augmentez 20 → 35 : matière `available=865 reserved=135`, ligne `needed=35` (grossit du
  delta, pas de 2ᵉ ligne).
- [ ] Réduisez 35 → 10 : matière `available=890 reserved=110` (relâche exactement 25, le
  delta), ligne `needed=10`.
- [ ] Cas particulier : si la ligne liée n'est plus modifiable (achat déjà "Commandé") : la
  nouvelle quantité doit quand même s'enregistrer sur la commande ET le stock/la liste doit
  suivre après coup (pas resté bloqué sur l'ancienne quantité).

## 3. "Marquer fabriquée"
Le buffer ne réserve JAMAIS de matière (c'est un simple chiffre indicatif de rattrapage
préventif, pas un engagement physique) — seul le besoin réel en réserve. La consommation à la
production suit un ordre précis, matière par matière :
1. Vérification globale D'ABORD sur toute la recette : si `disponible + réservé` (tous produits
   confondus) ne suffit pas pour la quantité demandée, **rien n'est modifié**, erreur renvoyée.
2. La part qui correspond au besoin déjà reconnu de CETTE ligne (dans la limite de ce qui est
   produit) vient de son propre `reserved` — déjà mis de côté pour elle, on le libère
   normalement (jamais pris sur le disponible général, sinon cette réservation resterait
   bloquée pour toujours, jamais consommée).
3. Le surplus éventuel (production au-delà du besoin déjà reconnu — buffer produit, ou
   quantité forcée plus grande que prévu) prend d'abord sur le **disponible** (matière fraîche).
4. S'il en manque encore, on pioche dans le `reserved` du pot commun — donc potentiellement
   dans ce qui était compté pour D'AUTRES lignes "À produire". Ces lignes sont réévaluées
   aussitôt après (FIFO par ancienneté) : **les plus RÉCENTES basculent "Bloquée" en priorité**,
   les plus anciennes gardent leur matière intacte. Le manquant qui en résulte remonte
   normalement en liste d'achat matière.

### 3a. Cas normal (matière abondante)
Départ (commande de 10 confirmée) : matière `available=890 reserved=110` (110 = besoin réel 10,
le reste vient d'un ancien réglage — seul le besoin réel se réserve désormais), ligne
`needed=10 buffer=100`.
- [ ] Produisez 6 (partiel) : matière `available=890 reserved=104` — **`available` ne bouge
  PAS** quand le réservé de la ligne suffit à couvrir ce qui est produit, `reserved` baisse
  d'exactement 6 (jamais plus). Ligne : `needed=4 produced=6`, reste ouverte. La commande liée
  reçoit sa part (`resolvedQuantity=6`).
- [ ] Produisez les 4 restants : matière `reserved=100` (−4 de plus, jamais −8). Ligne :
  `needed=0 produced=10` — reste "À produire" tant que le buffer (100, jamais réservé) est
  actif, passe "Produit" seulement si le buffer retombe aussi à 0.

### 3b. Vol sur le réservé d'une commande plus récente (matière insuffisante)
Deux produits différents, même matière : ANCIEN (commande créée en premier, besoin=10) et
RÉCENT (créée ensuite, besoin=10). Matière dispo=0, reserved=20 (10+10, tout juste assez pour
les deux besoins réels, rien de plus).
- [ ] Marquez fabriquée ANCIEN pour 15 (plus que son besoin de 10) : matière `reserved=20→5`
  (10 pour son propre besoin + 5 volés au pot commun, faute de disponible). Ligne ANCIEN :
  `needed=0 buffer=95 produced=15 status=A_PRODUIRE`. Ligne RÉCENT : **repasse `BLOQUE`**
  (plus assez de matière réservée pour couvrir son besoin de 10 — il ne reste que 5). Le
  manquant remonte automatiquement en liste d'achat matière (`needed=200` dans cet exemple).

### 3c. Refus net si vraiment pas assez de matière du tout
Matière `available=0 reserved=5`, tentative de produire 20 (recette ratio 1, besoin=20).
- [ ] Rien ne se passe : erreur "Stock matière insuffisant" renvoyée, `producedQuantity` et le
  stock matière restent parfaitement inchangés (aucune modification partielle).

### 3d. Surplus produit au-delà du besoin réel, pris sur un disponible qui en a
Une seule ligne, aucune autre commande concurrente sur cette matière. Besoin réel=10 (déjà
réservé), matière `available=200` en plus (ex: du réassort), `reserved=10`.
- [ ] Marquez fabriquée pour 25 (10 = besoin réel + 15 de surplus) : matière `available=185
  reserved=0` — les 10 du besoin réel viennent du `reserved` (consommé, pas laissé orphelin),
  les 15 de surplus viennent du `available` (200→185), puisque personne d'autre n'attend cette
  matière ici. Ligne : `needed=0 buffer=85 produced=25 status=A_PRODUIRE`.

## 4. Liste d'achat matière — "Commander" puis annuler la commande d'origine
Départ (commande de 20, matière indisponible) : ligne achat matière `needed=120 buffer=2000
status=A_COMMANDER`.
- [ ] "Commander" tout (2120) : `needed=0 buffer=0 status=COMMANDE ordered=2120`.
- [ ] Annulez la commande client d'origine : **la carte reste à `needed=0 buffer=0`** (pas de
  remontée trompeuse) — parce que ce qui est déjà commandé au fournisseur (2120) couvre déjà
  largement ce qu'il faudrait maintenant (100 réel + 2000 buffer). Le statut reste "Commandé"
  jusqu'à réception, jamais supprimé automatiquement une fois commandé.
- [ ] Réceptionnez le tout → statut "Reçu", disparaît de la liste. Le buffer (100) n'a jamais
  été réservé, mais `available` (qui contient maintenant tout ce qui a été reçu) compte comme
  "couvert" pour le besoin — la carte se ferme donc naturellement (`needed=0 buffer=0`), sans
  faux manquant qui traîne.

## 5. Produit ACHETÉ — cycle complet
Départ (dispo 5, commande de 20) : produit `reserved=5`, ligne achat `needed=15 buffer=100`.
- [ ] "Commander" (115) puis réception partielle (ex: 38) : distribution FIFO — la commande en
  attente est comblée en priorité (`resolvedQuantity` monte jusqu'à `quantity`), le reliquat
  part en `available` du produit.
- [ ] Réception du reste → commande totalement résolue, ligne "Reçue" une fois tout arrivé.

## 6. Annulation + réaffectation FIFO (deux commandes)
X(20, prend son stock directement — FROM_STOCK) puis Y(15, tout en production, rien de dispo).
- [ ] Annulez X : matière relâchée **une seule fois** pour la part de Y qui vient d'être
  comblée directement par le disponible libéré (pas de double relâchement — vérifiez que
  `reserved` matière ne baisse pas de plus que ce qui est réellement repris).
- [ ] Item Y : `resolvedQuantity` passe à `quantity` (comblé automatiquement, FIFO).

## 7. "Marquer Produit" (bouton manuel, avant Livré)
Matière dispo=3 pour un besoin de 10.
- [ ] Preview détecte un manquant de 7.
- [ ] Après "Marquer Produit" : matière `reserved` retombe à 0 (consommait tout ce qui était
  réservable), produit `reserved` augmente exactement de la part manquante (jamais plus),
  commande entièrement résolue.

## 8. Stock direct (hors commande)
- [ ] Correction manuelle du disponible produit **à la baisse** → seul le buffer bouge (le
  besoin réel, lié aux commandes déjà réglées à leur confirmation, ne bouge jamais).
- [ ] Correction **à la hausse** avec une commande déjà en attente sur ce produit → elle est
  comblée en priorité (FIFO) avant que le reliquat compte comme buffer ; la matière relâchée
  pour la part reprise ne l'est **qu'une fois** (pas de double comptage).
- [ ] Correction du disponible d'une matière **à la hausse** avec une ligne "Bloquée" en
  attente → elle se débloque (ou avance partiellement, cf. section 11).
- [ ] Correction de `reserved` sur une matière → recalcule le besoin réel immédiatement. **À la
  baisse** : revérifie aussi si les lignes de production "À produire" qui comptaient sur ce pot
  commun sont toujours couvertes — **les plus RÉCENTES rebasculent "Bloquée" en premier**
  (FIFO), le manquant qui en résulte remonte dans la liste d'achat matière. Exemple : matière
  `reserved=20` (10 pour une ligne ancienne, 10 pour une plus récente, toutes deux `A_PRODUIRE`)
  → correction à 12 : l'ancienne reste `A_PRODUIRE` (10 ≤ 12), la récente repasse `BLOQUE`
  (plus assez pour ses 10), la liste d'achat matière reflète le manquant.
- [ ] Correction de `reserved` sur un **produit**, **à la baisse** : reprend la couverture aux
  commandes/devis actifs concernés (VALIDE/PRODUITE), **les plus RÉCENTES perdent en premier**
  (FIFO, les plus anciennes gardent la priorité). Exemple : produit `reserved=30` (10 pour une
  ancienne commande, 20 pour une plus récente, toutes deux entièrement résolues) → correction à
  15 : l'ancienne garde ses 10 intacts, la récente perd 15 de couverture
  (`resolvedQuantity` 20→5, repasse `IN_PRODUCTION`/`PURCHASE_PENDING`), et une ligne de
  production/achat apparaît avec le manquant (`needed=15`). **À la hausse** : aucun effet
  (une hausse manuelle n'invente pas de commande à mieux couvrir).
- [ ] Témoin (autre produit/matière non touché) : ne bouge jamais pendant ces actions.

## 9. FIFO multi-commandes
Deux commandes de 10 sur le même produit, la 1ʳᵉ créée avant la 2ᵉ.
- [ ] Produisez 10 (ne couvre qu'une commande) → la plus ancienne reçoit tout
  (`resolvedQuantity=10`), la plus récente rien (`resolvedQuantity=0`).

## 10. Réception qui ne passe "Reçu" que si besoin ET buffer sont à 0, ET tout est reçu
- [ ] Forcez une ligne avec besoin réel ET buffer > 0, "Commandez" tout, réceptionnez
  EXACTEMENT le besoin réel (pas le buffer) → reste "Commandé".
- [ ] Réceptionnez le reste (buffer) → passe enfin "Reçu".
- [ ] **Piège à vérifier** : commande de 2120 chez le fournisseur → réceptionnez SEULEMENT 1
  unité → reste "Commandé" (ne doit JAMAIS passer "Reçu" juste parce que `needed`/`buffer`
  retombent à 0 grâce à l'en-transit qui compte comme "couvert" — il faut EN PLUS que
  `receivedQuantity >= orderedQuantity`, sinon une réception minime fermerait la carte à tort).
  Réceptionnez ensuite le reste → passe "Reçu" seulement à ce moment-là.
- [ ] Badge "Urgent" : affiché seulement si `needed+buffer > 0` ET stock physique à 0 — jamais
  sur une ligne "Commandé" qui n'attend plus que sa réception (sous-titre "En attente de
  réception" à la place).

## 11. Déblocage matière progressif (FIFO), pas tout-ou-rien
Deux produits différents partageant la même matière, tous deux bloqués (A créé avant B).
- [ ] Réceptionnez juste assez pour couvrir ENTIÈREMENT A → seule sa ligne se débloque
  ("À produire"), B reste "Bloquée", inchangée.
- [ ] Complétez pour B → elle se débloque à son tour.

## 12. "Commandes concernées" — précision (lien réel + besoin restant réel)
- [ ] Une commande "En attente" (jamais confirmée) n'apparaît PAS dans "Commandes concernées".
- [ ] Deux commandes sur le même produit (matière insuffisante pour les deux, la 1ʳᵉ créée
  avant la 2ᵉ) : dans "Commandes concernées" (production ET achat matière), la plus ancienne
  n'a PAS le badge "Bloqué", la plus récente l'a.
- [ ] Le statut "Bloqué" n'apparaît plus jamais au niveau de la carte elle-même (ni badge, ni
  sous-titre, ni ligne de statut) — uniquement par commande.

## 13. Ce qui a été déjà commandé au fournisseur compte comme "sécurisé"
- [ ] Commandez une quantité au fournisseur (matière ou produit acheté) qui dépasse largement
  le besoin réel + le buffer actuels → la carte doit afficher `needed=0 buffer=0` tant que ce
  qui reste "en transit" (`ordered − received`) couvre toujours le total requis, même si le
  besoin/buffer sont recalculés entre-temps (annulation, nouvelle commande...).

## 14. Réapprovisionnement manuel (restock) et correction de stock

### Restock d'un produit fabriqué (mode "produire" — consomme la recette)
Recette ratio 2, matière dispo=1000, produit dispo=0.
- [ ] Réapprovisionnez le produit de 30 → produit `available=30` ; matière `available=940`
  (1000 − 2×30, consommée directement, jamais mise en `reserved`) — c'est une vraie
  fabrication immédiate, pas une réservation.
- [ ] Avec une commande de 15 déjà en attente (ratio 1, matière abondante) : réapprovisionnez
  le produit de 10 → la commande est comblée en priorité (`resolvedQuantity` monte de 10),
  produit `reserved=10`, ligne production `needed` baisse de 10 (15→5) ; la matière qui était
  réservée pour cette part de production n'est plus nécessaire (elle vient d'être fabriquée
  directement) → relâchée d'autant, un SEUL coup (pas de double comptage : vérifiez que
  `reserved` matière baisse d'exactement la quantité correspondant à ce qui vient d'être
  réaffecté, ni plus ni moins).

### Restock d'une matière première (débloque une ligne "Bloquée")
Matière dispo=2 pour un besoin de 10 (ratio 1) → ligne "Bloquée".
- [ ] Réapprovisionnez la matière de 500 → la ligne de production se débloque ("À produire"),
  la matière réservée monte exactement du nécessaire (jamais plus que le total de la ligne :
  besoin + buffer), le reste part en disponible et alimente le nouveau buffer de la ligne
  d'achat matière (recalculé immédiatement, jamais un ancien chiffre qui traîne).

### Correction manuelle de stock (renvoi à la section 8)
- [ ] Rejouez les points de la section 8 (baisse = buffer seul ; hausse = réaffectation en
  priorité ; correction de `reserved` matière = recalcul du besoin réel, sur produit = aucun
  effet) — le réapprovisionnement suit exactement les mêmes règles qu'une correction à la
  hausse, seule la source de l'augmentation change (bouton dédié vs champ libre).

## 15. Commandes/devis prioritaires
Une commande/devis marqué "prioritaire" passe TOUJOURS devant les autres dans les simulations
FIFO du stock (distribution, réaffectation, reprise de couverture, badge "Bloqué"), comme si
elle avait été créée en premier — ne déclenche rien tout de suite, compte juste comme "la plus
ancienne" au prochain évènement. Togglable uniquement tant que la commande est "Confirmée"
(VALIDE) et pas encore "Produite" — ne change RIEN au reste de la ligne de production/achat
normale (son `needed` continue d'inclure toutes les commandes, prioritaires ou pas).

- [ ] Deux commandes sur le même produit (matière abondante) : ANCIENNE créée en premier (10),
  RÉCENTE créée ensuite (10), RÉCENTE marquée prioritaire. Produisez seulement 10 (pas assez
  pour les deux) → **RÉCENTE reçoit tout** (`resolvedQuantity=10`), ANCIENNE rien
  (`resolvedQuantity=0`) — inversé par rapport au FIFO normal.
- [ ] Carte "Production urgente" (en bas de la liste de production) : affiche le produit avec
  quantité=10 tant que RÉCENTE n'est pas produite ; **disparaît d'elle-même** une fois
  RÉCENTE entièrement produite (elle repasse "Produite" automatiquement, plus de manquant à
  sommer).
- [ ] Retirer la priorité sur une commande déjà "Produite" → refusé (rien à prioriser dessus).
- [ ] Marquer prioritaire une commande "Annulée" (ou tout statut ≠ Confirmé) → refusé,
  message clair.

## Notes
Pour chaque étape qui échoue, notez les valeurs exactes observées (disponible/réservé produit
et matière, needed/buffer/status des lignes concernées) — ça permet de retrouver directement
la fonction en cause dans le code.
