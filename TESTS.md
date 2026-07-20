
Email	Rôle
admin1@psi.dz	Admin (tout) — utilise celui-là
admin2@psi.dz	Admin (2e, pour tester notifs à 2)
employe1@psi.dz	Employé complet
employe2@psi.dz	Employé limité (lecture seule)

═══════════════════════════════════════════════════════════
🟠 PRIORITÉ 9 — Retours entreprise (réunion)  🔨 À FAIRE
═══════════════════════════════════════════════════════════

## 9.1 — Emails : simplifier + vrai expéditeur  ✅ FAIT (config Microsoft à finaliser)
- [x] SUPPRIMER l'email quotidien (récap journalier) → job trigger désactivé
- [x] Garder UNIQUEMENT le récap HEBDOMADAIRE → cron jeudi 23h59 (`59 23 * * 4`)
- [x] Vrai email entreprise = **Contact@psi.dz** (expéditeur EMAIL_FROM + affiché partout)
- [x] Config SMTP passée sur **Outlook / Office 365** (smtp.office365.com:587) — vars SMTP_USER/SMTP_PASS/SMTP_PROVIDER
- [x] 8.5 — Emails auto à la création d'un compte (bienvenue + récap admins) codés + stylés

═══════════════════════════════════════════════════════════════════════
📧 À DONNER À L'ADMIN MICROSOFT 365 DE L'ENTREPRISE (à faire par eux)
═══════════════════════════════════════════════════════════════════════
> PROBLÈME : notre app envoie les emails automatiques (récap hebdo, bienvenue
> nouveau compte…) DEPUIS Contact@psi.dz. Aujourd'hui Microsoft REFUSE l'envoi
> (erreur "535 5.7.3 Authentication unsuccessful") car "SMTP AUTH" est désactivé
> par défaut sur Office 365. Il faut l'activer pour ce compte.
>
> ⚠️ Il faut être ADMINISTRATEUR du domaine psi.dz dans Microsoft 365.

ÉTAPE 1 — Activer SMTP AUTH pour le compte Contact@psi.dz :
  1. Aller sur https://admin.microsoft.com (connexion avec un compte ADMIN)
  2. Utilisateurs → Utilisateurs actifs → cliquer sur "Contact@psi.dz"
  3. Onglet "Courrier" (Mail) → "Gérer les applications de messagerie"
  4. Cocher "SMTP authentifié" (Authenticated SMTP) → Enregistrer
  5. Patienter jusqu'à 1h (délai de prise en compte Microsoft)

ÉTAPE 2 — Si l'option n'y est pas, l'activer au niveau organisation :
  1. admin.microsoft.com → Paramètres → Paramètres de l'organisation → Services
  2. Ouvrir "SMTP authentifié" → cocher "Activer" → Enregistrer

ÉTAPE 3 — Si le compte a la double authentification (MFA/2FA) :
  - Le mot de passe normal NE marchera PAS en SMTP.
  - Générer un "mot de passe d'application" : account.microsoft.com/security
    → Options de sécurité avancées → Mots de passe d'application
  - Nous communiquer ce mot de passe (il remplacera SMTP_PASS dans la config).

DONNÉES DE CONNEXION UTILISÉES PAR L'APP (déjà configurées côté code) :
  - Serveur SMTP : smtp.office365.com   Port : 587   Sécurité : STARTTLS
  - Utilisateur : Contact@psi.dz        Mot de passe : (celui du compte / app password)

✅ VÉRIFICATION une fois activé : nous relancerons un test d'envoi → si un email
   de test arrive, c'est bon. (Le code est déjà prêt, rien d'autre à faire côté app.)
═══════════════════════════════════════════════════════════════════════

## 9.2 — Export / impression fiche client
- [ ] Bouton export sur la fiche client → **PDF ET Excel** (les 2 formats)
- [ ] Contenu = TOUTE la fiche : infos client + historique complet (commandes + devis)

## 9.3 — Segmentation des clients par secteur d'activité
- [ ] Un client = **UN secteur** (pharmacie, banque, restaurant, commerce…) via un dropdown
- [ ] Les secteurs sont **gérables depuis le dashboard** (créer/éditer/supprimer, comme les catégories)
- [ ] Champ secteur dans le formulaire client (création + édition) + affiché dans la fiche
- [ ] (base pour cibler des clients plus tard, mais SANS les mails promo — voir décision)
- [ ] ❌ Mails promotionnels : ABANDONNÉ (on ne fait pas)

## 9.4 — Champ "longueur / métrage" (facultatif) PARTOUT
- [ ] Champ **longueur en mètres FACULTATIF** ajouté partout :
      · lignes de commande/devis · produits (admin) · produit sur le SITE public · exports Excel
- [ ] Affichage type : `80 · diam 80 · métrage (facultatif)`

## 9.5 — Référence libre dans les COMMANDES (pas que les devis)  ✅ FAIT
- [x] Le dropdown référence des commandes → option "Référence libre" activée (allowFree pour commande ET devis)

## 9.6 — Bouton "+ Nouvelle commande" → renommer "+ Nouveau"  ✅ FAIT
- [x] Le bouton de la page Commandes affiche juste "+ Nouveau"

## 9.7 — Numéro auto par référence produit (préfixe = catégorie)
- [ ] Chaque catégorie a un **préfixe** (ex: Papier thermique → PTT, Imprimantes → IMP)
- [ ] À la création d'un produit → code auto-incrémenté : PTT-001, PTT-002… / IMP-001…
- [ ] Le préfixe change selon la catégorie choisie

## 9.8 — Nom de produit éditable  ✅ FAIT
- [x] Champ `name` (facultatif) sur Product + migration (p9_products_sectors_metrage)
- [x] Champ "Nom du produit" dans le formulaire produit (création + édition) → modifiable
- [x] API products POST/PATCH acceptent `name`
> Migration p9 couvre aussi : Product.metrage, Category.prefix/refCounter, OrderItem/QuoteItem.metrage,
> Client.sectorId + table Sector, OrderItem.productId/description (pour 9.3/9.4/9.5/9.7 à venir).

## 9.9 — Excel : pas de cases vides + colonnes + export dashboard
- [ ] Commande à plusieurs références → **répéter les infos de commande sur CHAQUE ligne** (client, wilaya, date…) au lieu de laisser vide, seule la réf change
- [ ] Ajouter colonnes : **wilaya, catégorie produit, référence** (+ métrage — voir 9.4)
- [ ] Pouvoir **exporter le DASHBOARD** (les stats) en Excel


TODO LIST — ce qui reste à faire

DÉCISIONS ACTÉES (P1) :
- Devis livré = vente → devis chiffrables, comptent dans le CA (comme les commandes livrées)
- Assignation = permission décochable `assign_commandes`, off par défaut sauf admins
- Real-time PARTOUT (listes, dashboard, fiche client, cloche) — aucun rechargement visible
- Commune = select filtré selon la wilaya + saisie libre possible
- Catégories : page /products dédiée ET filtre in-place sur l'accueil (select cat → produits s'affichent, même page)


═══════════════════════════════════════════════════════════
# 🟤 PRIORITÉ 8 — Lien commande ↔ client  🔨 EN COURS
═══════════════════════════════════════════════════════════

## 8.1 — Autocomplete client sur le champ Nom (formulaire commande/devis)  ✅ FAIT
- [x] API clients : mode léger `?light=true` (id, name, company, phone, wilaya, commune, email) accessible avec `voir_commandes`
- [x] Composant `ClientAutocomplete` : champ "Nom" → taper → liste des clients existants → choisir
- [x] Choisir un client → pré-remplit entreprise, téléphone, wilaya, commune, email
- [x] Ne rien choisir + taper = nouveau client (comportement actuel conservé)
- [x] Appliqué partout : commande + devis, mobile + web (même CreateForm)

## 8.2 — Ré-assigner une commande/devis à un autre client  ✅ FAIT
- [x] Détail commande/devis → bouton "Changer de client" (visible si permission, sauf si archivé)
- [x] Nouvelle permission `reassigner_client` (permissions.ts + users page + seed-prod admins)
- [x] PATCH orders/quotes accepte `clientId` (gardé par la permission → 403 sinon)
- [x] Après ré-assignation → refetch, l'historique des 2 clients est à jour

## 8.3 — Suppression client = DÉSACTIVATION (pas de vraie suppression)  ✅ FAIT
> Un employé ne "supprime" pas vraiment un client : il le DÉSACTIVE. L'historique n'est JAMAIS perdu.
- [x] Colonnes `active`, `deactivatedReason`, `deactivatedById`, `deactivatedAt` sur Client + migration (client_deactivation)
- [x] "Supprimer" un client → boîte avec **motif OBLIGATOIRE**
- [x] Le client passe en **désactivé** → commandes/devis + historique intacts
- [x] Les **admins reçoivent une notif** : "X a désactivé le client Y — motif : …"
- [x] Fiche du client désactivé : bandeau orange avec motif + qui/quand
- [x] Admin peut **réactiver** OU **supprimer définitivement** (confirmation)
- [x] Clients désactivés masqués par défaut (API ?inactifs=true pour les inclure)

## 8.4 — Notes commande/devis = fil horodaté avec auteur  ✅ FAIT
- [x] Table `RequestNote` (order/quote + auteur + date) + migration (request_notes)
- [x] API notes orders + quotes (GET fil, POST ajouter)
- [x] Panneau détail : fil de notes (chaque note = texte + nom auteur + date), bouton "Notes (n)"
- [x] Ne pas écraser : on ajoute, l'historique reste

## 8.5 — Emails automatiques à la création d'un compte user  🔨 À FAIRE
> À la création d'un compte : on remplit l'email du user → 2 emails partent automatiquement.
- [ ] Formulaire création user : champ **email obligatoire** (déjà là, à confirmer)
- [ ] Email n°1 → aux **ADMINS** : récap du compte créé (nom, email, rôle, identifiants)
- [ ] Email n°2 → au **NOUVEL UTILISATEUR** (son email) : message de **bienvenue** + son **mot de passe** pour se connecter + lien vers l'admin
- [ ] Utiliser le setup email existant (nodemailer / Resient — voir P3) — variable EMAIL_FROM
- [ ] Gérer le cas email invalide / envoi échoué (le compte est quand même créé)

## 8.6 — Affiner les templates de messages  🔨 À FAIRE
> Les templates WhatsApp/Email existent mais sont basiques. À revoir : contenu, variables, organisation.
- [ ] Revoir/enrichir le contenu des templates existants (confirmation, relance, livraison, devis…)
- [ ] Vérifier toutes les variables : [Nom], [Référence], [Wilaya], [Récapitulatif], [Agent] — cohérentes partout
- [ ] Gérer les templates depuis l'admin (créer/éditer/supprimer) proprement si pas déjà le cas
- [ ] Templates adaptés au contexte : niveau client (fiche) vs niveau commande (détail)


═══════════════════════════════════════════════════════════
🔴 PRIORITÉ 1 — Logique métier core  (EN COURS — on traite ça d'abord)
═══════════════════════════════════════════════════════════

## 1.1 — Séparer Devis et Commandes  ✅ FAIT
- [x] Supprimer le bouton "Convertir en commande" partout (UI + route /api/quotes/[id]/convert)
- [x] Cycle Devis   : En attente → Confirmé → Livré → Annulé (indépendant)
- [x] Cycle Commande: En attente → Confirmé → Livré → Annulé
- [x] Devis chiffrable : prix (proposedPrice) saisi via popup au moment de CONFIRMER le devis
- [x] Stats dashboard : livrées ce mois = commandes LIVRÉES + devis LIVRÉS
- [x] Nettoyer convertedOrderId : migration DB (colonne supprimée) + code
  → tests détaillés dans la section « 10. Cycle des devis » ci-dessous

## 1.2 — Champ "Pris en charge par" (assignation)  ✅ FAIT
- [x] Colonne assignedToId (userId nullable) sur Order ET Quote + migration (add_assigned_to)
- [x] Nouvelle permission `assign_commandes` (décochable, off par défaut sauf admin)
- [x] Dropdown dans formulaire création : pré-rempli = utilisateur connecté, modifiable
- [x] Panneau détail : select assigné (si permission) sinon lecture seule + colonne "Responsable" dans la liste
- [x] Filtre "assigné à" dans les listes (+ option "Non assigné")
- [x] Notif à l'assigné quand on lui assigne une demande (seul l'assigné reçoit)
  → tests détaillés dans la section « 10bis. Assignation » ci-dessous

## 1.3 — Wilayas + Communes  ✅ FAIT
- [x] Fichier lib/data/wilayas-communes.ts (58 wilayas + communes officielles)
- [x] Champ Wilaya = select des 58 wilayas (WilayaSelect existant)
- [x] Champ Commune = CommuneSelect filtré selon la wilaya, trié alpha, + saisie libre
- [x] Colonne `commune` sur Client + migration (add_client_commune)
- [x] Appliqué sur : checkout public, devis public, création manuelle admin, ajout/édition client
- [x] Commune affichée dans la fiche client (à côté de la wilaya)
  → changer de wilaya réinitialise la commune ; commune absente = saisie libre (Entrée ou « Utiliser … »)

## 1.4 — Catégories refondues / Produits  ⚠️ À REFAIRE (par le collègue)
> Cette partie a été codée puis remise À FAIRE : le collègue la reprend de zéro.
> Ne pas se fier à l'existant côté produits/catégories —
 à revoir entièrement.
- [ ] Colonne `photo` sur la table Category (+ migration si repris)
- [ ] API categories : POST/PATCH acceptent `photo` ; GET renvoie photo + nb produits
- [ ] Admin → Produits/Catégories : cards catégorie avec upload/retrait photo, ajout/suppression
- [ ] Composant d'affichage : cards catégorie (photo+nom) → produits de la cat (filtre in-place)
- [ ] Accueil (/) : sélecteur de catégorie → produits sur la même page
- [ ] Page /products : cards catégories + produits ; product card = réf + dimensions + "Ajouter au panier"

## 1.5 — Real-time PARTOUT (aucun rechargement visible)  ✅ FAIT
- [x] Fetch en 2 modes : chargement initial (spinner) vs refetch SSE **silencieux** (silent=true) → plus de clignotement
- [x] Liste commandes/devis (/admin/requests) : refetch silencieux sur SSE + après chaque action
- [x] Dashboard : stats + camembert recalculés en silencieux sur SSE
- [x] Fiche client (/admin/clients) : SSE ajouté, historique à jour en direct sans spinner
- [x] Cloche notifications : incrémentale (déjà OK) + toast ciblé (targetUserId → seul l'assigné voit le toast)
(Priorité 1 TERMINÉE ✅)


# 🟠 PRIORITÉ 2 — Dashboard & Stats

## 2.1 — Nouvelles statistiques dashboard  ✅ FAIT
- [x] Carte "Commandes ce mois" avec évolution vs mois précédent (% ▲/▼)
- [x] Carte "Devis en attente" (nombre + montant estimé via proposedPrice)
- [x] Graphique barres : commandes par wilaya (top 10) — Recharts
- [x] Graphique ligne : évolution commandes/devis sur 6 mois — Recharts
- [x] Tableau "Employés actifs" : commandes créées ce mois par employé (barres)
- [x] Camembert produits + carte Origine conservés
- [x] ⚡ Recharts chargé en dynamic (ssr:false) → n'alourdit QUE le dashboard, jamais le site public
- [ ] (reporté) Carte "clients qui ont recommandé / nouveaux clients" — à préciser

## 2.2 — Mobile : accès terrain  🔨 EN COURS

PRINCIPE : PAS de pages dupliquées. Ce sont les MÊMES pages web, rendues responsive.
Le "mobile" = un layout adapté + un menu d'accueil qui pointe vers ces pages. Zéro maintenance en double.

- [x] Layout admin responsive : sur mobile, sidebar → menu hamburger (☰), contenu pleine largeur
- [x] Login sur mobile → atterrit sur le **menu d'accueil mobile** (`/admin/mobile`)
- [x] Menu mobile = 1 bouton rond "+" (nouvelle commande → `/admin/quick-order`) + 2 rectangles (Clients, Commandes)
      → Notifications retiré (déjà dans la cloche du header)
- [x] Dashboard + pages non-terrain (produits, contenu, users, historique) → **bloqués sur mobile** (message + retour menu)
- [x] Clients responsive : cartes compactes + fiche → gros boutons **Appeler / WhatsApp / Mail**
- [x] Commande rapide (`/admin/quick-order`) : formulaire seul (inline, pas de tableau) → écran "créée"
- [x] Commandes/devis responsive : titre "Commandes", tableau scrollable, filtres empilés, exports cachés sur mobile
- [x] Panneau détail commande responsive (pleine largeur, footer qui wrappe)
- [x] Message de confirmation type facture (template WhatsApp/Email avec [Récapitulatif])
- [x] Login : message "Identifiant ou mot de passe incorrect" + case "Rester connecté" (session 24h glissante)
- [x] Config IP auto (next.config.ts détecte les IP locales) → plus de galère au changement de WiFi
- [x] Fix auth mobile : trustHost, useSecureCookies:false, NEXTAUTH_SECRET généré, NEXTAUTH_URL retiré (dev)
- [x] 🔴 FIX CLAVIER qui se fermait à chaque frappe : SessionProvider refetchOnWindowFocus=false + quick-order client-only + Wrapper non dynamique
- [x] Formulaire : téléphone (chiffres + clavier tel + OBLIGATOIRE), qté/prix (clavier numérique)
- [x] Formulaire : "Pris en charge par" → renommé "Commercial" (partout)
- [x] Devis : référence en dropdown des réfs existantes + option "Référence libre"
- [x] Menu mobile : couleurs pro (bouton rond vert + 2 cartes blanches épurées)
- [x] Fiche client refaite : header (entreprise+lieu / avatar+nom / tél en évidence), 3 boutons contact fins pleine largeur
- [x] Fiche client : WhatsApp → sélecteur de templates (+ option "Écrire sans template")
- [x] Cloche notifications : ne déborde plus sur mobile (pleine largeur contenue)
- [x] Panneau détail : toggle "Site web" réparé + boutons Imprimer/Excel cachés sur mobile
- [ ] Bouton "Modifier" (montant si non défini) dans le panneau détail — à préciser (le Commercial est déjà éditable)
- [ ] ⚠️ AU DÉPLOIEMENT : remettre NEXTAUTH_URL (prod) + useSecureCookies:true (HTTPS)
- [x] ⚠️ Garantie tenue : mêmes composants/pages que le web → aucun code dupliqué


# 🟡 PRIORITÉ 3 — Notifications & Emails  ✅ FAIT
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

## 3bis — Notifications SYSTÈME (vraies notifs sur l'appareil)  🔨 À FAIRE
> Objectif : de vraies notifs de l'OS (comme WhatsApp/Insta) quand nouvelle commande / assignation / etc.
> Aujourd'hui : notifs seulement IN-APP (cloche + toast, visibles si l'app est ouverte).
> ⚠️ Le vrai test se fait EN PROD (HTTPS requis). Redéployer = git push (Vercel auto ~2 min).

DEUX OPTIONS (à décider au moment de coder) :

### Option A — Notification API (simple, app/onglet ouvert)
- [ ] Demander la permission "Autoriser les notifications" (1 fois)
- [ ] Sur event SSE (déjà en place) → `new Notification(titre, { body, icon })`
- [ ] Marche PC + Android quand l'onglet est ouvert (même minimisé)
- [ ] ❌ Ne marche PAS si le navigateur est fermé
- [ ] Léger : pas de Service Worker, pas de migration, testable en LOCAL

### Option B — Web Push complet (app fermée)  ← la vraie solution "pro"
- [ ] Service Worker `public/sw.js`
- [ ] Lib `web-push` + génération clés VAPID (.env : VAPID_PUBLIC / VAPID_PRIVATE)
- [ ] Table `PushSubscription` (userId, endpoint, keys) + migration
- [ ] Route API `/api/push/subscribe` (s'abonner) + `/api/push/unsubscribe`
- [ ] Bouton "Activer les notifications" dans l'admin (profil ou header)
- [ ] Brancher l'envoi push là où on fait déjà `createNotif` (notifications.ts / notify-activity.ts)
- [ ] Notif reçue même app/navigateur FERMÉ (Android + PC direct)
- [ ] ⚠️ iPhone (Safari) : marche seulement si le site est "ajouté à l'écran d'accueil" (PWA)
- [ ] ⚠️ HTTPS obligatoire → testable seulement EN PROD (pas localhost)

DÉCISION À PRENDRE : A puis B, ou directement B.

# 🟢 PRIORITÉ 4 — Site public arabe
## Bouton AR/FR  ✅ FAIT reste traduction auto quand on fais changement du contenu

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


  # PRIORITÉ 6 — Vérifications exports & factures  ✅ FAIT

Vérifier que le PDF commande contient : référence, date, client complet (wilaya + commune), lignes produits, prix HT, TVA si applicable, total TTC, "pris en charge par", confieer avec radja 
Excel rapport ventes : ajouter colonnes "Commune", "Assigné à", "Wilaya"
Excel export tableau : même ajouts
Tester les filtres combinés (statut + période + recherche + assigné) — vérifier qu'ils se combinent bien
Vérifier les raccourcis WhatsApp/Email/Appel dans le détail client avec un vrai numéro algérien (+213)


# 🟣 PRIORITÉ 7 — Retours (site public + dashboard)  🔨 À FAIRE

## 7.1 — Site public : responsive
- [ ] Grille produits (accueil + `/products`) : passer à **2 produits par ligne** sur mobile
- [ ] Page détail produit : le titre + l'image sont trop gros sur mobile → rétrécir l'image et la rendre **cliquable pour l'agrandir** (façon zoom Amazon), ou trouver un autre système compact
- [ ] Filtres des notifs (dashboard) : leur **largeur a rétréci** après les derniers changements → à corriger

## 7.2 — Site public : contenu (hors responsive)
- [ ] Mettre les **bonnes photos** pour l'accueil et les produits
- [ ] Revoir **comment les références produits s'affichent** (à redesigner)

## 7.3 — Dashboard mobile  TERMINÉ ✅ 
- [x] Notifications : panneau **plein écran** sur mobile (avant : débordait) — panneau cloche (TopBar)
- [x] Panneau cloche : filtre "Tous les users" → renommé "Utilisateurs" + ne charge que les notifs des 2 derniers jours
- [x] Page Commandes : toggle "Tous/Commandes/Devis" **pleine largeur** sur mobile (compact sur web)
- [x] Page Commandes : onglets tous de la **même taille** (zone compteur fixe, plus de décalage)
- [x] Page Commandes : recherche + Statut + Ce mois + Responsable → **tous sur la même ligne** (mobile)
- [x] Page Commandes : "Tous les responsables" → juste "Responsable"
- [x] Page Commandes : la page ne **s'élargit plus** en changeant d'onglet (overflow-x-hidden)
- [x] Page Commandes : scrollbar horizontale du tableau **masquée**
- [x] Page Clients : bouton "Nouveau client" poussé à droite (plus collé à la recherche)
- [x] Fiche client : doublon d'en-tête réparé
- [x] Pages inutiles au terrain BLOQUÉES sur mobile : dashboard, produits, contenu, users, historique, **profil** (message + retour menu)
- [x] Autocomplete client (champ Nom) + ré-assignation client → marchent aussi sur mobile

→ MOBILE (7.3) TERMINÉ ✅  (reste juste tes retours ponctuels si tu repères un truc en testant)

## 7.4 — Dashboard web
- [ ] Panneau détail commande : layout "goofy" (trop de gris / boutons à revoir) → nettoyer visuellement
- [ ] Page Produits : ok en l'état ; réfléchir si une section "tous les produits" en plus serait utile (à trancher, pas urgent)
- [ ] Fiche client : réorganiser l'affichage des infos ; envisager un **tableau type "historique"** pour les commandes du client (plus propre que l'actuel)
- [ ] Page Historique : revoir comment les infos s'affichent (même traitement que les notifs) + rendre les lignes **cliquables** (clic sur une ligne commande → ouvre le détail de la commande) — pareil pour les notifs
- [ ] Page Utilisateurs : remplacer l'overlay d'édition par une **édition directe dans le détail** (clic sur un utilisateur → pseudo/email en haut, rôle + permissions en dessous, modifiables sur place) ; le clic sur la **carte** utilisateur (liste) doit juste afficher un aperçu des permissions
- [ ] **Rôles personnalisés réutilisables** : pouvoir créer un rôle nommé (ex "Chef des ventes") avec un set de permissions, pour ne pas re-cocher les permissions à chaque nouvel utilisateur

## 7.5 — Performance : chargement des données par période (fluidifier le site)
> AUJOURD'HUI : la page Commandes charge TOUTES les commandes/devis d'un coop (fetch /api/orders + /api/quotes),
> puis le filtre "Ce mois / 3 mois / Tout" se fait côté CLIENT. OK avec peu de données, lent à grande échelle.
- [ ] API orders/quotes : accepter un paramètre de période (from/to) → ne renvoyer que la période demandée
- [ ] Charger seulement ce qui est affiché (ex : "Ce mois" → charge juste le mois) + pagination si besoin
- [ ] Idem stats dashboard si pertinent
- [ ] But : fluidifier le site quand la base grossit


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
2. Section **Nos produits** → **cards catégories** (photo + nom) + carte **Tout** (nouveau)
3. Cliquer une catégorie → les produits de cette catégorie s'affichent **sur la même page** (pas de rechargement, filtre in-place)
4. Cliquer **Tout** → tous les produits (max 6 sur l'accueil, bouton "Voir tous les produits" si plus)
5. Les cartes produit affichent la **photo** du produit si elle existe, sinon le visuel par défaut (cercles verts)
6. Section **Qualité & conformité** (55 gr/m², Allemagne, BPA Free)
7. Section **À propos** (texte modifiable depuis l'admin → Contenu)
8. Boutons CTA → **Demander un devis** / **Nous contacter**
9. `/products` → **toutes** les catégories + tous les produits (même système de filtre)

---

## 🛒 4. Panier & commande (`/cart` → `/checkout`)

1. Depuis une carte produit → **Ajouter au panier**
2. `/cart` → ajuster les quantités (−/+), retirer une ligne, voir le **récapitulatif** (total)
3. Panier vide → message "Votre panier est vide"
4. **Finaliser la commande** → `/checkout`
5. Remplir : nom *, entreprise, email, téléphone *, wilaya *, **commune** (nouveau), adresse
6. **Commune** (nouveau) → le select ne propose que les communes de la wilaya choisie ; on peut aussi **taper** une commune absente
7. Changer de wilaya → la commune se **réinitialise**
8. Valider → écran **"Commande envoyée !"**
9. ✅ Vérifier côté admin (`/admin/requests`) → la commande apparaît, source **Site web**, statut **En attente**
10. ✅ Un client est créé automatiquement avec **wilaya + commune** (visible dans `/admin/clients`)

---

## 📝 5. Demande de devis (`/quote`)

1. Remplir les coordonnées (nom *, tél *, wilaya *, **commune** nouveau, email, entreprise)
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
7. ⚡ **Aucun clignotement** (nouveau) : la mise à jour temps réel ne fait **pas** réapparaître les "Chargement…" — les chiffres se mettent à jour en douceur

**Nouvelles stats (P2) :**
8. Carte **Commandes ce mois** → nombre + **évolution %** vs mois précédent (▲ vert / ▼ rouge)
9. Carte **Devis en attente** → nombre + **montant estimé** (somme des prix proposés)
10. Graphique **Commandes par wilaya** (barres, top 10) — se charge à l'ouverture ("Chargement du graphique…" bref)
11. Graphique **Évolution sur 6 mois** (courbe commandes vert + devis violet)
12. Tableau **Employés actifs ce mois** (barres par employé, trié)
13. ⚡ **Perf** : ces graphiques (Recharts) ne se chargent **que** sur le dashboard — le site public et les autres pages admin ne sont pas alourdis

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

9. **Filtre "Responsable"** (nouveau) → filtre par personne assignée, + option **Non assigné**

### Créer une demande à la main
1. **+ Nouvelle commande** → choisir **Commande** ou **Devis**
2. **Champ Nom = autocomplete** (nouveau) → taper le début d'un client existant → une liste apparaît → **choisir** → entreprise/téléphone/wilaya/commune/email se **remplissent tout seuls**
3. Ne rien choisir + taper un nouveau nom = **nouveau client** créé (comme avant)
4. Choisir un produit → le **prix se remplit tout seul**
5. Ajouter plusieurs lignes (devis multi-lignes)
6. Activer **TVA 19 %** → le total se recalcule (HT → TTC)
7. **Commercial** (ex-"Pris en charge par") → dropdown pré-rempli sur **soi-même**, modifiable
8. Valider → apparaît avec le badge **Manuel** + la colonne **Responsable** remplie

### Le panneau de détail (clic sur une demande)
1. Clic sur une demande → **panneau latéral** s'ouvre
2. Infos client, lignes produits, total
3. **Imprimer / PDF** → génère un document
4. **Exporter Excel** → télécharge la fiche
5. Bouton **WhatsApp** → choisir un **template de message** (variables [Nom]/[Référence]/[Wilaya] remplies) → ouvre WhatsApp
6. Bouton **Email** → même chose avec un template → ouvre la messagerie
7. Bouton **Appeler** → lien téléphone
8. **Notes internes** → écrire une remarque, enregistrer
9. **Commercial** → si permission "assigner", un select modifie le commercial ; sinon **lecture seule**
10. **Changer de client** (nouveau) → si permission "ré-assigner client", un bouton apparaît en haut du bloc Client → rechercher un autre client → le choisir → la demande passe à ce client (visible dans l'historique du nouveau client)
    - ⚠️ Sans la permission `reassigner_client` → le bouton n'apparaît pas ; via API un PATCH `clientId` → **403**
11. Actions statut (si permission "modifier statuts") :
   - **Commande** : Confirmer → Livrer, ou Annuler → Restaurer
   - **Devis** : Confirmer (popup prix) → Livrer, ou Annuler → Restaurer
   - **Modifier** (commande) → éditer les lignes (produits/quantités)

---

## 🔄 10. Cycle des devis — devis chiffré = vente (nouveau)

⚠️ Il n'y a **plus** de bouton "Convertir en commande". Les devis ont leur propre cycle et un devis **livré** compte comme une vente.

1. Ouvrir un **devis** en **attente** → **Confirmer**
2. ✅ Un **popup demande le prix** (total global OU prix unitaire par ligne) → valider
3. ✅ Le devis passe en **Confirmé** avec son montant (`proposedPrice`)
4. Devis confirmé → **Marquer Livré**
5. ✅ Le devis passe en **Livré** → il est compté dans **"X livrées ce mois"** du dashboard
6. Devis → **Annuler** → **Restaurer** possible
7. ⚠️ Cas à vérifier : devis avec une **ligne hors-catalogue** (dimension perso, sans produit) → le popup prix doit quand même permettre de saisir le montant

---

## 🎯 10bis. Assignation "Pris en charge par" (nouveau)

Se connecter avec **`admin1`** (a la permission "assigner") et **`employe2`** (limité, ne l'a pas) :

1. **admin1** ouvre une demande → change le **Responsable** dans le select → enregistré
2. ✅ La colonne **Responsable** de la liste se met à jour
3. ✅ La personne nouvellement assignée reçoit **une notif** dans sa cloche (elle seule)
4. **employe2** ouvre la même demande → le "Pris en charge par" est en **lecture seule** (pas de select)
5. **Test API direct** (optionnel) : `employe2` fait un PATCH avec `assignedToId` → refusé **403**
6. Créer une commande manuelle sans toucher au dropdown → elle est assignée **au créateur** par défaut
7. Filtre **Responsable** dans la liste → n'affiche que les demandes de cette personne

---

## 👥 11. Clients (`/admin/clients`)

1. Tous les clients s'affichent (**même ceux sans commande**)
2. Recherche par nom / entreprise / wilaya
3. Clic sur un client → **fiche** (infos + historique commandes/devis)
4. Clic sur une ligne d'historique → ouvre le détail de cette demande
5. **Modifier** le client (dont la **photo**, la **wilaya + commune**) → sauvegardé
6. **+ Nouveau client** → wilaya + commune (select filtré + saisie libre) → apparaît dans la liste ; la fiche montre « Commune, Wilaya »
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
7. **Catégories** (refondu) : bloc **cards catégorie** en bas de page
   - **+ Ajouter** une catégorie (nom) → apparaît en card, persistée en base
   - **Photo / Changer** → choisir une image → s'affiche sur la card ; **⊘** la retire
   - Nombre de produits affiché sous chaque catégorie
   - **×** supprime la catégorie → ⚠️ refusé avec message si elle contient des produits
8. ✅ La **photo de catégorie** apparaît sur le site public (accueil + `/products`)
9. **Activer/Désactiver** un produit (un produit inactif n'apparaît plus sur le site)
10. ⚠️ Supprimer un produit **utilisé** dans des commandes → message "Impossible, désactivez-le plutôt"

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
5bis. 📧 (À VENIR — todo 8.5) 2 emails automatiques : aux **admins** (récap du compte) + au **nouvel utilisateur** (bienvenue + son mot de passe pour se connecter)
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
12. ⚡ **Toast d'assignation ciblé** (nouveau) : quand on assigne une demande, **seul l'assigné** voit le toast (les autres ne le voient pas)

---

## 🔔 17ter. Notifications SYSTÈME / push (À VENIR — voir todo « 3bis »)

⚠️ Pas encore codé. Tests à faire une fois développé (surtout EN PROD, HTTPS requis) :

**Si Option A (app ouverte) :**
1. Autoriser les notifs à la 1ère demande → popup navigateur
2. Onglet ouvert (même minimisé) + nouvelle commande site → une **vraie notif système** apparaît (hors de la page)
3. Cliquer la notif → ouvre la demande concernée

**Si Option B (push, app fermée) :**
4. Bouton "Activer les notifications" → autoriser
5. **Fermer complètement** l'app / le navigateur
6. Créer une commande / assigner depuis un autre compte → la notif système arrive **quand même**
7. Sur **iPhone** : ajouter le site à l'écran d'accueil d'abord, puis tester
8. Cliquer la notif → ouvre l'app sur la bonne page
9. ⚠️ Chaque appareil a son propre abonnement (tester tel + PC séparément)

---

## ⚡ 17bis. Temps réel — pas de rechargement visible (nouveau)

Avec 2 fenêtres ouvertes (ex. `admin1` sur une liste, `admin2` qui agit) :

1. `admin2` crée/valide une demande → chez `admin1` la **liste /admin/requests** se met à jour **sans F5** et **sans clignotement** (pas de "Chargement…")
2. Idem sur le **dashboard** : chiffres + camembert bougent en douceur
3. **Fiche client** ouverte chez `admin1` → si une commande de ce client change → l'historique se met à jour en direct
4. La **cloche** s'incrémente en direct, le toast apparaît sans recharger la page
5. ⚠️ Vérifier qu'à aucun moment une vue ne "flashe" un état de chargement pendant une mise à jour temps réel

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
4. **Assignation** (nouveau) → l'employé sans "assigner les commandes" voit le Responsable en **lecture seule**
5. **Contenu** / **Utilisateurs** → invisibles pour l'employé limité
6. L'**admin** voit et peut **TOUT**

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

### Désactivation client (À VENIR — todo 8.3)
7. "Supprimer" un client → une **boîte demande un motif** (obligatoire)
8. Valider → le client passe **désactivé** (pas supprimé), son historique reste intact
9. Les **admins** reçoivent une notif "X a désactivé le client Y — motif : …"
10. Dans la fiche du client désactivé → bandeau avec le **motif** + qui/quand
11. Un admin peut **réactiver** ou **supprimer définitivement**

---

## 📝 Notes commande/devis (À VENIR — todo 8.4)
1. Dans le détail d'une commande/devis → ajouter une **note**
2. La note s'affiche avec le **nom de l'auteur** + date, visible par tout le monde
3. Ajouter une 2e note → les deux restent (fil, pas d'écrasement)

---

## 📱 21bis. Mobile — accès terrain (nouveau)

Tester en ouvrant l'app sur un **téléphone** (adresse `http://192.168.X.X:3000` affichée par `npm run dev`, même WiFi).

1. Sur mobile, la **sidebar est cachée** → un **menu hamburger (☰)** l'ouvre ; le contenu prend toute la largeur
2. Se connecter sur mobile → on **n'atterrit PAS sur le dashboard** mais sur un **menu d'accueil mobile**
3. Le menu montre les actions terrain : **Commande rapide · Clients · Commandes/devis · Notifications**
4. Ouvrir **Clients** → liste → une fiche → gros boutons **📞 Appeler / 💬 WhatsApp / ✉️ Mail** qui marchent en un tap
5. **Commande rapide** → formulaire en **steps** (Client → Produits → Résumé → Valider), sans TVA par défaut
6. **Commandes/devis** → consultables + changement de statut depuis le tel
7. **Dashboard** (ou produits/contenu/users/historique) sur mobile → message **"Disponible sur ordinateur"**
8. ⚠️ Vérifier que ce sont bien les **mêmes données** que sur le web (pas une version séparée)

---

## 🟠 Tests — Retours entreprise (P9, À VENIR)

**9.1 Emails :** plus d'email quotidien ; récap **hebdo jeudi 23h59** ; expéditeur/contact = **Contact@psi.dz**
**9.2 Fiche client :** bouton export → génère un **PDF** et un **Excel** avec infos + historique complet
**9.3 Secteur :** créer un secteur depuis le dashboard → l'affecter à un client (dropdown) → visible dans la fiche
**9.4 Métrage :** champ longueur (m) facultatif visible dans commande/devis/produit admin/site public/Excel
**9.5 Réf libre commande :** dans une commande → dropdown réf → option "Référence libre" → champ texte
**9.6 Bouton :** page Commandes → le bouton dit "+ Nouveau" (plus "Nouvelle commande")
**9.7 Réf auto :** créer un produit dans "Papier thermique" → code auto PTT-001, le suivant PTT-002 ; autre catégorie = autre préfixe
**9.8 Nom produit :** modifier un produit existant → changer son nom → sauvegardé
**9.9 Excel :** exporter une commande à plusieurs réfs → **chaque ligne a les infos client/wilaya/date** (pas de vide) + colonnes wilaya/catégorie/réf ; export du dashboard en Excel dispo

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
