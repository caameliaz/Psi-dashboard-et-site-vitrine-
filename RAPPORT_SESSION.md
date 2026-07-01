# Rapport de session — PSI Dashboard
**Dernière mise à jour :** 1er juillet 2026

---

## Migrations DB à lancer (obligatoire au démarrage)

```bash
npx prisma migrate dev --name add_ref_order_quote
npx prisma migrate dev --name add_admin_source
npx prisma generate
npm run dev
```

---

## Ce qu'on a changé

### Formulaires publics (`/quote` et `/checkout`)
- Champ **email** ajouté aux deux formulaires, sauvegardé en DB
- Écran de **confirmation** après envoi (teal, checkmark) — plus de `alert()`

---

### Page Demandes (`/admin/requests`)
- Onglet **"Tous"** — commandes + devis mélangés, triés par date
- Badge orange = nombre de demandes **En attente** (disparaît quand tout est traité)
- Bouton **"Nouvelle demande"** crée maintenant vraiment en DB (avant : local seulement)
- Formulaire de création : dropdown **référence produit** avec prix auto-rempli, plusieurs lignes, **TVA 19%** en toggle, total calculé en temps réel
- Dropdown ref : custom stylisé avec recherche intégrée (plus le select natif moche)
- Bouton **"Rapport de ventes"** — export Excel des commandes livrées uniquement
- Bouton **"Exporter"** — export Excel du tableau filtré actuel
- Colonne **Source** dans le tableau : "Site web" (vert) / "Manuel" (orange)
- Statuts simplifiés : **En attente → Confirmé → Livré** (Contacté supprimé)

---

### Temps réel (SSE)
- Le dashboard et la page demandes se mettent à jour **automatiquement** quand une nouvelle commande/devis arrive — sans refresh, sans polling
- **Fix critique** : singleton `globalThis.__sseBus` dans `src/lib/sse-bus.ts` — Next.js isolait chaque module de route dans son propre Set vide, les toasts n'arrivaient jamais. Le globalThis partage le même Set sur toute l'instance Node.
- `pushSSE()` importé depuis `@/lib/sse-bus` dans toutes les routes (orders, quotes, clients, etc.)
- `SSEProvider` dans `src/lib/sse-context.tsx` — reconnexion auto après 3s si déconnecté
- `useSSEContext().subscribe()` utilisé partout au lieu de créer un EventSource manuellement

---

### Notifications (TopBar)
- **Toasts push** : top-right, 360–440px, 7 secondes, sans point rond, sans barre colorée — carte blanche avec bordure colorée uniquement
- **Cloche** avec badge rouge (count non lus) dans le header admin
- **Panel notifications** (clic cloche) : liste avec couleur par type, timestamp relatif, marquer lu individuel / tout marquer lu
- `notifyActivity` helper (`src/lib/notify-activity.ts`) : `notifyStatusChange`, `notifyDeletion`, `notifyCreation` — appelés depuis toutes les routes de mutation
- Notifications distinguent **Source** : titre "Nouvelle commande · Site web" vs "Nouvelle commande · Manuel"
- Page `/admin/notifications` existe (filtre All/Unread/type) mais **non accessible depuis la sidebar** (panel suffisant)

---

### Dashboard (`/admin/dashboard`)
- **4 cartes** : stats du mois + top 3 produits (donut) + **origine des demandes** (nouveau)
- Carte "Origine" : barre empilée + légende Site web / Manuel / WhatsApp / Téléphone avec %
- Clic sur une ligne du tableau → ouvre le panel avec toutes les actions
- Bouton **Excel** pour exporter le tableau
- Colonne **Source** dans le tableau récapitulatif

---

### Clients (`/admin/clients`)
- **Tous les clients** sont visibles dès leur création — filtre `orders: { some: {} }` supprimé de `GET /api/clients`
- Bouton "Nouvelle **commande**" (corrigé — était "Nouvelle demande")
- Titre modal : "Nouvelle commande" / "Nouvelle demande de devis" selon le type choisi
- Formulaire admin création commande/devis : appelle vraiment le POST API (avant : mock local)
- Les **refs** dans l'historique sont les vraies refs (`CMD-16-0001`) — plus les IDs tronqués

---

### Panel demande (`RequestPanel`)
- Badge **Source** visible dans le header (Site web vert / Manuel orange)
- Workflow simplifié : `En attente → Confirmer → Marquer Livré` (ou "Convertir en commande" pour les devis)
- Bouton "Marquer Contacté" supprimé
- Boutons contact : WA, Tel, MAIL avec templates
- **PDF impression** + **Export Excel** par commande

---

### Export rapport de ventes (`/api/orders/export`)
Colonnes : N° Facture · **Source** · Date commande · Date livraison · Client · Entreprise · Wilaya · Agent · Réf produit · Qté · Prix unitaire · Total ligne

- Uniquement les commandes **Livrées**
- Une ligne par produit (multi-lignes si plusieurs refs)
- Récapitulatif total en bas

---

### Refs automatiques
Format : `CMD-16-0001` (commande) / `DEV-31-0002` (devis)
- Code wilaya 2 chiffres (Alger = 16, Oran = 31, etc.)
- Compteur séquentiel 4 chiffres

---

### Source des demandes
- Enum `OrderSource` : `SITE` / `ADMIN` / `WHATSAPP` / `TELEPHONE` / `AUTRE`
- Affichage simplifié partout : `SITE` → "Site web" (vert), tout le reste → "Manuel" (orange)
- Visible : tableau requests, tableau dashboard, panel RequestPanel, export Excel, toasts/notifs

---

### Sécurité (fixes critiques)
- `PATCH /api/products/[id]` et `DELETE /api/products/[id]` : auth commentée → **restaurée + check rôle ADMIN**
- `DELETE /api/users/[id]` et `PATCH /api/users/[id]` : vérification rôle ADMIN ajoutée (avant : n'importe quel employé connecté pouvait supprimer/modifier des utilisateurs)

---

### Prices produits (script one-shot)
```bash
npx tsx scripts/seed-prices.ts
```
Met à jour les prix : 57/30=43, 57/40=80, 57/50=90, 80/60=140, 80/80=200, 80/75=0

---

## .env à partager (ne jamais commit)
```
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```
Le collègue fait : `npm install` → copie le `.env` → `npx prisma generate` → migrations ci-dessus → `npm run dev`

---

## Bugs corrigés en cours de session

- **`OrderSource.ADMIN` non reconnu** : valeur présente dans `schema.prisma` mais client Prisma jamais regénéré → `prisma.order.create()` crashait avec `Invalid value for argument source`. Fix : `npx prisma generate` (après avoir arrêté le serveur). **À faire systématiquement après tout changement de schéma.**

---

## Ce qui reste à faire
- [ ] Page `/admin/content` — gestion des templates WA/MAIL (CRUD) à finaliser
- [x] Notifications dans le header admin (cloche) ✓
- [x] Restriction par rôle sur les pages admin ✓ (produits + users sécurisés)
- [x] Création commande admin fonctionnelle ✓
- [ ] Tests end-to-end avec le collègue (workflow commande complète)
