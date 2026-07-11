TODO LIST — ce qui reste à faire

DÉCISIONS ACTÉES (P1) :
- Devis livré = vente → devis chiffrables, comptent dans le CA (comme les commandes livrées)
- Assignation = permission décochable `assign_commandes`, off par défaut sauf admins
- Real-time PARTOUT (listes, dashboard, fiche client, cloche) — aucun rechargement visible
- Commune = select filtré selon la wilaya + saisie libre possible
- Catégories : page /products dédiée ET filtre in-place sur l'accueil (select cat → produits s'affichent, même page)

═══════════════════════════════════════════════════════════
🔴 PRIORITÉ 1 — Logique métier core  (EN COURS — on traite ça d'abord)
═══════════════════════════════════════════════════════════

## 1.1 — Séparer Devis et Commandes
- [ ] Supprimer le bouton "Convertir en commande" partout (UI + route /api/quotes/[id]/convert)
- [ ] Cycle Devis   : En attente → Confirmé → Livré → Annulé (indépendant)
- [ ] Cycle Commande: En attente → Confirmé → Livré → Annulé
- [ ] Devis chiffrable : prix par ligne (ou proposedPrice) obligatoire avant de passer "Livré"
- [ ] Stats dashboard : CA = commandes LIVRÉES + devis LIVRÉS
- [ ] Nettoyer le champ convertedOrderId / la logique de conversion

## 1.2 — Champ "Pris en charge par" (assignation)
- [ ] Colonne assignedToId (userId nullable) sur Order ET Quote + migration
- [ ] Nouvelle permission `assign_commandes` (décochable, off par défaut sauf admin)
- [ ] Dropdown dans formulaires création/édition : pré-rempli = utilisateur connecté, modifiable si permission
- [ ] Afficher le nom de l'assigné dans le panneau de détail + dans les listes
- [ ] Filtre "assigné à" dans les listes commandes/devis
- [ ] Notif à l'assigné quand on lui assigne une demande (voir P3)

## 1.3 — Wilayas + Communes
- [ ] Fichier lib/data/wilayas-communes.ts (58 wilayas + communes)
- [ ] Champ Wilaya = select des 58 wilayas
- [ ] Champ Commune = select filtré selon la wilaya, trié alpha, + saisie libre
- [ ] Ajouter colonne `commune` sur Client (et snapshots order/quote si besoin)
- [ ] Appliquer sur : checkout public, devis public, création commande manuelle admin, fiche client
- [ ] Migrer les données existantes si besoin

## 1.4 — Catégories refondues
- [ ] Colonne `photo` sur la table Category + migration
- [ ] Admin → Produits/Catégories : upload photo par catégorie
- [ ] Accueil (/) : sélecteur de catégorie (cards/onglets) → produits de la cat s'affichent sur la même page (filtre in-place, pas de navigation)
- [ ] Page /products : cards catégories (photo + nom) → produits en dessous ; product card = référence + "Ajouter au panier" (pas de photo produit ici)

## 1.5 — Real-time PARTOUT (aucun rechargement visible)
- [ ] Liste commandes/devis (/admin/requests) : nouvelle demande + changement statut en direct
- [ ] Dashboard : stats + camembert recalculés en direct
- [ ] Fiche client : historique à jour en direct
- [ ] Cloche notifications : compteur + toast fluides, sans clignotement
(à câbler EN DERNIER, une fois que 1.1→1.4 sont posés)


# 🟠 PRIORITÉ 2 — Dashboard & Stats
## Nouvelles statistiques dashboard

Carte "Commandes ce mois" avec évolution vs mois précédent (%)
Carte "Devis en attente" (nombre + montant estimé)
Carte "Clients qui ont recommandé et nouveauc clienrt s
Graphique barres : commandes par wilaya (top 10)
Graphique ligne : évolution commandes/devis sur 6 mois
Tableau "Employés actifs" : qui a créé combien de commandes ce mois
Conserver le camembert produits existant

## Page commande rapide mobile  - Page clients sur mobile 
Route /admin/quick-order et une ausi pour kes clients 
Accessible depuis sidebar (icône visible sur mobile)
Layout optimisé mobile : steps simples (1. Client → 2. Produits → 3. Résumé → 4. Valider) et celle des clients je veux plutot pouvpir vois la liste et cliquer voir detail et tout comme ca neout cliquer su rtel appeler direct et envyer mails ou whtatsapp 
Recherche client existant ou création rapide (nom + tel + wilaya)
Ajout produits avec quantité
Pas de TVA par défaut (checkbox pour l'activer)
Submit → commande créée, redirect vers son détail
notifs sur le tel de creation et tt quand cesty fait 


# 🟡 PRIORITÉ 3 — Notifications & Emails
## Revue des notifications in-app

Vérifier que TOUTES ces actions génèrent une notif : nouvelle commande site, nouvelle commande manuelle, changement statut, assignation changée, nouveau devis, nouveau message contact
Celui qui fait l'action js si il recoit ou pas en vrai 
Notif quand une commande est assignée à quelqu'un → seul l'assigné reçoit
Emails automatiques

Setup nodemailer ou Resend (recommandé pour Vercel) — variable EMAIL_FROM dans .env
Email récap quotidien (envoyé chaque matin à 8h) : liste commandes/devis du jour précédent avec statut
Email récap hebdomadaire (lundi matin) : bilan semaine — total commandes, total devis, statuts
Destinataires : tous les admins (configurable)
Cron job via Vercel Cron (vercel.json) ou service externe (Trigger.dev)
Template HTML propre avec logo PSI, tableau des commandes, lien vers l'admin

# 🟢 PRIORITÉ 4 — Site public arabe
## Bouton AR/FR

Fichiers de traduction lib/i18n/fr.ts et lib/i18n/ar.ts
Bouton toggle dans le header public (FR | AR)
State stocké dans localStorage
Direction RTL automatique quand AR (dir="rtl" sur <html>)
Traduire : navigation, hero, sections produits, formulaires checkout/devis/contact, messages d'erreur
Les noms de produits et descriptions restent tels quels (données admin, pas traduts)
  
# 🔵 PRIORITÉ 5 — Sécurité

Rate limiting sur les routes API publiques (/api/orders, /api/quotes, /api/contact) — max 10 req/min par IP
Rate limiting sur /api/auth/login — max 5 tentatives/15min
Headers sécurité Next.js (next.config.js) : CSP, X-Frame-Options, HSTS
Validation Zod sur tous les inputs côté serveur (revoir les routes qui n'ont que du JS basique)
Logs d'audit pour les connexions échouées
Vérifier que les tokens de session expirent bien (sessionVersion déjà en place — tester)
Sanitize les champs texte libre (notes, messages contact) contre XSS


 # PRIORITÉ 6 — Vérifications exports & factures

Vérifier que le PDF commande contient : référence, date, client complet (wilaya + commune), lignes produits, prix HT, TVA si applicable, total TTC, "pris en charge par", confieer avec radja 
Excel rapport ventes : ajouter colonnes "Commune", "Assigné à", "Wilaya"
Excel export tableau : même ajouts
Tester les filtres combinés (statut + période + recherche + assigné) — vérifier qu'ils se combinent bien
Vérifier les raccourcis WhatsApp/Email/Appel dans le détail client avec un vrai numéro algérien (+213)



# PSI — Guide de tests complet

Guide pour tester **toute l'application** avant de livrer. On suit les sections dans l'ordre, workflow par workflow.
Ce qui est neuf ou corrigé récemment est signalé par ⚠️ / **(nouveau)**.

---

## 🚀 1. Démarrer l'app

```bash
# Terminal 1 — le serveur
npm run dev
# → note la ligne  Network: http://192.168.X.X:3000  (pour tester depuis un téléphone)

# Terminal 2 — garder la base réveillée
node keep-alive.mjs
```

⚠️ Lance le **keep-alive AVANT ta démo** et laisse la fenêtre ouverte → la base ne s'endort jamais pendant la présentation.

Le **site public** est sur `/` — le **back-office** sur `/admin`.

---

## 🔑 2. Les comptes (seed de production)

Mot de passe pour **tous** : `psi2026`

| Compte | Rôle | Ce qu'il peut faire |
|---|---|---|
| `admin1@psi.dz` | Admin | **Tout** (toutes les permissions) |
| `admin2@psi.dz` | Admin | **Tout** (2ᵉ admin pour tester les notifications) |
| `employe1@psi.dz` | Employé complet | Voir + modifier commandes, clients, produits |
| `employe2@psi.dz` | Employé limité | **Lecture seule** (voir commandes / clients / produits) |

> Base de prod = **sans** clients/commandes/devis (à créer via l'app).
> Base de démo (`seed.ts`) = comptes différents (`admin@psi.dz` / `password`, `amira@psi.dz`…) avec données d'exemple.

---

# ══════════════ SITE PUBLIC ══════════════

## 🌐 3. Accueil & catalogue (`/`)

1. Le **hero** affiche le titre + sous-titre (modifiables depuis l'admin → Contenu)
2. Section **Nos produits** → cartes produits (max 6, bouton "Voir tous les produits" si plus)
3. Les cartes affichent la **photo** du produit si elle existe, sinon le visuel par défaut (cercles verts)
4. Section **Qualité & conformité** (55 gr/m², Allemagne, BPA Free)
5. Section **À propos** (texte modifiable depuis l'admin → Contenu)
6. Boutons CTA → **Demander un devis** / **Nous contacter**
7. `/products` → **tous** les produits du catalogue

---

## 🛒 4. Panier & commande (`/cart` → `/checkout`)

1. Depuis une carte produit → **Ajouter au panier**
2. `/cart` → ajuster les quantités (−/+), retirer une ligne, voir le **récapitulatif** (total)
3. Panier vide → message "Votre panier est vide"
4. **Finaliser la commande** → `/checkout`
5. Remplir : nom *, entreprise, email, téléphone *, wilaya *, adresse
6. Valider → écran **"Commande envoyée !"**
7. ✅ Vérifier côté admin (`/admin/requests`) → la commande apparaît, source **Site web**, statut **En attente**
8. ✅ Un client est créé automatiquement (visible dans `/admin/clients`)

---

## 📝 5. Demande de devis (`/quote`)

1. Remplir les coordonnées (nom *, tél *, wilaya *, email, entreprise)
2. **Produits souhaités** : choisir un produit du catalogue OU **dimension personnalisée** (format libre)
3. **+ Ajouter une ligne** → plusieurs produits dans un même devis
4. Retirer une ligne (bouton poubelle)
5. Message complémentaire (délais, conditions…)
6. Valider → écran **"Demande envoyée !"**
7. ✅ Côté admin → apparaît dans l'onglet **Devis**, source Site web

---

## ✉️ 6. Contact (`/contact`)

1. Adresse / email / téléphone / réseaux sociaux affichés (modifiables via admin → Contenu)
2. Envoyer un message → il arrive côté admin
3. ✅ Un client est créé/rattaché + un **message de contact** est enregistré

---

# ══════════════ BACK-OFFICE ══════════════

## 🔐 7. Connexion (`/admin/login`)

1. Page login **sans la barre latérale** (sidebar)
2. Carte de connexion **grande et centrée**, logo, fond dégradé vert
3. Mauvais identifiants → message d'erreur clair
4. Compte **désactivé** → connexion refusée
5. Bonne connexion → redirige vers le dashboard

---

## 🏠 8. Dashboard (`/admin/dashboard`)

1. Le **post-it jaune** : date du jour, stats du jour, "X livrées ce mois" en bas
2. Le **camembert** : répartition des produits, légende à droite
3. Survol d'un morceau du camembert → **petite carte blanche** qui suit la souris (produit + % + quantité)
4. Carte **Origine** : répartition Site web / Manuel
5. Tableau du bas : dernières demandes → clic sur une ligne = détail
6. ⚡ Faire une commande depuis le site → le dashboard se met à jour **tout seul** (SSE temps réel, sans rafraîchir)

---

## 📋 9. Commandes & devis (`/admin/requests`)

### Filtres et recherche
1. Onglet **Tous** → commandes + devis, en attente en haut, archivés (annulés) en bas
2. Onglet **Commandes** → seulement les commandes
3. Onglet **Devis** → seulement les devis
4. Filtre **statut** (En attente / Confirmé / Livré / Annulé)
5. Changer la **période** (Ce mois / 3 derniers mois / Tout)
6. Recherche par **entreprise** → filtre en direct
7. Recherche par **numéro** (ex "CMD-") → filtre par référence
8. Bouton **Effacer** → remet tous les filtres à zéro

### Créer une demande à la main
1. **+ Nouvelle demande** → choisir **Commande** ou **Devis**
2. Remplir le client (nom, wilaya, téléphone)
3. Choisir un produit → le **prix se remplit tout seul**
4. Ajouter plusieurs lignes (devis multi-lignes)
5. Activer **TVA 19 %** → le total se recalcule (HT → TTC)
6. Valider → apparaît avec le badge **Manuel**

### Le panneau de détail (clic sur une demande)
1. Clic sur une demande → **panneau latéral** s'ouvre
2. Infos client, lignes produits, total
3. **Imprimer / PDF** → génère un document
4. **Exporter Excel** → télécharge la fiche
5. Bouton **WhatsApp** → choisir un **template de message** (variables [Nom]/[Référence]/[Wilaya] remplies) → ouvre WhatsApp
6. Bouton **Email** → même chose avec un template → ouvre la messagerie
7. Bouton **Appeler** → lien téléphone
8. **Notes internes** → écrire une remarque, enregistrer
9. Actions statut (si permission "modifier statuts") :
   - **Commande** : Confirmer → Livrer, ou Annuler → Restaurer
   - **Devis** : Convertir en commande, ou Annuler → Restaurer
   - **Modifier** (commande) → éditer les lignes (produits/quantités)

---

## 🔄 10. Conversion devis → commande (corrigé récemment)

1. Ouvrir un **devis** (en attente ou confirmé)
2. **Convertir en commande** → une vraie commande est créée avec les mêmes lignes
3. ✅ Le devis passe en "converti", la commande apparaît dans l'onglet Commandes
4. ✅ La commande garde le client et les produits du devis

---

## 👥 11. Clients (`/admin/clients`)

1. Tous les clients s'affichent (**même ceux sans commande**)
2. Recherche par nom / entreprise / wilaya
3. Clic sur un client → **fiche** (infos + historique commandes/devis)
4. Clic sur une ligne d'historique → ouvre le détail de cette demande
5. **Modifier** le client (dont la **photo**) → sauvegardé
6. **+ Nouveau client** → apparaît dans la liste
7. **Plusieurs téléphones** par client, chacun avec un label (Principal / Secrétaire / Mobile…)
8. **Notes internes** sur le client
9. **Nouvelle commande** depuis la fiche → client pré-rempli, apparaît dans /requests ET l'historique client
10. **Supprimer** un client → confirmation → il part, ses commandes/devis **restent**
11. ⚠️ Suppression impossible → **message clair** (pas d'erreur brute)

---

## 📦 12. Produits (`/admin/products`)

1. Liste des produits (référence, dimensions, usage, prix, catégorie, statut actif)
2. **+ Nouveau produit** → référence, largeur/longueur, usage, prix, **catégorie**
3. **Photo produit** → cliquer la zone photo → choisir une image → aperçu → enregistrer
4. ✅ La photo apparaît sur le **site public** (`/products`) ; sans photo → visuel par défaut
5. **Champs personnalisés** (Grammage, Origine, BPA Free…) — définis une fois, remplis par produit
6. **Modifier** un produit → changements sauvés
7. **Catégories** : ajouter / gérer
8. **Activer/Désactiver** un produit (un produit inactif n'apparaît plus sur le site)
9. ⚠️ Supprimer un produit **utilisé** dans des commandes → message "Impossible, désactivez-le plutôt"

---

## 📜 13. Historique (`/admin/history`)

1. `/admin/history` → journal des actions (audit log)
2. Recherche texte
3. Filtre par **type** d'action et par **utilisateur**
4. Bouton **Effacer** les filtres
5. Clic sur une ligne liée à une commande/devis → ouvre le détail

---

## 📝 14. Contenu du site (`/admin/content`)

1. **Section Hero** : titre + sous-titre → Enregistrer → visible sur `/`
2. **À propos** : texte → Enregistrer → visible sur `/`
3. **Infos de contact** : adresse, email, téléphone, Facebook, Instagram → visible sur `/contact`
4. Chaque bloc a son bouton **Enregistrer** (avec état "enregistré ✓")

---

## 👤 15. Utilisateurs (Admin seulement — `/admin/users`)

1. Liste des comptes (rôle, statut actif)
2. **+ Nouveau compte** → nom, email, mot de passe (bouton **générer** un mot de passe)
3. Cocher les **permissions** une par une (ou "Tout" / "Aucun")
4. Créer → écran **"Compte créé"** avec les identifiants **copiables**
5. ✅ Les autres admins reçoivent une **notification**
6. **Rôles personnalisés** : "+ Ajouter un rôle" → nom + set de permissions réutilisable
7. **Modifier** un compte (rôle, permissions, activer/désactiver)
8. **Désactiver** un compte → il ne peut plus se connecter
9. ⚠️ Impossible de supprimer **son propre compte** → refusé avec message
10. ⚠️ Supprimer un user qui a créé des commandes/notes → "Impossible, désactivez-le plutôt"

### Changer les permissions d'un employé existant
1. En admin → **Utilisateurs** → clic sur **Employé Limité** → Modifier
2. Cocher une permission (ex "Modifier les produits") → Enregistrer
3. Dans la session de l'employé → **se déconnecter / reconnecter**
4. ⚠️ Après reconnexion → nouveaux menus/boutons apparaissent
   *(le changement n'est PAS instantané dans une session ouverte — reconnexion nécessaire, c'est normal)*

---

## 🙋 16. Mon profil (`/admin/profile`)

1. **Informations personnelles** (nom, téléphone…) → Enregistrer
2. **Changer le mot de passe** : ancien + nouveau (min. 6) + confirmation
3. Boutons œil pour afficher/masquer les mots de passe
4. Mauvais ancien mot de passe → refusé

---

## 🔔 17. Notifications (tester avec 2 comptes ouverts)

Ouvre `admin1` dans un navigateur et `admin2` (ou un employé) dans un autre (ou navigation privée).

1. Un **toast** apparaît en haut à droite quand il y a du nouveau (SSE temps réel)
2. Le toast disparaît après quelques secondes (ou au clic)
3. La **cloche** montre le nombre de non-lus
4. Panneau : les non-lus ont un fond coloré
5. Clic sur une notif → passe en **lue**
6. **Tout marquer lu** → la cloche se vide
7. Quand l'**Employé** agit → l'**Admin** reçoit la notif
8. Quand l'**Admin** agit → l'**Employé** reçoit la notif
9. Nouvelle commande/devis depuis le **site** → tout le monde est notifié
10. ⚠️ Celui qui fait l'action ne reçoit **jamais** sa propre notif
11. Page dédiée `/admin/notifications` → historique complet

---

## 📊 18. Exports Excel

**Rapport de ventes** (`/admin/requests`) :
1. Bouton **Rapport de ventes** → fichier `.xlsx`
2. Contient seulement les commandes **Livrées**
3. Une ligne par produit + colonne **Source** (Site web / Manuel)
4. Ligne **TOTAL** en bas

**Export du tableau** :
1. Filtrer puis **Exporter** → télécharge le tableau tel qu'affiché
2. Vérifier colonnes + récap en bas

---

## 🎫 19. Permissions employé (bien tester)

Se connecter en **`employe2@psi.dz`** (limité) et comparer avec **`admin1@psi.dz`** :

1. **Sidebar** → l'employé limité voit **moins de menus** (pas Produits en édition / Contenu / Utilisateurs)
2. **Produits** → l'employé sans "modifier produits" ne voit **pas** Nouveau/Modifier/Supprimer
3. **Commande** → l'employé sans "modifier statuts" ne voit **pas** Confirmer/Livrer/Annuler/Modifier
4. **Contenu** / **Utilisateurs** → invisibles pour l'employé limité
5. L'**admin** voit et peut **TOUT**

👉 Comparaison clé : `employe2` (limité) doit clairement pouvoir faire **moins** que `admin1`.

---

## 🔒 20. Sécurité (corrigé récemment)

1. En **Employé**, essayer de modifier/supprimer un produit → **403**
2. En **Employé**, essayer de supprimer un utilisateur → **403**
3. **Non connecté**, appeler `/api/orders` → **401**
4. **Non connecté**, créer/supprimer une catégorie → **refusé** ⚠️ *(avant : ouvert à tous — corrigé)*
5. **Test API direct** : même en connaissant l'URL, l'employé est bloqué (403) sur une action interdite
6. Modifier les permissions d'un user → tous ses cookies de session sont invalidés (`sessionVersion`)

---

## 🗑️ 21. Suppressions — vérifier les messages (important)

1. Produit **non utilisé** → suppression marche
2. Produit **déjà dans des commandes** → "Impossible : produit utilisé, désactivez-le plutôt"
3. **Catégorie** contenant des produits → "Impossible : X produits dans cette catégorie"
4. **Utilisateur** ayant créé commandes/notes → "Impossible, désactivez-le plutôt"
5. Son **propre compte** → refusé
6. **Client** (même avec messages de contact) → doit marcher

---

## ✅ 22. Avant de livrer — check final

1. Toutes les sections ci-dessus testées
2. Aucune erreur rouge dans le terminal du serveur
3. `npx next build` passe sans erreur
4. Notifications OK entre 2 comptes (SSE temps réel)
5. Supprimer un client ne casse pas ses commandes
6. Permissions employé fonctionnent (limité ≠ admin)
7. Modifier une commande (quantités/produits) marche
8. Conversion devis → commande marche
9. Photos produits visibles sur le site public
10. Page login sans sidebar + agrandie
11. La base contient les 4 comptes (2 admins + 2 employés)
12. Commande/devis depuis le site → apparaît côté admin + client créé

---

## 📌 Rappel — les statuts possibles

- **Commande** : En attente → Confirmé → Livré (ou → Annulé → Restaurer)
- **Devis** : En attente → Confirmé → Converti en commande (ou → Annulé → Restaurer)
- **Contact** : En attente → Traité
- **Sources** : Site web · Manuel (Admin / WhatsApp / Téléphone / Autre)
