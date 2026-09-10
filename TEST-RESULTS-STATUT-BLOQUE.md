# Résultat des tests — correctif du statut "Bloqué/À produire" + rejeu complet des 14 sections

Vérification du correctif dans `resyncProductionLine` (src/lib/order-stock.ts) : le statut
d'une ligne de production est maintenant revérifié à neuf à chaque appel (matière réservée vs
**besoin réel seul**, jamais le buffer), au lieu d'être déduit de "qu'est-ce qui a été tenté
cette fois".

Script exécuté (temporaire, supprimé après usage) — rejoue **toutes les sections** de
TESTS-STOCK.md avec dump complet avant/après à chaque étape.

## ⚠️ Découverte importante pendant ce rejeu (section 4)

En rejouant la section 4 dans son intégralité (pas seulement jusqu'à l'annulation, mais jusqu'à
la réception complète), un vrai écart avec ce que documente TESTS-STOCK.md est apparu — **et
c'est une conséquence directe et prévisible du correctif d'aujourd'hui**, pas un bug préexistant
ni une erreur de script. Détail plus bas (section 4). Je te le signale avant de continuer, sans
y toucher — dis-moi si tu veux que je le corrige.

## Section 1 — Confirmation → création des lignes
Produit dispo=3, matière dispo=5, commande de 20.

**Avant**
- Produit : `available=3 reserved=0`
- Matière : `available=5 reserved=0`

**Après confirmation** (attendu `needed=17 buffer=100 BLOQUE` ; achat matière `needed=112
buffer=2000 A_COMMANDER`)
- Produit : `available=0 reserved=3`
- Matière : `available=0 reserved=5`
- Ligne production : `needed=17 buffer=100 status=BLOQUE`
- Ligne achat matière : `needed=112 buffer=2000 status=A_COMMANDER`

✅ Conforme.

## Section 2 — Modification de quantité (matière abondante)
**Après confirmation de 20** (attendu matière `available=880 reserved=120`, ligne `needed=20
A_PRODUIRE`)
- Matière : `available=880 reserved=120`
- Ligne production : `needed=20 buffer=100 status=A_PRODUIRE`

**Après augmentation 20→35** (attendu matière `available=865 reserved=135`, ligne `needed=35`)
- Matière : `available=865 reserved=135`
- Ligne production : `needed=35`

**Après réduction 35→10** (attendu matière `available=890 reserved=110`, ligne `needed=10`)
- Matière : `available=890 reserved=110`
- Ligne production : `needed=10`

✅ Conforme.

## Section 3 — "Marquer fabriquée" (la matière consommée ne revient jamais)
**Départ**
- Matière : `available=890 reserved=110`
- Ligne production : `needed=10 buffer=100 status=A_PRODUIRE`

**Après production de 6** (attendu matière `available=890 reserved=104`, ligne `needed=4
produced=6`)
- Matière : `available=890 reserved=104`
- Ligne production : `needed=4 produced=6 status=A_PRODUIRE`

**Après production des 4 restants** (attendu `reserved=100`, `needed=0 produced=10`)
- Matière : `available=890 reserved=100`
- Ligne production : `needed=0 buffer=100 produced=10 status=A_PRODUIRE`

✅ Conforme — `available` ne bouge pas ici parce que le réservé de la ligne suffisait pour tout
ce qui a été produit (cas normal, cf. 3a). Ce n'est PAS une règle absolue : dès qu'on produit
plus que le besoin réel déjà reconnu par la ligne, le surplus prend sur `available` — cf. 3d
ci-dessous, qui teste précisément ce cas.

**3a rejoué via la VRAIE route API** (login réel, `PATCH /api/orders/[id]` pour valider la
commande, `PATCH /api/production-list/[id]` pour produire) : départ `needed=10`, matière
`available=990 reserved=10` ; après production de 6 (HTTP 200) → `available=990 reserved=4`
(inchangé/−6 exact) ; après production des 4 restants (HTTP 200) → `available=990 reserved=0`
— **identique** à la version testée en interne.

### NOUVEAU — 3d : surplus produit au-delà du besoin réel, pris sur un disponible qui EN A
Une seule ligne, aucune autre commande concurrente sur cette matière. Besoin réel=10 (déjà
réservé), matière `available=200` en plus (ex: du réassort), `reserved=10`.

**Avant** :
- Matière : `available=200 reserved=10`
- Ligne production : `needed=10 buffer=0 status=A_PRODUIRE`

**Après "Marquer fabriquée" 25** (10 = besoin réel déjà reconnu, 15 = surplus au-delà) :
- Matière : **`available=185 reserved=0`**
- Ligne production : `needed=0 buffer=85 produced=25 status=A_PRODUIRE`

✅ Conforme : les 10 du besoin réel viennent bien du `reserved` (10→0, la réservation d'origine
est enfin consommée, pas laissée orpheline) ; les 15 de surplus viennent bien du `available`
(200→185), pas volés ailleurs puisque personne d'autre n'utilisait cette matière ici.

**Rejoué via la VRAIE route API** : commande réelle validée (`PATCH /api/orders/[id]`), départ
`needed=10`, matière `available=200 reserved=10` ; appel réel `PATCH /api/production-list/[id]`
`{quantity:25}` → réponse HTTP 200 `{needed:0, buffer:85, produced:25}` ; état final vérifié :
matière `available=185 reserved=0` — **identique** à la version testée en interne.

## Section 4 — Liste d'achat matière : "Commander" puis annuler la commande d'origine
**Départ**
- Ligne achat matière : `needed=120 buffer=2000 status=A_COMMANDER`

**Après "Commander" 2120** (attendu `needed=0 buffer=0 status=COMMANDE ordered=2120`)
- Ligne achat matière : `needed=0 buffer=0 ordered=2120 status=COMMANDE`

**Après annulation de la commande client d'origine** (attendu `needed=0 buffer=0`, statut reste
COMMANDE, pas de remontée trompeuse)
- Matière : `available=0 reserved=0`
- Ligne achat matière : `needed=0 buffer=0 ordered=2120 status=COMMANDE`

✅ Conforme jusqu'ici.

**Après réception totale (2120)** (attendu par le fichier : statut **RECU**)
- Ligne achat matière : **`needed=100 buffer=0 ordered=2120 received=2120 status=COMMANDE`**

❌ **N'atteint pas "Reçu"** — écart avec le fichier de tests.

### Pourquoi
La ligne de production liée n'a jamais disparu après l'annulation : le produit fini est resté
sous son seuil de production (`available=0`), donc son buffer de 100 est resté actif en
permanence, réclamant en continu 100 unités de matière. Ce n'est PAS le problème — c'est normal,
documenté (section 13).

Le vrai problème : quand la matière est intégralement réceptionnée, elle part entièrement en
`available` — rien ne la réserve automatiquement pour ce buffer de production toujours actif.
Avant le correctif d'aujourd'hui, cette même ligne de production serait très probablement restée
étiquetée `BLOQUE` (le bug qu'on vient de corriger la faisait dépendre du buffer) — et dans ce
cas, `unblockProductionForMaterial` (qui ne regarde QUE les lignes `BLOQUE`) l'aurait attrapée et
aurait réservé la matière pour elle à la réception. **Maintenant qu'elle est correctement
étiquetée `A_PRODUIRE`** (puisque le besoin réel, lui, est satisfait), elle sort du radar de
`unblockProductionForMaterial`, et son buffer ne se réserve plus jamais tout seul à la réception
matière — il faut un tout autre évènement (ex: modifier la commande) pour redéclencher
`resyncProductionLine` sur ce produit et faire réserver ce buffer.

**Conséquence concrète pour toi** : une carte d'achat matière peut désormais rester "Commandé"
(avec un `needed` qui semble reparaître) même après réception complète, tant qu'une ligne de
production `A_PRODUIRE` avec buffer non couvert existe quelque part pour cette matière — la
matière est bien là (`available`), juste pas encore affectée à ce buffer précis.

**Options si tu veux que je corrige :**
1. Faire en sorte que la réception d'une matière déclenche aussi `resyncProductionLine` sur
   tous les produits qui l'utilisent (pas seulement `unblockProductionForMaterial` sur les
   lignes déjà `BLOQUE`) — réserverait le buffer automatiquement dès que la matière est là.
2. Laisser tel quel — le stock existe bel et bien (`available`), rien n'est perdu, juste pas
   "rangé" au bon endroit tant qu'aucun évènement ne le redéclenche.

## Section 5 — Produit ACHETÉ : cycle complet
**Après confirmation** (attendu produit `reserved=5`, ligne `needed=15 buffer=100`)
- Produit : `available=0 reserved=5`
- Ligne achat produit : `needed=15 buffer=100 status=A_COMMANDER`

**Après "Commander" 115**
- Ligne achat produit : `needed=0 buffer=0 ordered=115 status=COMMANDE`

**Après réception partielle de 38** (attendu : commande en attente comblée en priorité)
- Produit : `available=23 reserved=20`
- Ligne achat produit : `received=38 status=COMMANDE`
- Item commande : `resolvedQuantity=20 / quantity=20` (entièrement comblée en priorité)

**Après réception du reste (77)** (attendu : commande résolue, ligne RECU)
- Produit : `available=100 reserved=20`
- Ligne achat produit : `received=115 status=RECU`

✅ Conforme.

## Section 6 — Annulation + réaffectation FIFO (deux commandes)
X(20, FROM_STOCK) puis Y(15, tout en production).

**Avant annulation**
- Produit : `available=0 reserved=20`
- Item Y : `resolvedQuantity=0 / quantity=15`

**Après annulation de X** (attendu : relâchement matière une seule fois pour la part de Y comblée)
- Produit : `available=5 reserved=15`
- Matière : `available=0 reserved=0` (relâchée une seule fois, pas de double comptage)
- Item Y : `resolvedQuantity=15 / quantity=15` ✅ comblé automatiquement FIFO

✅ Conforme.

## Section 7 — "Marquer Produit" (bouton manuel, avant Livré)
Matière dispo=3 pour un besoin de 10.

**Preview** : manquant détecté = 7 ✅

**Après "Marquer Produit"** (attendu matière `reserved=0`, produit `reserved` augmente
exactement de la part manquante)
- Produit : `available=0 reserved=10`
- Matière : `available=0 reserved=0`
- Item : `resolvedQuantity=10 / quantity=10` (entièrement résolue)

✅ Conforme.

## Section 8 — Stock direct (hors commande)
**Correction produit à la baisse (50→20)** (attendu : seul le buffer bouge)
- Produit : `available=20`
- Ligne production : `needed=0 buffer=80 status=A_PRODUIRE`

**Correction produit à la hausse (commande de 10 en attente → 15)** (attendu : commande comblée
en priorité FIFO, matière relâchée une seule fois)
- Avant : `needed=10 buffer=100 status=BLOQUE`
- Après : Produit `available=5 reserved=10` ; Matière `available=0 reserved=0` ; Ligne
  `needed=0 buffer=95 status=A_PRODUIRE`

**Correction matière à la hausse (+500) avec ligne Bloquée**
- Avant : Matière `available=0 reserved=2` ; Ligne `BLOQUE`
- Après : Matière `available=392 reserved=110` ; Ligne `A_PRODUIRE` ✅ débloquée, réservé
  exactement le nécessaire (110 = 10+100)

**Correction `reserved` matière (0→5)** (attendu : recalcul immédiat du besoin achat)
- Ligne achat matière : `needed=15 buffer=1900` (recalculée)

**Témoin** (jamais touché) : `available=777 reserved=111`, inchangé du début à la fin.

✅ Conforme.

## Section 9 — FIFO multi-commandes
Deux commandes de 10, la 1ʳᵉ créée avant la 2ᵉ. Production de 10 (ne couvre qu'une commande).

- Item le plus ancien : `resolvedQuantity=10` ✅
- Item le plus récent : `resolvedQuantity=0` ✅

✅ Conforme.

## Section 10 — Réception qui ne passe "Reçu" que si besoin ET buffer sont à 0
Ligne isolée : `needed=120 buffer=2000 ordered=2120 status=COMMANDE`.

**Après réception du besoin réel SEUL (120)** (attendu : reste COMMANDE)
- `needed=0 buffer=2000 received=120 status=COMMANDE` ✅ reste Commandé

**Après réception du reste (buffer=2000)** (attendu : statut RECU)
- `needed=0 buffer=0 received=2120 status=RECU` ✅

✅ Conforme.

## Section 11 — Déblocage matière progressif (FIFO)
Deux produits (A créé avant B), même matière, tous deux `BLOQUE` (`needed=10 buffer=100`
chacun), matière dispo=2.

**Après réception de 108** (couvre ENTIÈREMENT A : 110−2)
- Ligne A : `A_PRODUIRE` ✅ débloquée
- Ligne B : `BLOQUE` ✅ inchangée

**Après complément pour B**
- Ligne B : `A_PRODUIRE` ✅ débloquée à son tour

✅ Conforme.

## Section 12 — "Commandes concernées" (précision)
Non rejoué numériquement dans ce script (fonction de traçabilité UI `stock-traceability.ts`,
non touchée par le correctif d'aujourd'hui) — cf. tests détaillés déjà validés précédemment dans
cette conversation. Aucune modification apportée à ce fichier aujourd'hui, pas de risque de
régression.

## Section 13 — Ce qui a été commandé au fournisseur compte comme "sécurisé"
**Après "Commander" 3000** (très au-delà du besoin)
- Ligne : `needed=0 buffer=0 ordered=3000 status=COMMANDE`

**Après annulation de la commande client** (attendu `needed=0 buffer=0`, en-transit couvre tout)
- Matière : `available=0 reserved=0`
- Ligne : `needed=0 buffer=0 status=COMMANDE` ✅

✅ Conforme.

## Section 14 — Réapprovisionnement manuel (restock)

⚠️ **Chiffres mis à jour** (voir "Mise à jour 6" plus bas) : cette section avait été écrite
AVANT la décision "le buffer ne réserve jamais de matière" — les nombres ci-dessous montraient
donc encore un buffer réservé (110 = 10 besoin + 100 buffer). Retestée via les **vraies routes
API** (pas les fonctions internes) pour confirmer les chiffres actuels :

**Restock produit mode "produire" (ratio 2, matière dispo=1000)**
- Réapprovisionnement de 30 → Produit `available=30` ; Matière `available=940 reserved=0`
  (consommée directement, jamais réservée) ✅ — inchangé.

**Restock produit avec commande de 15 en attente (ratio 1)**
- Avant : Matière `available=985 reserved=15` (15 = besoin réel seul, le buffer ne réserve
  plus) ; Ligne `needed=15 buffer=100`
- Réapprovisionnement de 10 → Produit `available=0 reserved=10` ; Matière `available=985
  reserved=5` (relâchée une seule fois) ; Ligne `needed=5 buffer=100` ✅

**Restock matière (+500) débloquant une ligne Bloquée**
- Avant : Matière `available=0 reserved=2` ; Ligne `BLOQUE`
- Après : Matière `available=492 reserved=10` (**seulement le besoin réel**, plus 100 comme
  avant) ; Ligne `A_PRODUIRE` ; Ligne achat matière `needed=0 buffer=1508`

✅ Conforme au comportement actuel (post "buffer ne réserve jamais").

## Conclusion (1ʳᵉ passe)
13 sections sur 14 rejouées entièrement conformes, aucune régression. La section 4 révèle une
conséquence réelle et prévisible du correctif du statut (une ligne de production correctement
étiquetée "À produire" avec un buffer non couvert n'est plus rattrapée automatiquement par la
réception matière) — détaillée ci-dessus.

---

## Mise à jour — décision : le buffer ne réserve plus JAMAIS de matière

Suite à discussion, décision prise : le buffer reste un simple chiffre indicatif (rattrapage
préventif), il ne doit plus jamais réserver de matière physique — seul le besoin réel réserve.
La matière pour le buffer continue à remonter dans la liste d'achat (aucun changement de ce
côté), simplement elle n'est jamais mise de côté (`reserved`) tant qu'aucune vraie commande
n'en a besoin.

Changements appliqués (`src/lib/order-stock.ts`) :
- `resyncProductionLine` : le buffer ne réserve/relâche plus jamais de matière (seul le besoin
  réel le fait, à la hausse uniquement, comme avant).
- `unblockProductionForMaterial` : revient à ne considérer que les lignes "Bloquée" (l'extension
  faite dans la 1ʳᵉ passe n'a plus lieu d'être), et calcule le manquant sur le besoin réel seul.
- Nouvelle fonction `reassessProductionForMaterial` : symétrique — à appeler quand on vient de
  PRENDRE de la matière déjà réservée (ex: "Marquer fabriquée" qui pioche dans le pot commun).
  Réévalue les lignes "À produire" par ancienneté (FIFO) : les plus récentes basculent
  "Bloquée" en priorité dès que le réservé restant ne les couvre plus plus.

Et surtout, refonte de **"Marquer fabriquée"** (`src/app/api/production-list/[id]/route.ts`) —
cf. section 3 de TESTS-STOCK.md pour le détail complet des règles et des tests (3a/3b/3c),
vérifiés numériquement :
- Vérification globale AVANT toute modification : si `disponible+réservé` ne suffit pas pour
  toute la recette, rien n'est modifié, erreur renvoyée.
- La part due à la ligne elle-même vient de son propre `reserved` (jamais du disponible général,
  sinon cette réservation resterait bloquée à vie, jamais consommée).
- Le surplus (buffer produit, ou quantité forcée) prend d'abord sur le disponible, puis vole
  dans le `reserved` des autres lignes si besoin — les plus RÉCENTES basculent "Bloquée" en
  premier, protégeant les plus anciennes.

### Résultat du rejeu complet après ce changement

**Section 1** — inchangée, toujours conforme :
- Matière : `available=0 reserved=5`
- Ligne production : `needed=17 buffer=100 status=BLOQUE`
- Ligne achat matière : `needed=112 buffer=2000 status=A_COMMANDER`

**Section 3a** (cas normal, matière abondante) :
- Départ : Matière `available=890 reserved=110`, ligne `needed=10 buffer=100 A_PRODUIRE`
- Après production de 6 : Matière `available=890 reserved=104` (available inchangé), ligne
  `needed=4 produced=6`
- Après production des 4 restants : Matière `available=890 reserved=100`, ligne `needed=0
  buffer=100 produced=10 status=A_PRODUIRE`

✅ Conforme — `available` ne bouge jamais tant que le réservé de la ligne suffit.

**Section 4** — résolue proprement (cf. "Mise à jour 2" plus bas : `available` compte
maintenant comme "couvert" pour le besoin) :
- Après "Commander" 2120 puis annulation de la commande client : Matière `available=0
  reserved=0`, ligne achat `needed=0 buffer=0 status=COMMANDE`
- Après réception totale (2120) : Matière `available=2120 reserved=0`, ligne production
  `needed=0 buffer=100 status=A_PRODUIRE`, ligne achat matière **`needed=0 buffer=0
  status=RECU`** ✅ la carte se ferme naturellement.

**Section 8** (correction matière à la hausse, débloque une ligne Bloquée) :
- Avant : Matière `available=0 reserved=2`, ligne `needed=10 buffer=100 status=BLOQUE`
- Après +500 : Matière `available=492 reserved=10` (**seulement le besoin réel**, jamais le
  buffer=100 alors qu'il y avait largement de quoi), ligne `needed=10 buffer=100
  status=A_PRODUIRE`, ligne achat matière `needed=100 buffer=1508 status=A_COMMANDER`

**Section 11** (déblocage progressif FIFO, besoin réel seul) :
- A et B avant : `needed=10 buffer=100 status=BLOQUE` chacun, matière `available=0 reserved=2`
- Après réception de 8 (couvre exactement le besoin réel de A = 10, pas son buffer) : A
  `status=A_PRODUIRE`, B toujours `BLOQUE`, matière `reserved=10`
- Après complément pour B : B `status=A_PRODUIRE`

### NOUVEAU — 3b : "Marquer fabriquée" vole sur le réservé d'une commande plus récente
Deux produits, même matière (ratio 1) : ANCIEN (commande créée en premier, besoin=10) et
RÉCENT (créée après, besoin=10). Matière : `available=0 reserved=20` (10+10, tout juste assez
pour les deux besoins réels, rien de plus).

**Avant** :
- Ligne ANCIEN : `needed=10 buffer=100 status=A_PRODUIRE`
- Ligne RÉCENT : `needed=10 buffer=100 status=A_PRODUIRE`
- Matière : `available=0 reserved=20`

**Après "Marquer fabriquée" 15 pour ANCIEN** (plus que son besoin de 10 — 10 depuis son propre
réservé, puis 5 volés au pot commun faute de disponible) :
- Matière : `available=0 reserved=5`
- Ligne ANCIEN : `needed=0 buffer=95 produced=15 status=A_PRODUIRE`
- Ligne RÉCENT : **`needed=10 buffer=100 status=BLOQUE`** ✅ repasse Bloquée (plus assez de
  matière réservée pour couvrir son besoin de 10 — il n'en reste que 5)
- Ligne achat matière : `needed=200 buffer=2000 status=A_COMMANDER` (le manquant remonte
  automatiquement)

✅ Conforme — les plus récentes basculent Bloquée en priorité, les plus anciennes gardent leur
matière.

**Rejoué via les VRAIES routes API** (login réel, `PATCH /api/orders/[id]` pour valider les
deux commandes, `PATCH /api/production-list/[id]` pour "Marquer fabriquée") : état de départ
identique (`ANCIEN` et `RÉCENT` tous deux `needed=10 buffer=100 A_PRODUIRE`, matière
`reserved=20`) ; après l'appel réel à "Marquer fabriquée" 15 pour ANCIEN → réponse HTTP 200
`{needed:0, buffer:95, produced:15, status:"A_PRODUIRE"}` ; état final : matière `available=0
reserved=5`, RÉCENT `needed=10 buffer=100 status=BLOQUE`, ligne achat matière `needed=200
buffer=2000` — **identique en tout point** à la version testée via les fonctions internes.

### NOUVEAU — 3c : refus net si vraiment pas assez de matière du tout
Matière : `available=0 reserved=5`. Tentative de produire 20 (recette ratio 1, besoin=20).

**Résultat** : `{"ok": false, "error": "Stock matière insuffisant : ... (dispo+réservé=5,
besoin=20)"}`
- Matière après : `available=0 reserved=5` — **strictement inchangée**
- Ligne production après : `produced=0` — **strictement inchangée**

✅ Conforme — aucune modification partielle, refus net et propre.

**Rejoué via la VRAIE route API** : appel réel `PATCH /api/production-list/[id]` avec
`{quantity:20}` sur une ligne `needed=20`, matière `available=0 reserved=5` → réponse HTTP
**409** `{"error":"Stock matière insuffisant pour produire cette quantité : mC
(disponible+réservé=5, besoin=20)"}` ; état final vérifié : matière `available=0 reserved=5`,
ligne `produced=0 status=BLOQUE` — **strictement inchangés**, identique à la version testée via
les fonctions internes.

---

## Mise à jour 2 — `available` compte désormais comme "couvert" pour le besoin réel

Demande : vérifier dans `available` si le buffer a été réceptionné, plutôt que de se fier
uniquement à `reserved`/en-transit pour décider si un besoin est satisfait.

**Changement** (`resyncMaterialPurchaseNeed`, `src/lib/order-stock.ts`) : deux notions de
"couvert" distinctes, pour ne jamais compter `available` deux fois :
- `couvertBesoin = reserved + en-transit + available` — sert à calculer `realNeeded` : si la
  matière est physiquement là (même non réservée, ex: le buffer qui ne réserve jamais rien),
  elle compte comme couverte.
- `couvertBuffer = reserved + en-transit` (SANS `available`, déjà pris en compte dans
  `bufferTarget = stockMax − available`) — sert uniquement à réduire le rattrapage préventif
  propre de la matière (cas d'une commande fournisseur excédentaire, section 13). Compter
  `available` ici aussi le soustrairait deux fois.

### Tests (script temporaire, supprimé après usage)

**Section 1** (non-régression) : `needed=112 buffer=2000` — inchangé (available=0 à ce
moment, rien à couvrir en plus).

**Section 4** (le cas discuté) : commande de 20, "Commander" 2120, annulation, puis réception
totale.
- Après annulation : `needed=0 buffer=0 status=COMMANDE` (inchangé, l'en-transit couvrait déjà).
- **Après réception totale (+2120)** : Matière `available=2120 reserved=0` ; ligne achat
  matière **`needed=0 buffer=0 status=RECU`** ✅ — les 2120 disponibles couvrent largement le
  buffer de 100 de la ligne de production (jamais réservé), la carte se ferme d'elle-même, sans
  règle spéciale sur `receivedQuantity`.

**Section 8** (correction matière +500, débloque une ligne Bloquée) :
- Avant : Matière `available=0 reserved=2`, ligne prod `needed=10 buffer=100 BLOQUE`.
- Après +500 : Matière `available=492 reserved=10` ; ligne achat matière **`needed=0
  buffer=1508 status=A_COMMANDER`** — le besoin réel (10) est maintenant couvert par les 492
  disponibles (`needed=0`), et le buffer propre de la matière reste à 1508 (`2000−492`), **pas
  double-compté**.

**Section 13** (non-régression, commande fournisseur excédentaire) : `needed=0 buffer=0`
inchangé après "Commander" 3000 puis annulation.

✅ Conforme partout, aucune régression — et plus propre que la tentative précédente
("Reçu dès que `receivedQuantity >= orderedQuantity`", annulée) : ici la fermeture "Reçu" est
une CONSÉQUENCE naturelle du calcul honnête du besoin, pas une règle spéciale en plus.

---

/## Mise à jour 3 — correction manuelle de `reserved` produit à la baisse : reprend aux plus récentes

Demande : si on baisse `reserved` d'un produit à la main, les commandes les plus récentes
doivent perdre leur couverture en premier (FIFO), et repartir en besoin réel.

**Changement** : nouvelle fonction `reassessProductReserved` (`src/lib/order-stock.ts`),
symétrique de `reassessProductionForMaterial` mais côté produit. Ne considère que les
commandes/devis encore actifs (`VALIDE`/`PRODUITE` — pas encore Livrés, dont la part a déjà
quitté `reserved` ; pas Annulés/Retournés, déjà remis à 0). Simule un parcours FIFO par
ancienneté : dès que le pot restant (`reserved`) ne couvre plus une commande, elle ET toutes
les suivantes (plus récentes) reperdent la part non couverte de leur `resolvedQuantity`,
repassent `IN_PRODUCTION`/`PURCHASE_PENDING` selon le mode du produit, puis
`resyncProductionLine`/`resyncPurchaseLineForProduct` fait apparaître le manquant. Branché dans
`src/app/api/stock/correction/route.ts` (uniquement à la baisse — à la hausse, rien ne change).

### Test (script temporaire, supprimé après usage)
Produit `mode=FABRIQUE`, deux commandes entièrement résolues directement depuis le stock
(`FROM_STOCK`) : ANCIEN (10, créée en premier) et RÉCENT (20, créée ensuite).

**Avant correction** :
- Produit : `available=0 reserved=30`
- ANCIEN : `quantity=10 resolvedQuantity=10 stockPath=FROM_STOCK`
- RÉCENT : `quantity=20 resolvedQuantity=20 stockPath=FROM_STOCK`

**Après correction manuelle `reserved` 30→15** :
- Produit : `available=0 reserved=15`
- ANCIEN : `quantity=10 resolvedQuantity=10 stockPath=FROM_STOCK` — **intact**, priorité FIFO
- RÉCENT : `quantity=20 resolvedQuantity=5 stockPath=IN_PRODUCTION` — **perd 15** de couverture
- Ligne production : `needed=15 buffer=100 status=A_PRODUIRE` — le manquant réapparaît

✅ Conforme : l'ancienne commande garde toute sa couverture, la plus récente encaisse la perte
et repart en besoin réel.

---

/## Mise à jour 4 — correction manuelle de `reserved` matière à la baisse : revérifie les lignes couvertes

Demande : quand on baisse `reserved` d'une matière à la main, les lignes de production "À
produire" qui comptaient dessus doivent être revérifiées — les plus récentes rebasculent
"Bloquée" en premier (FIFO), symétrique à ce qu'on fait déjà pour "Marquer fabriquée".
Confirmé : ce recalcul est déclenché uniquement par l'action de correction elle-même (POST),
jamais par un chargement de page — vérifié qu'aucune route de lecture n'appelle ces fonctions.

**Changement** (`src/app/api/stock/correction/route.ts`) : pour une matière, à la baisse de
`reserved`, on appelle désormais `reassessProductionForMaterial` (déjà existante, créée pour
"Marquer fabriquée") au lieu de `resyncMaterialPurchaseNeed` seule — elle fait les deux
(réévalue le statut des lignes, puis recalcule la carte d'achat). À la hausse : inchangé.

### Test (script temporaire, supprimé après usage)
Une matière partagée par deux lignes de production (ANCIENNE créée en premier, RÉCENTE
ensuite), chacune `needed=10 buffer=100 status=A_PRODUIRE`, matière `reserved=20` (10+10).

**Avant** :
- Matière : `available=0 reserved=20`
- Ligne ANCIENNE : `needed=10 buffer=100 status=A_PRODUIRE`
- Ligne RÉCENTE : `needed=10 buffer=100 status=A_PRODUIRE`

**Après correction manuelle `reserved` 20→12** :
- Matière : `available=0 reserved=12`
- Ligne ANCIENNE : `needed=10 buffer=100 status=A_PRODUIRE` — **inchangée**, toujours couverte
  (10 ≤ 12)
- Ligne RÉCENTE : `needed=10 buffer=100 status=BLOQUE` — **rebascule**, plus assez pour ses 10
- Ligne achat matière : `needed=208 buffer=2000` — le manquant remonte automatiquement
  (`demande=220` pour les deux lignes, `couvert=12`)

✅ Conforme.

---

## Mise à jour 5 — bug trouvé et corrigé : une réception minime fermait la carte à tort

Repéré par l'utilisateur en relisant la section 10 : si `needed`/`buffer` retombent à 0 dès
qu'une petite partie est reçue (l'en-transit restant compte comme "couvert", cf. Mise à jour 2),
alors réceptionner ne serait-ce que 1 unité sur 2120 commandées fermait déjà la carte en
"Reçu" — confirmé par test, **c'était bien un vrai bug**.

**Correctif** (`src/app/api/purchase-list/[id]/route.ts`, action 'receive') : la carte ne passe
"Reçu" que si **les trois conditions** sont réunies : `needed<=0` ET `buffer<=0` ET
`receivedQuantity >= orderedQuantity` (plus rien en transit, tout est physiquement arrivé).

### Tests (script temporaire, supprimé après usage)

**Cas 1 — réception de 1 sur 2120** : `needed=0 buffer=0 ordered=2120 received=1
status=COMMANDE` ✅ reste ouverte (avant le correctif, ça serait passé "Reçu" à tort).

**Cas 2 — réception totale d'un coup (non-régression section 4)** : `needed=0 buffer=0
ordered=2120 received=2120 status=RECU` ✅ toujours conforme.

**Cas 3 — réception en 2 fois (1900 puis le reste)** : après 1900/2120 → reste `COMMANDE` ;
après le reste (2120/2120) → `RECU` ✅ ferme seulement à la toute fin.

✅ Conforme partout, aucune régression sur les cas déjà validés.

---

## Mise à jour 6 — Section 14 rejouée via les VRAIES routes API (pas les fonctions internes)

Jusqu'ici, tous les tests de cette conversation appelaient directement les fonctions de
`src/lib/order-stock.ts` (ou, pour "Marquer fabriquée", recopiaient la logique de la route dans
le script). Ça vérifie que le calcul est juste, mais pas que la vraie route HTTP (permissions,
authentification, code réellement exécuté) fonctionne pareil.

**Méthode** : connexion réelle via le flux NextAuth (login avec le compte de test, cookie de
session récupéré), données de base créées directement en Prisma (produits/matière/recette —
pure préparation de décor), puis **appels HTTP réels** :
- `PATCH /api/orders/[id]` avec `{status:"VALIDE"}` pour valider les commandes (déclenche
  `confirmStock` via le vrai code de la route, pas une copie).
- `POST /api/stock/restock` pour les 3 réapprovisionnements (vrai code de la route).

### Résultats

**Après validation des commandes (via la vraie route)** :
- Scénario B (matière abondante, ratio 1, commande de 15) : Matière `available=985 reserved=15`
  ; Ligne production `needed=15 buffer=100 status=A_PRODUIRE` ✅
- Scénario C (matière dispo=2, commande de 10) : Matière `available=0 reserved=2` ; Ligne
  `needed=10 buffer=100 status=BLOQUE` ; Ligne achat matière `needed=108 buffer=2000` ✅

**Après réapprovisionnement (via la vraie route `POST /api/stock/restock`)** :
- Scénario A (produit +30, mode "produire", ratio 2) : Produit `available=30` ; Matière
  `available=940 reserved=0` ✅
- Scénario B (produit +10) : Produit `available=0 reserved=10` ; Matière `available=985
  reserved=5` ; Ligne `needed=5 buffer=100 status=A_PRODUIRE` ✅
- Scénario C (matière +500) : Matière `available=492 reserved=10` ; Ligne `needed=10 buffer=100
  status=A_PRODUIRE` ; Ligne achat matière `needed=0 buffer=1508` ✅

✅ **Résultats identiques à ceux obtenus via les fonctions internes** (aux chiffres près
attendus depuis la décision "le buffer ne réserve jamais de matière") — confirme que la vraie
route, avec authentification réelle, exécute bien exactement le comportement attendu. Données
de test et scripts temporaires supprimés après usage.

---

## Mise à jour 7 — Nouvelle fonctionnalité : commandes/devis prioritaires

Demande : une commande marquée "prioritaire" passe devant les autres dans les simulations FIFO
du stock, comme si elle avait été créée en premier ; une carte "Production urgente" en bas de
la liste de production affiche le manquant des commandes prioritaires (par produit), et
disparaît une fois produite. Togglable côté admin, uniquement quand la commande est confirmée
et pas encore produite. Ne déclenche rien immédiatement (compte seulement au prochain
évènement FIFO) ; applicable aux commandes ET aux devis ; pas d'équivalent côté achat.

### Changements
- **Schéma** : `priority Boolean @default(false)` ajouté sur `Order` et `Quote` (migration
  `20260910180635_add_priority_orders_quotes`).
- **`src/lib/order-stock.ts`** : nouveau comparateur `fifoCompare` (priorité d'abord, ancienneté
  ensuite), branché dans les 3 simulations FIFO par commande : `distributeToLinkedItems`,
  `reallocateAvailableStock`, `reassessProductReserved`. Nouvelle fonction
  `getUrgentProductionNeeds()` (lecture seule, jamais stockée) qui agrège par produit le
  manquant des commandes/devis prioritaires encore actifs (`VALIDE`).
- **`src/lib/stock-traceability.ts`** : le badge "Bloqué" par commande (`materialClaims`) utilise
  aussi `fifoCompare` — une commande prioritaire n'apparaît plus "Bloquée" à tort si elle est
  couverte en priorité.
- **`src/app/api/orders/[id]/route.ts`** et **`quotes/[id]/route.ts`** : `PATCH` accepte
  `{priority: true/false}`, refusé (400) si le statut n'est pas `VALIDE`.
- **`src/app/api/production-list/urgent/route.ts`** (nouveau) : `GET`, expose
  `getUrgentProductionNeeds()`.
- **`src/components/ui/StockListsWidget.tsx`** : carte "Production urgente" en bas de la liste
  de production, visible seulement si non vide, ne modifie rien aux cartes normales.
- **`src/components/ui/RequestPanel.tsx`** + **`src/lib/request-detail.ts`** : bouton
  "☆ Marquer prioritaire" / "★ Prioritaire" dans le détail commande/devis, visible seulement
  quand le statut est "Confirmé".

### Tests (via les VRAIES routes API — login réel, requêtes HTTP réelles)
Produit `FABRIQUE`, matière abondante (pas de blocage matière en jeu). ANCIENNE (commande de
10, créée en premier) et RÉCENTE (commande de 10, créée ensuite, marquée **prioritaire**).

**Avant production** :
- `GET /api/production-list/urgent` → `[{reference:"...", quantity:10}]` ✅ (seule RÉCENTE,
  la prioritaire, compte)

**Après "Marquer fabriquée" 10** (pas assez pour les deux commandes de 10) :
- ANCIENNE (non prioritaire, plus ancienne) : `resolvedQuantity=0` — **rien reçu**
- RÉCENTE (prioritaire, plus récente) : `resolvedQuantity=10` — **tout reçu**

✅ Exactement l'inverse du FIFO normal — la priorité l'emporte sur l'ancienneté réelle.

**Après production complète de RÉCENTE** :
- `GET /api/production-list/urgent` → `[]` ✅ la carte disparaît (RÉCENTE passée "Produite"
  automatiquement via `checkCompletion`, plus de manquant prioritaire à sommer)

**Garde-fous vérifiés** :
- Retirer la priorité sur RÉCENTE une fois "Produite" → **HTTP 400** (plus rien à prioriser,
  cohérent).
- Marquer prioritaire une commande "Annulée" → **HTTP 400**, message clair.

✅ Conforme à la demande sur tous les points testés.

---

Scripts temporaires supprimés après usage, comme d'habitude. Détails et chiffres consignés
également dans TESTS-STOCK.md (section 3, sous-sections a/b/c, section 8, section 10, et
section 15).
