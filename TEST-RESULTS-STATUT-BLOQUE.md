# Résultats des tests — moteur de stock (liste d'achat / liste de production)

Restructuré par section (même numérotation que TESTS-STOCK.md), chiffres **finaux** (les
versions dépassées par des décisions ultérieures — ex: "le buffer ne réserve jamais de
matière" — ne sont pas gardées). Chaque section précise la **méthode** de vérification :

- **Script interne** : appelle directement les fonctions de `src/lib/order-stock.ts`, sans
  passer par une route HTTP ni une authentification réelle.
- **API réelle** : vraie connexion (NextAuth), vraies requêtes HTTP vers les routes de
  production (`/api/orders/[id]`, `/api/production-list/[id]`, `/api/stock/restock`...).

Scripts et données de test toujours temporaires, supprimés après chaque vérification.

---

## Section 1 — Confirmation → création des lignes
**Méthode : script interne.**

Produit dispo=3, matière dispo=5, commande de 20.

- Avant : Produit `available=3 reserved=0` ; Matière `available=5 reserved=0`
- Après confirmation : Produit `available=0 reserved=3` ; Matière `available=0 reserved=5` ;
  Ligne production `needed=17 buffer=100 status=BLOQUE` ; Ligne achat matière `needed=112
  buffer=2000 status=A_COMMANDER`

✅ Conforme.

## Section 2 — Modification de quantité (matière abondante)
**Méthode : script interne.**

- Après confirmation de 20 : Matière `available=880 reserved=120` ; Ligne `needed=20
  status=A_PRODUIRE`
- Après augmentation 20→35 : Matière `available=865 reserved=135` ; Ligne `needed=35`
- Après réduction 35→10 : Matière `available=890 reserved=110` ; Ligne `needed=10`

✅ Conforme.

### Trou trouvé et corrigé : réduction d'une commande résolue ne réaffectait pas aux autres
**Méthode : API réelle.**

Repéré en creusant une question posée sur un autre test : `adjustOrderItemQuantity` (déclenché
par une réduction de quantité) relâchait bien l'excédent en `available`, mais **n'appelait
jamais `reallocateAvailableStock`** ensuite — contrairement à `releaseOrderItemStock`, la
correction de stock, et le restock, qui eux le font tous. Ce disponible restait donc "libre"
au lieu d'être automatiquement proposé à la plus ancienne commande déjà en attente sur ce
produit.

**Correctif** : ajout de l'appel à `reallocateAvailableStock` juste après le relâchement de
l'excédent, dans `src/lib/order-stock.ts`.

**Test** : ORDOLD (créée en premier, besoin=5, matière indisponible → reste `IN_PRODUCTION`)
puis ORDBIG (créée ensuite, dispo=10 → `FROM_STOCK`, résolue à 10/10).

| | Avant réduction | Après réduction de ORDBIG (10→4) |
|---|---|---|
| ORDOLD | `resolvedQuantity=0/5` | **`resolvedQuantity=5/5`** (réaffecté automatiquement) |
| ORDBIG | `resolvedQuantity=10/10` | `resolvedQuantity=4/4` |
| Produit | `available=0 reserved=10` | `available=1 reserved=9` (6 relâchés − 5 réaffectés) |

✅ Conforme après correctif — la plus ancienne commande en attente reçoit automatiquement le
stock libéré, sans action manuelle.

## Section 3 — "Marquer fabriquée"
Règle : 1) la part due au besoin déjà reconnu de la ligne vient de son propre `reserved` ;
2) le surplus (buffer produit, ou quantité forcée) prend d'abord sur `available` ; 3) s'il en
manque encore, vole dans le `reserved` d'autres lignes (les plus RÉCENTES basculent "Bloquée"
en priorité) ; 4) vérification globale AVANT toute modification — si `disponible+réservé` ne
suffit pas pour toute la recette, refus net, rien n'est modifié.

### 3a. Cas normal (matière abondante)
**Méthode : script interne ET API réelle (résultats identiques).**

- Départ : Matière `available=890 reserved=110` ; Ligne `needed=10 buffer=100 status=A_PRODUIRE`
- Après production de 6 : Matière `available=890 reserved=104` (`available` inchangé) ; Ligne
  `needed=4 produced=6`
- Après production des 4 restants : Matière `available=890 reserved=100` ; Ligne `needed=0
  buffer=100 produced=10 status=A_PRODUIRE`

✅ Conforme des deux côtés (rejoué via API réelle avec des valeurs différentes — `available=990
reserved=10` → `reserved=4` → `reserved=0` — mêmes règles vérifiées).

### 3b. Vol chez une commande plus récente (matière insuffisante)
**Méthode : script interne ET API réelle (résultats identiques).**

Deux produits, même matière (ratio 1) : ANCIEN (créée en premier, besoin=10) et RÉCENT (créée
après, besoin=10). Matière `available=0 reserved=20` (10+10, tout juste assez).

- Avant : Ligne ANCIEN `needed=10 buffer=100 status=A_PRODUIRE` ; Ligne RÉCENT `needed=10
  buffer=100 status=A_PRODUIRE` ; Matière `available=0 reserved=20`

- Après "Marquer fabriquée" 15 pour ANCIEN (10 depuis son propre réservé + 5 volés au pot
  commun) : Matière `available=0 reserved=5` ; Ligne ANCIEN `needed=0 buffer=95 produced=15
  status=A_PRODUIRE` ; Ligne RÉCENT **`needed=10 buffer=100 status=BLOQUE`** (rebascule, plus
  assez de matière réservée pour ses 10) ; Ligne achat matière `needed=200 buffer=2000
  status=A_COMMANDER`

✅ Conforme — les plus récentes basculent Bloquée en priorité, les plus anciennes gardent leur
matière. Via API réelle : appel `PATCH /api/production-list/[id]` → HTTP 200
`{needed:0, buffer:95, produced:15}`, état final identique.

### 3c. Refus net si vraiment pas assez de matière
**Méthode : script interne ET API réelle (résultats identiques).**

Matière `available=0 reserved=5`. Tentative de produire 20 (besoin=20).

- Résultat : refus, rien n'est modifié — matière `available=0 reserved=5` et ligne
  `produced=0` **strictement inchangés**.
- Via API réelle : `PATCH /api/production-list/[id]` `{quantity:20}` → **HTTP 409**
  `"Stock matière insuffisant : ... (disponible+réservé=5, besoin=20)"`.

✅ Conforme.

**Recette à plusieurs matières, une seule insuffisante (API réelle)** : MAT-OK
`available=1000 reserved=0` (largement suffisante), MAT-COURTE `available=0 reserved=5`
(insuffisante), besoin=20 pour les deux. `PATCH /api/production-list/[id]` `{quantity:20}` →
**HTTP 409** `"Stock matière insuffisant : courte (disponible+réservé=5, besoin=20)"`. Vérifié
après coup : **MAT-OK strictement inchangée** (`available=1000 reserved=0`), MAT-COURTE
inchangée, ligne `produced=0 status=A_PRODUIRE`.

✅ Conforme — une seule matière manquante bloque toute la production, même si le reste de la
recette est largement couvert (pas de consommation partielle).

### 3d. Surplus produit au-delà du besoin réel, pris sur un disponible qui en a
**Méthode : script interne ET API réelle (résultats identiques).**

Une seule ligne. Besoin réel=10 (déjà réservé), matière `available=200` en plus.

- Avant : Matière `available=200 reserved=10` ; Ligne `needed=10 buffer=0 status=A_PRODUIRE`
- Après "Marquer fabriquée" 25 (10 = besoin réel, 15 = surplus) : Matière **`available=185
  reserved=0`** ; Ligne `needed=0 buffer=85 produced=25 status=A_PRODUIRE`

✅ Conforme — le besoin réel vient du `reserved` (jamais laissé orphelin), le surplus vient du
`available`. Via API réelle : `PATCH /api/production-list/[id]` `{quantity:25}` → HTTP 200
`{needed:0, buffer:85, produced:25}`, état final identique.

## Section 4 — Liste d'achat matière : "Commander" puis annuler la commande d'origine
**Méthode : script interne.**

- Départ : Ligne achat matière `needed=120 buffer=2000 status=A_COMMANDER`
- Après "Commander" 2120 : `needed=0 buffer=0 ordered=2120 status=COMMANDE`
- Après annulation de la commande client d'origine : Matière `available=0 reserved=0` ; Ligne
  `needed=0 buffer=0 status=COMMANDE` (pas de remontée trompeuse — l'en-transit couvrait déjà)
- Après réception totale (2120) : Matière `available=2120 reserved=0` ; Ligne production
  `needed=0 buffer=100 status=A_PRODUIRE` ; Ligne achat matière **`needed=0 buffer=0
  status=RECU`** — la carte se ferme d'elle-même : `available` compte comme "couvert" pour le
  besoin (cf. section 4 de TESTS-STOCK.md), le buffer de 100 (jamais réservé) est largement
  couvert par les 2120 disponibles.

✅ Conforme.

## Section 5 — Produit ACHETÉ : cycle complet
**Méthode : script interne.**

- Après confirmation : Produit `available=0 reserved=5` ; Ligne achat `needed=15 buffer=100
  status=A_COMMANDER`
- Après "Commander" 115 : `needed=0 buffer=0 ordered=115 status=COMMANDE`
- Après réception partielle de 38 (comble la commande en attente en priorité) : Produit
  `available=23 reserved=20` ; Ligne `received=38 status=COMMANDE` ; Item
  `resolvedQuantity=20/20`
- Après réception du reste (77) : Produit `available=100 reserved=20` ; Ligne `received=115
  status=RECU`

✅ Conforme.

## Section 6 — Annulation + réaffectation FIFO (deux commandes)
**Méthode : script interne.**

X (20, `FROM_STOCK`) puis Y (15, tout en production).

- Avant annulation : Produit `available=0 reserved=20` ; Item Y `resolvedQuantity=0/15`
- Après annulation de X : Produit `available=5 reserved=15` ; Matière `available=0 reserved=0`
  (relâchée une seule fois) ; Item Y `resolvedQuantity=15/15` ✅ comblé automatiquement FIFO

✅ Conforme.

## Section 7 — "Marquer Produit" (bouton manuel, avant Livré)
**Méthode : API réelle pour les 3 tests (7a/7b/7c) — vraie connexion, vraies requêtes HTTP
`PATCH /api/orders/[id]` avec `{status:"PRODUITE"}`, pas de fonctions internes appelées
directement.**

### Comment ça marche (rappel)
Quand tu marques une commande "Produit", pour chaque article encore en attente, le système
cherche à combler le manquant dans cet ordre strict :
1. **Disponible du produit** (stock déjà là).
2. **Réservé chez N'IMPORTE QUELLE AUTRE commande active** sur ce même produit — "Produite"
   OU simplement "Confirmée" (peu importe, du moment qu'elle a déjà du réservé dessus) — il
   lui reprend ce stock, en commençant par la commande **la plus récemment créée**. Si elle
   était "Produite", elle repasse "Confirmée" ; si elle était déjà "Confirmée" avec du
   manquant restant, elle le reste simplement.
3. **(Produits fabriqués seulement)** fabrication immédiate avec la matière déjà réservée.

S'il reste un manquant après ces 3 étapes → **refus total (HTTP 409)**, rien n'est modifié,
message listant les produits manquants et la quantité.

### 7a — Le disponible suffit à tout couvrir
**Scénario** : produit avec `available=10`, une commande de 10 en attente.

| Étape | Résultat |
|---|---|
| Avant tout stock disponible | `PATCH .../PRODUITE` → **409** (manquant=10) |
| Après avoir mis `available=10` | `PATCH .../PRODUITE` → **200** |
| État final | Produit `available=0 reserved=10` ; commande `resolvedQuantity=10/10` |

✅ Conforme.

**Complément testé ensuite** (à la demande, pour vérifier l'effet sur le reste) : la même
manip mais avec **2 AUTRES commandes (A, B) en attente sur le même produit**, plus un témoin.
- Avant : 3 commandes de 5 chacune (A, B, C) sur le même produit, matière indisponible → ligne
  de production `needed=15 buffer=100 status=BLOQUE`.
- On marque **seulement C** "Produit" (disponible=5 arrivé entre-temps) :

| | Avant | Après |
|---|---|---|
| Commande A | `resolvedQuantity=0/5` | **inchangée** |
| Commande B | `resolvedQuantity=0/5` | **inchangée** |
| Commande C (ciblée) | `resolvedQuantity=0/5` | `resolvedQuantity=5/5`, "Produite" |
| Produit | `available=5 reserved=0` | `available=0 reserved=5` |
| Ligne de production | `needed=15` | `needed=10` (A+B seulement) |
| Témoin (autre produit) | — | rigoureusement inchangé |

✅ Conforme — "Marquer Produit" ne touche **que** la commande ciblée, jamais les autres
commandes en attente du même produit ; la liste se recalcule correctement.

### 7b — Le disponible ne suffit pas → on va chercher chez une AUTRE commande active
**Le donneur peut être n'importe quelle commande/devis encore active — "Produite" OU
simplement "Confirmée"** (pas seulement celles déjà produites), du moment qu'elle a déjà du
réservé sur ce produit. Toujours la plus récemment créée en premier.

**Cas 1 — donneur déjà "Produite"** : DONOR (commande de 5, confirmée quand il y avait 5 de
dispo → prise directement en stock, `FROM_STOCK`, passe automatiquement "Produite") créée
**avant** CURRENT (commande de 5, créée après, plus rien en dispo, matière indisponible aussi).

| | Avant | Après "Marquer Produit" sur CURRENT |
|---|---|---|
| DONOR | `status=PRODUITE resolvedQuantity=5/5` | **`status=VALIDE resolvedQuantity=0/5`** (on lui a repris ses 5) |
| CURRENT | `status=VALIDE resolvedQuantity=0/5` | `status=PRODUITE resolvedQuantity=5/5` |
| Produit | `available=0 reserved=5` | `available=0 reserved=5` (inchangé — juste réattribué de DONOR à CURRENT) |
| Ligne de production (pour DONOR, redevenue nécessaire) | — | `needed=5 status=BLOQUE` réapparaît |

🐛 **Bug trouvé et corrigé pendant ce test** : au premier essai, DONOR perdait bien ses 5 et
repassait "Confirmée", mais son `stockPath` restait `FROM_STOCK` — un article `FROM_STOCK` ne
compte jamais dans le besoin recalculé, donc son manquant de 5 **disparaissait sans laisser de
trace**, invisible dans toutes les listes. Corrigé : dès qu'un donneur perd sa couverture, son
`stockPath` est remis sur `IN_PRODUCTION`/`PURCHASE_PENDING` (selon le mode du produit) pour
qu'il redevienne visible normalement.

✅ Conforme (après correctif) — rien n'est perdu, tout redevient traçable.

**Cas 2 — donneur encore "Confirmée", jamais "Produite"** (demande explicite : vérifier que ça
marche aussi pour un donneur pas encore produit) : DONOR2 (commande de 8, confirmée quand il y
avait 5 de dispo → 5 pris directement, 3 restent en attente en production, matière
indisponible → reste "Confirmée" pour toujours, ne devient jamais "Produite") créée **avant**
CURRENT (commande de 5, créée après, plus rien en dispo).

| | Avant | Après "Marquer Produit" sur CURRENT |
|---|---|---|
| DONOR2 | `status=VALIDE resolvedQuantity=5/8` | `status=VALIDE resolvedQuantity=0/8` (perd ses 5, reste "Confirmée" — n'était pas "Produite", rien à faire redescendre) |
| CURRENT | `status=VALIDE resolvedQuantity=0/5` | `status=PRODUITE resolvedQuantity=5/5` |
| Produit | `available=0 reserved=5` | `available=0 reserved=5` (inchangé) |

✅ Conforme — le vol fonctionne identiquement, peu importe si le donneur est déjà "Produite" ou
juste "Confirmée" avec du stock déjà réservé.

### 7c — Rien du tout nulle part → refus total
**Scénario** : matière `available=0`, produit `available=0`, aucune commande "Produite" à qui
reprendre du stock. Commande de 10.

| Étape | Résultat |
|---|---|
| `PATCH .../PRODUITE` | **HTTP 409** `{error:"PRODUCT_SHORTFALL", shortfall:[{reference:"...", missing:10}]}` |
| Vérifié après coup | Commande reste `status=VALIDE` — **rien n'a été modifié** |

✅ Conforme — refus propre, pas de modification partielle.

## Section 8 — Stock direct (hors commande)
**Méthode : script interne.**

- **Correction produit à la baisse** (50→20) : seul le buffer bouge — Produit `available=20` ;
  Ligne `needed=0 buffer=80 status=A_PRODUIRE`.
- **Correction produit à la hausse** (commande de 10 en attente → 15) : comblée en priorité
  FIFO, matière relâchée une seule fois — Avant `needed=10 buffer=100 status=BLOQUE` ; Après
  Produit `available=5 reserved=10`, Matière `available=0 reserved=0`, Ligne `needed=0
  buffer=95 status=A_PRODUIRE`.
- **Correction matière à la hausse** (+500) débloquant une ligne Bloquée : Avant Matière
  `available=0 reserved=2`, Ligne `BLOQUE` ; Après Matière `available=492 reserved=10`
  (**seulement le besoin réel, jamais le buffer=100** même s'il y avait largement de quoi),
  Ligne `A_PRODUIRE`, Ligne achat matière `needed=0 buffer=1508` (le besoin réel est couvert
  par les 492 disponibles, cf. section 4 — `available` compte comme "couvert").
- **Correction `reserved` matière** (0→5) : recalcule immédiatement le besoin achat — Ligne
  achat matière `needed=15 buffer=1900`.
- **Correction `reserved` produit à la baisse** (30→15, deux commandes `FROM_STOCK` : ANCIEN=10
  créée en premier, RÉCENT=20 créée ensuite) : reprend la couverture aux commandes actives
  (VALIDE/PRODUITE), **les plus RÉCENTES perdent en premier** (FIFO) — ANCIEN reste intact
  (`resolvedQuantity=10`), RÉCENT perd 15 (`resolvedQuantity=5`, repasse `IN_PRODUCTION`),
  ligne production `needed=15 buffer=100 status=A_PRODUIRE` réapparaît.
- **Correction `reserved` matière à la baisse** (20→12, deux lignes `A_PRODUIRE` partageant la
  matière, ANCIENNE et RÉCENTE) : revérifie les lignes couvertes, **les plus RÉCENTES
  rebasculent "Bloquée" en premier** — ANCIENNE reste `A_PRODUIRE` (10≤12), RÉCENTE rebascule
  `BLOQUE`, ligne achat matière `needed=208 buffer=2000` (manquant remonté automatiquement).
- **Témoin** (jamais touché) : `available=777 reserved=111`, inchangé du début à la fin.

✅ Conforme sur tous les points.

## Section 9 — FIFO multi-commandes
**Méthode : script interne.**

Deux commandes de 10, la 1ʳᵉ créée avant la 2ᵉ. Production de 10 (ne couvre qu'une commande).
- Item le plus ancien : `resolvedQuantity=10` ✅
- Item le plus récent : `resolvedQuantity=0` ✅

✅ Conforme.

## Section 10 — Réception qui ne passe "Reçu" que si besoin ET buffer sont à 0, ET tout est reçu
**Méthode : script interne (logique de la route `receive` reproduite fidèlement).**

- Ligne isolée `needed=120 buffer=2000 ordered=2120 status=COMMANDE`.
- Après réception du besoin réel SEUL (120) : `needed=0 buffer=2000 received=120
  status=COMMANDE` ✅ reste Commandé.
- Après réception du reste (buffer=2000) : `needed=0 buffer=0 received=2120 status=RECU` ✅

**🐛 Bug trouvé et corrigé** : comme l'en-transit compte comme "couvert" (section 4), une
réception **minime** suffisait à faire retomber `needed`/`buffer` à 0 et fermait la carte à
tort — vérifié : réceptionner 1 seule unité sur 2120 commandées fermait déjà en "Reçu" avant
correctif. **Correctif** (`purchase-list/[id]/route.ts`) : la carte ne passe "Reçu" que si LES
TROIS conditions sont réunies : `needed<=0` ET `buffer<=0` ET `receivedQuantity >=
orderedQuantity`.
- Réception de 1/2120 → reste `COMMANDE` ✅ (avant correctif : serait passé "Reçu" à tort)
- Réception totale d'un coup (2120/2120) → `RECU` ✅ (non-régression)
- Réception en 2 fois (1900 puis le reste) → reste `COMMANDE` après 1900, `RECU` seulement à
  la fin ✅

✅ Conforme sur tous les cas, aucune régression.

## Section 11 — Déblocage matière progressif (FIFO), besoin réel seul
**Méthode : script interne.**

Deux produits (A créé avant B), même matière, tous deux `BLOQUE` (`needed=10 buffer=100`
chacun), matière dispo=2.
- Après réception de 8 (couvre ENTIÈREMENT le besoin réel de A, 10−2) : Ligne A `A_PRODUIRE` ✅
  débloquée ; Ligne B `BLOQUE` ✅ inchangée
- Après complément pour B : Ligne B `A_PRODUIRE` ✅ débloquée à son tour

✅ Conforme — seul le besoin réel compte, jamais le buffer.

## Section 12 — "Commandes concernées" (précision)
Non rejoué numériquement dans cette série de tests (fonction de traçabilité UI
`stock-traceability.ts`) — déjà validée en détail plus tôt dans le projet. Impactée une seule
fois depuis, par la fonctionnalité "commandes prioritaires" (section 15) : `fifoCompare`
branché dans `materialClaims`, non re-testé numériquement ici.

## Section 13 — Ce qui a été commandé au fournisseur compte comme "sécurisé"
**Méthode : script interne.**

- Après "Commander" 3000 (très au-delà du besoin) : `needed=0 buffer=0 ordered=3000
  status=COMMANDE`
- Après annulation de la commande client : Matière `available=0 reserved=0` ; Ligne `needed=0
  buffer=0 status=COMMANDE` ✅ (en-transit couvre tout)

✅ Conforme.

## Section 14 — Réapprovisionnement manuel (restock)
**Méthode : script interne ET API réelle (résultats identiques une fois la décision "le buffer
ne réserve jamais de matière" prise en compte des deux côtés).**

- **Restock produit mode "produire"** (ratio 2, matière dispo=1000) : réapprovisionnement de 30
  → Produit `available=30` ; Matière `available=940 reserved=0` (consommée directement, jamais
  réservée).
- **Restock produit avec commande de 15 en attente** (ratio 1) : Avant Matière `available=985
  reserved=15` (15 = besoin réel seul), Ligne `needed=15 buffer=100` ; après réapprovisionnement
  de 10 → Produit `available=0 reserved=10` ; Matière `available=985 reserved=5` (relâchée une
  seule fois) ; Ligne `needed=5 buffer=100`.
- **Restock matière** (+500) débloquant une ligne Bloquée : Avant Matière `available=0
  reserved=2`, Ligne `BLOQUE` ; Après Matière `available=492 reserved=10` (seulement le besoin
  réel) ; Ligne `A_PRODUIRE` ; Ligne achat matière `needed=0 buffer=1508`.

✅ Conforme via les deux méthodes — la route réelle (`POST /api/stock/restock`) exécute
exactement le comportement attendu, authentification et permissions réelles comprises.

## Section 15 — Commandes/devis prioritaires
**Méthode : API réelle.**

Une commande/devis marquée "prioritaire" passe TOUJOURS devant les autres dans les
simulations FIFO du stock (distribution, réaffectation, reprise de couverture, badge
"Bloqué"), comme si elle avait été créée en premier — togglable uniquement quand VALIDE et pas
encore PRODUITE ; applicable aux commandes ET aux devis ; pas d'équivalent côté achat.

- **Changements** : champ `priority` (Order/Quote), comparateur `fifoCompare`
  (`src/lib/order-stock.ts`) branché dans `distributeToLinkedItems`, `reallocateAvailableStock`,
  `reassessProductReserved`, et `materialClaims` (`stock-traceability.ts`) ; nouvelle route
  `GET /api/production-list/urgent` ; bouton "Marquer prioritaire" dans le détail
  commande/devis ; carte "Production urgente" en bas de la liste de production.

**Test — priorité change juste l'ordre pour plus tard** : produit FABRIQUE, matière abondante.
ANCIENNE (commande de 10, créée en premier) et RÉCENTE (commande de 10, créée après, marquée
**prioritaire**).
- Avant production : `GET /api/production-list/urgent` → `[{reference:"...", quantity:10}]`
  (seule RÉCENTE compte).
- "Marquer fabriquée" 10 (pas assez pour les deux) : ANCIENNE `resolvedQuantity=0` (rien reçu),
  RÉCENTE `resolvedQuantity=10` (tout reçu) — **inversé par rapport au FIFO normal**.
- Après production complète de RÉCENTE : `GET /api/production-list/urgent` → `[]` (la carte
  disparaît, RÉCENTE passée "Produite" automatiquement).
- Garde-fous : retirer la priorité sur une commande déjà "Produite" → HTTP 400 ; marquer
  prioritaire une commande "Annulée" → HTTP 400.

✅ Conforme.

### Tentative puis annulation : vol immédiat à la mise en priorité

Un instant, la demande avait évolué vers un vol immédiat (disponible puis réservé chez
d'autres commandes) à la mise en priorité — implémenté, testé, puis **annulé sur demande
explicite** : "je ne veux pas que ça vole les produits finis d'une commande, enlève le
comportement qu'on vient d'ajouter". Retiré intégralement (`previewPriorityStockGap`,
`grabStockForPriority`, le paramètre `confirmPriorityGap`, la confirmation dans
`RequestPanel.tsx`) — retour au comportement d'origine : marquer prioritaire ne fait QUE poser
le flag, aucun effet immédiat sur le stock.

**Vérifié après retrait (API réelle)** : même scénario qu'avant (A confirmée avec dispo=5 →
`FROM_STOCK`, devient "Produite" ; B créée après, dispo=0 ensuite). `PATCH /api/orders/[id]`
`{priority:true}` sur B → HTTP 200 : B a seulement `priority=true`, `resolvedQuantity` **reste
à 0/5** (rien volé) ; A **reste strictement inchangée**
(`status=PRODUITE resolvedQuantity=5/5 stockPath=FROM_STOCK`) — aucun vol, aucune réouverture.

✅ Conforme à la demande finale — comportement d'origine restauré et confirmé.

---

## Notes méthodologiques

- **Découverte importante (section 4)** : après le correctif du statut "Bloqué/À produire"
  (voir historique du projet), un produit fini sous son seuil de production garde un buffer
  actif en permanence — la matière reçue en intégralité ne "couvrait" ce buffer qu'une fois la
  règle section 4 (`available` compte comme couvert) mise en place. Résolu, cf. section 4
  ci-dessus.
- **Deux bugs réels trouvés et corrigés** pendant ces séries de tests (pas seulement des écarts
  de script) : la fermeture "Reçu" prématurée sur réception minime (section 10), et le
  `stockPath` du donneur resté `FROM_STOCK` après un vol de stock (section 7b) — les deux
  documentés dans leur section avec le comportement avant/après correctif.
- Scripts temporaires systématiquement supprimés après usage ; aucun fichier de test ne reste
  dans `prisma/`.
