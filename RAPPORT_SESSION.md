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

---

### Temps réel (SSE)
- Le dashboard et la page demandes se mettent à jour **automatiquement** quand une nouvelle commande/devis arrive — sans refresh, sans polling
- Fonctionne via `EventSource` → `/api/sse` → notifié depuis les routes POST orders/quotes

---

### Dashboard (`/admin/dashboard`)
- **4 cartes** : stats du mois + top 3 produits (donut) + **origine des demandes** (nouveau)
- Carte "Origine" : barre empilée + légende Site web / Manuel / WhatsApp / Téléphone avec %
- Clic sur une ligne du tableau → ouvre le panel avec toutes les actions
- Bouton **Excel** pour exporter le tableau

---

### Clients (`/admin/clients`)
- Un client apparaît dès qu'il a **au moins une commande** (avant : seulement si VALIDE)
- Les **refs** dans l'historique sont les vraies refs (`CMD-16-0001`) — plus les IDs tronqués
- Historique complet : toutes les commandes + devis, tous statuts

---

### Panel demande (`RequestPanel`)
- Workflow commande : `En attente → Contacté → Confirmé → Livré`
- Workflow devis : `En attente → Contacté → Valider → Commande`
- Boutons contact : WA (rond vert), Tel (rond bleu), MAIL (stroke orange)
- WA / MAIL ouvrent un **popover de templates** : liste → édition → envoi
- **PDF impression** : facture N&B pro avec logo PSI en haut
- **Export Excel** : facture structurée par commande

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
- Créations depuis le site public → `SITE`, depuis l'admin → `ADMIN`
- Visible dans le dashboard (carte Origine) et dans l'export ventes

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

## Ce qui reste à faire
- [ ] Page `/admin/content` — gestion des templates WA/MAIL (CRUD)
- [ ] Notifications dans le header admin (cloche)
- [ ] Restriction par rôle sur les pages admin
