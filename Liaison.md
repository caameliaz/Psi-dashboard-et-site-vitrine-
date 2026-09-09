# Liaison RollLink ↔ PSI Dash — todo-list (9 septembre 2026)

Ce document est une liste d'étapes à faire dans l'ordre. Chaque étape dit :
**qui la fait**, **ce qu'elle fait**, **ce qui rentre**, **ce qui sort**.

Principe général en une phrase : RollLink envoie la commande à PSI Dash,
PSI Dash traite tout avec son code existant, PSI Dash répond avec le
résultat, RollLink met à jour sa commande. Un aller-retour, comme un
formulaire qu'on soumet sur un site.

---

## ☐ Étape 1 — PSI Dash : créer la route qui reçoit une commande

**Qui** : Sofia, dans `M:\PSI\psisite`.
**Fichier à créer** : une nouvelle route API, ex.
`src/app/api/rolllink/commandes/route.ts` (à adapter selon la structure
Next.js du projet — chercher comment les autres routes API sont déjà
organisées dans `psisite/src/app/api/`).

**Ce qu'elle doit faire, dans l'ordre :**

1. Lire le header `X-API-Key` de la requête reçue.
2. Comparer cette valeur à une clé secrète stockée dans `.env`
   (nouvelle variable à ajouter : `ROLLINK_API_KEY=<une valeur secrète au choix>`).
3. Si la clé est absente ou fausse → répondre avec le code 401 et
   s'arrêter là.
4. Lire le corps de la requête (JSON). Il ressemblera à ça :

```json
{
  "referenceCommande": "RL-2026-00042",
  "lignes": [
    { "productId": "cmrw85for0003vcp0uw34vwv9", "quantite": 20 }
  ]
}
```

5. Créer une commande interne (`Order`) dans PSI Dash pour représenter
   cette commande RollLink :
   - Ajouter une nouvelle valeur `ROLLINK` dans l'enum `OrderSource`
     (`schema.prisma`, à côté de `SITE`, `ADMIN`, `WHATSAPP`,
     `TELEPHONE`, `AUTRE`).
   - Mettre `source: "ROLLINK"` sur cet `Order`.
   - Stocker `referenceCommande` (le `"RL-2026-00042"` reçu) quelque
     part sur cet `Order` pour pouvoir le retrouver plus tard (le champ
     `ref` existe déjà sur `Order` — vérifier s'il est libre à cet usage
     ou s'il faut un champ séparé).
   - Créer un `OrderItem` par ligne reçue, avec le bon `productId` et la
     bonne `quantity`.
6. Appeler **la fonction de confirmation de commande qui existe déjà**
   dans PSI Dash (celle testée dans `psisite/TESTS-STOCK.md`, qui gère
   `stockPath`, réserve le stock, crée les lignes de production/achat si
   besoin) sur cette commande qu'on vient de créer. **Ne pas réécrire
   cette logique** — juste l'appeler sur cette nouvelle commande.
7. Une fois le traitement fait, répondre en JSON avec le résultat, une
   entrée par ligne :

```json
{
  "lignes": [
    { "productId": "cmrw85for0003vcp0uw34vwv9", "stockPath": "FROM_STOCK" }
  ]
}
```

`stockPath` est une des valeurs qui existent déjà dans le schéma PSI
Dash : `FROM_STOCK` (stock suffisant, réservé tout de suite),
`IN_PRODUCTION` (pas assez de stock, parti en fabrication),
`PURCHASE_PENDING` (produit acheté, pas fabriqué, en attente d'achat).

**✅ Étape 1 terminée quand** : on peut appeler cette route avec un outil
comme Postman/curl et recevoir une réponse cohérente avec une vraie
commande de test.

---

## ☐ Étape 2 — PSI Dash : créer les 2 routes de lecture

**Qui** : Sofia, dans `M:\PSI\psisite`.
**Fichiers à créer** : 2 nouvelles routes, ex.
`src/app/api/rolllink/production/route.ts` et
`src/app/api/rolllink/achat/route.ts`.

**Ce qu'elles doivent faire :**

1. Même vérification de la clé `X-API-Key` que l'étape 1.
2. `GET /api/rolllink/production` renvoie toutes les lignes
   `ProductionListItem` liées à une commande dont `source = "ROLLINK"`
   (celles créées à l'étape 1) — **jamais** les lignes qui viennent des
   commandes internes normales de PSI Dash.
3. `GET /api/rolllink/achat` fait pareil mais pour `PurchaseListItem`.
4. Réponse en JSON : la liste des lignes, avec au minimum le produit
   concerné, la quantité, et le statut (`A_PRODUIRE`/`BLOQUE`/`EN_COURS`/
   `PRODUIT` pour la production ; `A_COMMANDER`/`COMMANDE`/`RECU` pour
   l'achat).

**✅ Étape 2 terminée quand** : après avoir créé une commande de test à
l'étape 1 dont le stock était insuffisant, ces 2 routes montrent bien la
ligne de production/achat correspondante.

---

## ☐ Étape 3 — Sofia revient vers Claude avec 3 informations

Une fois les étapes 1 et 2 faites (même en local, pas besoin d'être en
ligne), revenir avec :

1. **L'URL** où tourne PSI Dash (ex. `http://localhost:3000` si en local
   sur ce PC, ou l'URL en ligne si déployé).
2. **La valeur de `ROLLINK_API_KEY`** choisie à l'étape 1.
3. **Le format exact** de ce que les routes renvoient, s'il est différent
   de ce qui est écrit dans ce document (copier-coller un exemple réel
   obtenu en testant).

*(Il n'est pas obligatoire d'attendre d'avoir tout fini pour revenir — si
un blocage arrive en cours de route, revenir aussi à ce moment-là.)*

---

## ☐ Étape 4 — Claude configure RollLink avec ces informations

**Qui** : Claude, une fois l'étape 3 faite.
**Fichier** : `backend/.env`

```
PSI_DASH_API_URL="<url donnée à l'étape 3>"
PSI_DASH_API_KEY="<clé donnée à l'étape 3>"
```

---

## ✅ Étape 5 — Décisions tranchées le 9/09

### Décision A — Suivi d'une commande partie en fabrication : webhook, un seul point d'ancrage

**Écarté** : un webhook posé à plusieurs endroits du code PSI Dash
(`checkCompletion`, `reallocateAvailableStock`, `distributeToLinkedItems`…)
serait fragile — une commande RollLink peut avancer par plusieurs chemins
différents (production terminée, mais aussi réallocation de stock suite à
l'annulation d'une AUTRE commande qui libère du disponible — voir
`reallocateAvailableStock` dans `order-stock.ts`). Éparpiller l'appel à
plusieurs endroits risquerait d'en oublier un.

**Retenu** : un seul point d'ancrage — `checkCompletion` (fonction dans
`psisite/src/lib/order-stock.ts`, ligne ~339). C'est **le seul endroit**
où PSI Dash marque une commande comme complète (`status: 'PRODUITE'}`),
quel que soit le chemin qui y a mené. Placer l'appel webhook juste après
cette mise à jour de statut couvre tous les cas sans avoir à identifier
chaque chemin possible.

**✅ Fait et testé côté PSI Dash (9/09)** : `checkCompletion` appelle
`notifyRollLinkOrderReady(ref)` (nouveau fichier `src/lib/rolllink-notify.ts`)
en best-effort (jamais bloquant) quand `kind === 'order' && source === 'ROLLINK'`,
juste après le passage à `PRODUITE`. Format confirmé par test réel :

```
POST http://localhost:3000/api/stock-integration/notification
X-API-Key: 537f988c3fbf660f47a4a27763008f250d57a7588b01bf95
{ "referenceCommande": "RL-TEST-0002" }
```

L'URL cible est configurable côté PSI Dash via `ROLLINK_BACKEND_URL`
(actuellement `http://localhost:3000`).

**✅ Fait et testé côté RollLink (9/09)** : route
`POST /api/stock-integration/notification` créée
(`stockIntegration.routes.js`), vérifie `X-API-Key`, appelle
`commande.service.marquerDisponibleDepuisPsiDash(referenceCommande)`.
**Confirmé fonctionner en conditions réelles** : pendant les tests, le
webhook réel envoyé par PSI Dash a été reçu et traité correctement par
RollLink (ligne "Production terminée côté PSI Dash." dans l'historique
d'une commande de test).

### Décision B — Panne au moment de l'appel initial : relance manuelle

**Retenu** : pas de système automatique de nouvelles tentatives. Si
l'appel à PSI Dash échoue à la création de la commande (réseau, PSI Dash
éteint), la commande reste visible côté PSI avec un indicateur clair
(« vérification stock à refaire ») et un **bouton manuel** pour relancer
cet appel initial. Plus simple que des tentatives automatiques
programmées, et une panne réseau est un événement rare qui ne justifie
pas un mécanisme récurrent.

---

## Étape 6 — Code côté RollLink

### ✅ Fait et testé le 9/09 (points 1 à 4)

1. **Client `psiDashApiClient.js`** — écrit avec `fetch` natif (pas de
   nouvelle dépendance ajoutée) : `envoyerCommande`,
   `listerProductionRollLink`, `listerAchatRollLink`. Gère l'absence de
   config (`PSI_DASH_NON_CONFIGURE`) et les pannes réseau (`PSI_DASH_INJOIGNABLE`,
   code HTTP 502).
2. **Branché dans `commande.service.js`** — `verifierStockPsiDash`
   appelée juste après la création (hors transaction, comme la
   notification interne) : envoie la commande, traduit `stockPath` en
   statut RollLink (`FROM_STOCK` → `DISPONIBLE`, sinon reste
   `VERIF_STOCK` avec `verifStockStatut = EN_ATTENTE_PSI_DASH`), trace
   dans l'historique.
3. **Décision A (webhook)** — route `POST /api/stock-integration/notification`
   (détail ci-dessus, §Décision A). Nouveau champ `verifStockStatut`
   ajouté au modèle `Commande` (String, nullable) pour tracer l'état.
4. **Décision B (relance manuelle)** — route
   `PATCH /api/commande/:id/relancer-verif-stock`, réservée aux rôles PSI,
   rejette si la commande n'a pas `verifStockStatut = ECHEC_APPEL`.

**Tests réels effectués** (commandes de test créées puis intégralement
nettoyées des deux côtés — RollLink et PSI Dash) :
- création de commande → appel PSI Dash automatique → statut passé à
  `DISPONIBLE` tout seul, sans intervention manuelle ;
- webhook PSI Dash reçu et traité correctement pendant un test (effet de
  bord observé, confirmant le mécanisme en conditions réelles) ;
- relance manuelle : panne simulée → relance → `DISPONIBLE` ; rejet
  correct si relance demandée alors que non nécessaire ;
- contrôle de rôle : POS refusé (403) sur la relance, ADMIN_PSI accepté.

### ✅ Point 5 fait et testé le 9/09 — Dashboard PSI

`ListeAchatPanel` (`DashboardWidgets.jsx`) branché sur
`psiApi.listerProductionPsiDash()` / `listerAchatPsiDash()` (nouvelles
fonctions dans `psiApi.js`, appellent `GET /api/stock-integration/production`
et `/achat`), à la place du mock `STOCK_PF`/`STOCK_MP_INIT`.

**Écarts assumés avec le prototype d'origine** (décidés le 9/09) :
- **Bouton « + Ajouter ligne » retiré** — le prototype permettait
  d'ajouter une ligne directement dans la liste d'achat, mais RollLink
  est en LECTURE SEULE sur les listes PSI Dash (§3). Si on veut un jour
  une vraie création de ligne depuis RollLink, il faudra une route
  d'écriture dédiée côté PSI Dash — pas fait, pas prévu pour l'instant.
- **Champs simplifiés** — le mock avait un `seuil` et un texte de
  « blocage » détaillé qui n'existent pas dans la réponse API réelle.
  L'affichage se limite à ce que PSI Dash fournit vraiment : produit,
  quantité, statut (badge coloré selon `A_PRODUIRE`/`BLOQUE`/`EN_COURS`/
  `PRODUIT` côté production, `A_COMMANDER`/`COMMANDE`/`RECU` côté achat),
  et la liste des références de commandes RollLink concernées.
- **Onglets « Production » / « Achat »** — remplacent « Produits finis »
  / « Matières premières » du mock, pour coller aux deux vraies notions
  distinctes de l'API PSI Dash (deux routes séparées), dans la même carte.

**Testé en conditions réelles** : commande de test à quantité supérieure
au stock disponible côté PSI Dash → ligne visible via
`GET /api/stock-integration/production` avec le bon produit, la bonne
quantité manquante, le statut `A_PRODUIRE`, et la référence de la
commande RollLink. Nettoyage complet des deux côtés après test.

**⚠️ Comportement du rafraîchissement (à savoir, décidé le 9/09)** :
`ListeAchatPanel` appelle PSI Dash une seule fois, au montage du
composant (`useEffect` à dépendances vides) — pas de copie stockée côté
RollLink, mais pas de rafraîchissement automatique non plus. Un admin PSI
voit l'état de PSI Dash au moment où il a ouvert/rechargé le Dashboard ;
un changement survenu depuis (ex. webhook de production reçu entre-temps)
n'apparaît qu'après un rechargement manuel (F5). Décision : rester ainsi
pour l'instant, cohérent avec le reste du Dashboard qui ne rafraîchit pas
non plus tout seul. À revoir si le besoin s'en fait sentir.

---

## Pour comprendre pourquoi c'est fait comme ça

- **Pourquoi un appel direct (pas une vérification périodique)** : c'est
  la façon la plus simple d'avoir un résultat immédiat, sans attendre.
- **Pourquoi PSI Dash fait tout le traitement (pas RollLink)** : PSI Dash
  a déjà tout le code qui gère le stock, la production, les matières
  premières — pas besoin de le réécrire une deuxième fois côté RollLink.
  Refaire cette logique ailleurs risquerait de donner des résultats
  différents des vraies commandes PSI Dash.
- **Pourquoi pas de connexion directe entre les deux bases de données** :
  sans passer par le code de PSI Dash (juste en écrivant des lignes dans
  sa base), on perdrait tout le travail de vérification qu'il fait déjà —
  ça reviendrait à devoir réécrire cette logique quand même, mais mal.

## Références produits déjà faites (9/09) — pas à refaire

Ces 6 identifiants viennent de la **vraie base PSI Dash** (`neondb`, celle
que `psisite/.env` utilise par défaut) — pas de la branche Neon séparée
que Sofia a mise dans `.env` de RollLink (`PSI_DASH_DIRECT_URL`), qui
contient les mêmes références produits mais avec des identifiants
différents (deux jeux de données distincts). Si un jour on doit relire
ces identifiants pour vérifier, aller les chercher dans la vraie base
PSI Dash, pas dans cette branche.

| RollLink | Format | PSI Dash `Product.id` |
|---|---|---|
| PT-01 | 57/30 | `cmrw85for0003vcp0uw34vwv9` |
| PT-02 | 57/40 | `cmrw85ft30005vcp0gh3ll0yw` |
| PT-03 | 57/50 | `cmrw85fvx0007vcp0zc35670s` |
| PT-04 | 80/60 | `cmrw85fyp0009vcp0cdm5qyi6` |
| PT-05 | 80/80 | `cmrw85g4c000dvcp0pkn94q5n` |
| PT-07 | 80/75 | `cmrw85g1m000bvcp0wpq6oirp` |
| PT-06, PT-08, PT-09, PT-10 | 57/57, 57/69, 57/75, 57/79 | n'existent pas encore côté PSI Dash — pas urgent, à créer plus tard |

## Les étiquettes (ET-01 à ET-06) — pas concernées par cette liaison

RollLink a aussi 6 références d'étiquettes en plus des 10 rouleaux papier
thermique (PT-*). Elles ne font **pas partie** de cette liaison stock pour
l'instant, parce que :
- ce sont des produits **achetés directement**, pas fabriqués par PSI —
  pas de recette, pas de matière première à vérifier ;
- elles ne sont **pas affichées sur le site public** de PSI Dash.

Elles seront ajoutées plus tard, une fois que le circuit PT (rouleaux)
fonctionnera. Rien à faire dessus pour l'instant, ni côté RollLink ni
côté PSI Dash.
