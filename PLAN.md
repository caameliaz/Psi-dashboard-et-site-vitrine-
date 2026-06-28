# PSI Platform — Plan de développement

## Comment on travaille
Pour chaque fonctionnalité : tu lis la description → tu valides ou tu corriges → je code → on passe à la suivante.

---

## TECHNOLOGIES UTILISÉES (explication simple)

### Base de données — Neon + PostgreSQL
Neon c'est une base de données PostgreSQL hébergée sur le cloud, gratuite pour commencer et compatible avec Vercel. PostgreSQL c'est le système qui stocke toutes les données (clients, commandes, produits...). On n'a pas besoin de gérer un serveur, Neon s'occupe de tout.

### ORM — Prisma
Prisma c'est l'intermédiaire entre le code TypeScript et la base de données. Au lieu d'écrire du SQL à la main (`SELECT * FROM orders WHERE...`), on écrit du TypeScript (`prisma.order.findMany(...)`) et Prisma traduit. Le schéma est déjà défini dans `prisma/schema.prisma`.

### Authentification — Auth.js v5
Auth.js (anciennement NextAuth) gère les sessions utilisateur. Quand un admin se connecte, Auth.js crée un cookie JWT (jeton signé) dans le navigateur. Ce cookie prouve l'identité de l'utilisateur à chaque requête. On utilise un "Credentials Provider" = login avec email + mot de passe (pas Google, pas GitHub).

### JWT — C'est quoi ?
JWT = JSON Web Token. C'est un petit fichier chiffré stocké dans le cookie du navigateur. Il contient : l'id de l'utilisateur, son rôle (Admin/Employé), la date d'expiration. À chaque page admin, le serveur vérifie ce token. Si le token est invalide ou expiré → redirection vers `/admin/login`.

### Sécurité des mots de passe — bcrypt
Les mots de passe ne sont JAMAIS stockés en clair dans la base de données. bcrypt les transforme en une chaîne illisible (hash). Même si la base de données est compromise, les mots de passe restent protégés.

### Emails — Resend
Service d'envoi d'emails. Gratuit jusqu'à 3000 mails/mois. On l'utilise pour :
- Email de confirmation au client (commande reçue, devis reçu)
- Résumé hebdomadaire envoyé au responsable (PSI)
Intégration simple avec Next.js via l'API Resend.

### Notifications temps réel — Polling
Pour que le dashboard se mette à jour quand une commande arrive sans que l'admin recharge la page, on utilise le "polling" : toutes les 30 secondes, le navigateur demande au serveur "y a-t-il du nouveau ?". C'est simple et suffisant pour PSI. (Alternative plus complexe : Server-Sent Events — on garde ça pour plus tard si besoin.)

### Notifications push navigateur — Web Push + VAPID
Pour recevoir une notification sur le PC même si le navigateur est fermé. Nécessite des clés VAPID (générées une fois) + un service worker (un petit script qui tourne en arrière-plan). Fonctionne sur Chrome et Firefox desktop. On implémente ça après le reste.

### Protection des routes — proxy.ts
Dans Next.js 16, le middleware s'appelle `proxy.ts` (pas `middleware.ts`). C'est lui qui vérifie, avant chaque chargement de page, si l'utilisateur est connecté et a les droits. Si non → redirection vers `/admin/login`.

---

## FONCTIONNALITÉ 1 — Authentification admin

**Comment ça marche :**
- L'admin va sur `/admin/login`, entre son email + mot de passe
- Si c'est bon → redirigé vers `/admin/dashboard`
- Si c'est faux → message d'erreur "Identifiants incorrects"
- **Session par défaut : 24h**
- **"Rester connecté" coché : 7 jours** (uniquement sur ordi personnel — si le cookie est volé, l'accès est limité à 7 jours max au lieu d'être illimité)
- Bouton "Déconnecter tous les appareils" disponible dans le profil (invalide tous les cookies d'un coup)
- Si non connecté → redirigé automatiquement vers `/admin/login`
- Le premier compte admin est créé manuellement via `npm run seed`

**Permissions par rôle :**

| Page / Action | Admin | Employé |
|---|---|---|
| Dashboard | ✅ | ✅ |
| Demandes — voir | ✅ | ✅ |
| Demandes — changer statut | ✅ | ✅ |
| Demandes — ajouter note interne | ✅ | ✅ |
| Demandes — ajouter manuellement | ✅ | ✅ |
| Demandes — annuler (avec justificatif → validation admin) | ✅ approuve | ✅ propose |
| Produits — voir | ✅ | ✅ |
| Produits — ajouter / modifier / activer | ✅ | ❌ lecture seule |
| Produits — supprimer | ✅ | ❌ |
| Clients — voir + modifier + exporter | ✅ | ✅ |
| Historique — voir | ✅ tout | ✅ ses actions + notifs reçues |
| Contenu du site | ✅ | ❌ |
| Utilisateurs | ✅ | ❌ |
| Notifications — bleu (site public) | ✅ | ✅ |
| Notifications — gris (ses propres actions) | ✅ | ✅ |
| Notifications — orange (actions autres users) | ✅ | ❌ |
| Notifications — rouge (annulation employé) | ✅ uniquement | ❌ |

**Ce que je dois faire :**
- Configurer Auth.js v5
- Table `User` dans la DB (email, password hashé, nom, rôle)
- API de login avec "Remember me"
- Bouton "Déconnecter tous les appareils"
- Protéger toutes les routes `/admin/*` sauf `/admin/login` via `proxy.ts`
- Vérification des rôles dans `proxy.ts` (Employé redirigé si tente d'accéder à Contenu ou Utilisateurs)
- Script seed pour créer le premier admin

---

## FONCTIONNALITÉ 2 — Produits & Catégories (admin)

**Comment ça marche :**
- L'admin voit la liste de tous les produits
- Il peut ajouter un produit (référence, largeur, longueur, catégorie, prix, usage) + **uploader une photo**
- Il peut modifier un produit existant
- Il peut supprimer un produit (confirmation : désactiver ou supprimer définitivement)
- Il peut activer/désactiver un produit → les inactifs n'apparaissent pas sur le site public
- Il peut ajouter/supprimer des catégories
- Les produits actifs s'affichent **en temps réel** sur le site public (pas de cache, lecture directe DB)
- L'employé voit les produits mais **ne peut pas** les modifier/ajouter/supprimer

**Ce que je dois faire :**
- Tables `Product` et `Category` dans la DB
- Stockage photo produit (Vercel Blob ou dossier public)
- APIs : GET/POST/PUT/DELETE produits, GET/POST/DELETE catégories
- Brancher `/admin/products` aux APIs
- Brancher `/products` du site public à l'API (supprimer le mock data)

---

## FONCTIONNALITÉ 3 — Commandes depuis le site public

**Comment ça marche :**
- Le client ajoute des produits au panier
- Il va sur `/checkout`, remplit : nom, entreprise, téléphone, wilaya, adresse, email (facultatif)
- Il clique "Envoyer la commande" → enregistré en DB
- L'admin et l'employé voient la commande dans `/admin/requests` avec statut "En attente"
- **Notification bleu** envoyée à toute l'équipe : "Nouvelle commande de [Nom] — [Wilaya]"
- **Email automatique à PSI** : résumé de la commande (client, produits, quantités, wilaya)
- Le client voit un message de confirmation à l'écran
- **Email de confirmation au client** : si email fourni → "Votre commande a bien été reçue, nous vous contacterons sous 24h"
- Table `Client` créée automatiquement si nouveau numéro de téléphone, sinon rattachée au client existant

**Ce que je dois faire :**
- Table `Order` dans la DB
- Table `Client` dans la DB
- API `POST /api/orders`
- Email confirmation client via Resend (si email fourni)
- Email notification PSI via Resend
- Brancher le formulaire `/checkout`

---

## FONCTIONNALITÉ 4 — Devis depuis le site public

**Comment ça marche :**
- Le client va sur `/quote`, remplit ses infos + spécifications du produit souhaité (largeur, longueur, quantité, usage, format spécial, remarques)
- Le devis est enregistré en DB avec statut "En attente"
- L'admin/employé le voit dans `/admin/requests` onglet "Devis"
- **Dans le slide-in du devis**, l'admin peut remplir des champs supplémentaires : prix proposé, délai, conditions
- Une fois tout rempli → bouton **"Convertir en commande"** → crée automatiquement une commande avec les infos client déjà remplies et statut "Validé"
- **Notification bleu** à toute l'équipe : "Nouveau devis de [Nom]"
- **Email confirmation au client** si email fourni : "Votre demande de devis a bien été reçue"

**Ce que je dois faire :**
- Table `Quote` dans la DB (avec champs supplémentaires admin : prix proposé, délai, conditions)
- API `POST /api/quotes`
- API `PATCH /api/quotes/[id]/convert` → convertit en commande
- Brancher le formulaire `/quote`
- Email confirmation via Resend

---

## FONCTIONNALITÉ 5 — Contact & Commandes manuelles

**Comment ça marche — Contact :**
- Le client remplit le formulaire `/contact`
- Le message est enregistré en DB et apparaît dans `/admin/requests` (onglet "Messages")
- Si le client contacte par WhatsApp, l'admin peut créer une entrée manuellement

**Comment ça marche — Commande manuelle :**
- Dans `/admin/requests`, bouton "Ajouter une commande manuelle"
- L'admin ou l'employé remplit : client (ou nouveau client), produits, quantités, source (WhatsApp / téléphone / autre)
- Ça rentre dans le même système que les commandes du site avec une étiquette "Manuel"
- Apparaît dans la fiche client, l'historique, les stats du dashboard

**Ce que je dois faire :**
- Table `ContactMessage` dans la DB
- API `POST /api/contact`
- API `POST /api/orders` avec flag `source: 'manuel'`
- Formulaire ajout manuel dans `/admin/requests`

---

## FONCTIONNALITÉ 6 — Gestion des demandes (admin)

**Comment ça marche :**
- L'admin/employé voit toutes les commandes, devis, messages dans `/admin/requests` avec filtres
- Il peut changer le statut : En attente → Contacté → Validé (ou Annulé)
- **Annulation par un employé :**
  1. Employé clique "Annuler" → modal avec champ justificatif obligatoire
  2. La demande passe en statut "Annulation en attente"
  3. **Notification rouge** envoyée à l'admin : "[Employé] a proposé d'annuler [Commande] — Raison : [justificatif]"
  4. Admin approuve → statut "Annulé" + raison stockée dans la fiche
  5. Admin refuse → retour au statut précédent
- **Si client a déjà commandé** : l'annulation reste dans sa fiche avec date + raison
- **Si premier contact et annulé** : reste dans l'historique global mais le client n'est pas créé
- Notes internes : champ texte visible uniquement par le staff, affiché dans le slide-in ET dans la fiche client. **Notification grise** à toute l'équipe quand une note est ajoutée.
- Slide-in au clic sur une ligne : tous les détails + changement statut + notes + historique

**Ce que je dois faire :**
- API GET/PATCH demandes (statut, notes, annulation)
- Workflow annulation avec validation admin
- Notifications internes (polling 30s)
- Brancher `/admin/requests`

---

## FONCTIONNALITÉ 7 — Gestion des clients (admin)

**Comment ça marche :**
- Clients créés automatiquement depuis commandes/devis
- Liste en grille de cards dans `/admin/clients` avec recherche
- Fiche client slide-in : infos, avatar (initiales ou photo uploadée), historique complet (commandes + devis + notes + annulations avec raisons)
- Export fiche en Excel ou Word
- L'employé peut voir, modifier et exporter

**Ce que je dois faire :**
- API GET/PATCH clients
- Brancher `/admin/clients` à la DB (remplacer mock data)
- Export Excel/Word (libs xlsx + docx déjà installées)

---

## FONCTIONNALITÉ 8 — Contenu du site (admin)

**Comment ça marche :**
- L'admin modifie depuis `/admin/content` : Hero (titre, sous-titre), À propos, Contact, et les **produits affichés** (lié à la fonctionnalité 2)
- Il clique "Sauvegarder" → changements immédiats sur le site public
- Employé n'a pas accès

**Ce que je dois faire :**
- Table `SiteContent` dans la DB (clé/valeur)
- API GET/PUT contenu
- Brancher `/admin/content` et la home page à la DB

---

## FONCTIONNALITÉ 9 — Gestion des utilisateurs (admin)

**Comment ça marche :**
- Seul l'Admin peut accéder à cette page
- Créer un utilisateur : nom, email, mot de passe temporaire, rôle (Admin ou Employé)
- Modifier le rôle, désactiver ou supprimer (confirmation : désactiver ou supprimer définitivement)
- Les permissions par rôle sont définies dans la table Fonctionnalité 1

**Ce que je dois faire :**
- APIs GET/POST/PUT/DELETE utilisateurs
- Brancher `/admin/users`
- Vérification rôle dans `proxy.ts`

---

## FONCTIONNALITÉ 10 — Notifications

**Comment ça marche :**
- **Polling 30 secondes** : le dashboard vérifie toutes les 30s s'il y a de nouvelles notifs
- **Couleurs :**
  - 🔵 Bleu : nouvelle commande ou devis depuis le site public (toute l'équipe)
  - ⚫ Gris : action de l'utilisateur connecté (lui seul)
  - 🟠 Orange : action d'un autre utilisateur (Admin uniquement)
  - 🔴 Rouge : annulation proposée par un employé (Admin uniquement)
- **Slide-in** : clic sur la cloche → liste des notifs avec "Tout marquer lu"
- **Résumé hebdomadaire par email** (chaque lundi matin) : nb de commandes en attente, nb validées, nb de devis, nouveaux clients — envoyé au mail de PSI via Resend
- **Web Push** (notifications navigateur même si fermé) : implémenté après les fonctionnalités core

**Ce que je dois faire :**
- Table `Notification` dans la DB
- API GET/POST notifications
- Polling côté client (useEffect + setInterval 30s)
- Email hebdomadaire via Resend (cron job ou scheduled function Vercel)
- Web Push : service worker + clés VAPID (phase 2)

---

## FONCTIONNALITÉ 11 — Historique des actions

**Comment ça marche :**
- Chaque action importante est enregistrée : ajout/modification/suppression produit, changement statut commande, annulation, note ajoutée, connexion...
- Page `/admin/history` avec recherche, filtre par type et par utilisateur
- Admin voit tout
- Employé voit ses propres actions + les notifications qu'il a reçues

**Ce que je dois faire :**
- Table `AuditLog` dans la DB
- Middleware d'audit : chaque API qui modifie des données crée une entrée dans `AuditLog`
- Brancher `/admin/history` à la DB

---

## FONCTIONNALITÉ 12 — Statuts personnalisables

**Comment ça marche :**
- L'admin peut créer ses propres statuts en plus des statuts par défaut ("En attente", "Contacté", "Validé", "Annulé")
- Exemples : "En livraison", "En attente de paiement", "Reporté", "À rappeler"
- Chaque statut a un nom + une couleur (choix parmi une palette)
- Les statuts personnalisés apparaissent dans les mêmes menus déroulants que les statuts par défaut
- L'employé peut utiliser tous les statuts mais ne peut pas en créer/supprimer

**Ce que je dois faire :**
- Table `CustomStatus` dans la DB (nom, couleur, ordre)
- Page de gestion dans `/admin/settings` ou directement dans `/admin/requests`
- Intégrer dans tous les menus de changement de statut

---

## FONCTIONNALITÉ 13 — Calcul automatique sur les produits

**Comment ça marche :**
- Dans le formulaire de commande (site public) et dans le slide-in admin
- Le client/admin entre : largeur (mm), longueur (m), quantité (rouleaux)
- L'app calcule automatiquement : **métrage total** = longueur × quantité, **surface totale** si besoin
- Le calcul est affiché en temps réel pendant la saisie
- Les valeurs restent modifiables manuellement à tout moment
- Utile pour les devis (calculer le prix au mètre)

**Ce que je dois faire :**
- Logique de calcul côté client (pas de back-end nécessaire, juste JS)
- Intégrer dans le formulaire `/quote`, le slide-in devis admin, et le formulaire de commande manuelle

---

## FONCTIONNALITÉ 14 — Templates de messages (WhatsApp / SMS / Email)

**Comment ça marche :**

**Page dédiée `/admin/templates` (Admin + Employé) :**
- Liste de tous les templates créés
- Admin peut créer/modifier/supprimer des templates
- Employé peut consulter et utiliser mais pas modifier
- Chaque template a : un titre, un contenu avec variables (`[Nom]`, `[Référence]`, `[Wilaya]`, `[Entreprise]`), une catégorie (Confirmation / Relance / Livraison / Autre)

**Dans chaque slide-in commande/devis :**
- Bouton "Contacter le client"
- Choisir un template → les variables `[Nom]`, `[Référence]` etc. sont remplacées automatiquement par les vraies valeurs du client
- Deux actions :
  - **"Ouvrir WhatsApp"** → lien `wa.me/[numéro]?text=[message]` → WhatsApp s'ouvre avec le message prêt, il suffit d'appuyer Envoyer
  - **"Copier le message"** → copie dans le presse-papier pour coller où on veut (SMS, email, autre)

**Templates de base fournis à l'installation :**
- "Votre commande a bien été reçue, nous vous contacterons sous 24h"
- "Votre commande est en cours de traitement"
- "Votre commande est prête, merci de nous contacter pour organiser la livraison"
- "Nous n'avons pas pu vous joindre, merci de nous rappeler au [téléphone PSI]"
- "Suite à notre échange, voici notre proposition de devis : [détails]"

**Permissions :**
| Action | Admin | Employé |
|---|---|---|
| Voir et utiliser les templates | ✅ | ✅ |
| Créer / modifier / supprimer | ✅ | ❌ |

**Ce que je dois faire :**
- Table `MessageTemplate` dans la DB (titre, contenu, catégorie)
- Page `/admin/templates`
- Composant "Contacter" dans les slide-ins (commandes + devis + clients)
- Logique de remplacement des variables
- Génération lien wa.me + bouton copier
- Script seed pour les templates de base

---

## FONCTIONNALITÉ 15 — Impression bon de commande (PDF)

**Comment ça marche :**
- Dans le slide-in d'une commande → bouton "Imprimer / PDF"
- Génère un bon de commande propre avec : logo PSI, infos client, liste des produits, quantités, date, référence commande, statut
- S'ouvre dans un nouvel onglet prêt à imprimer (ou télécharger en PDF)
- Fonctionne sans connexion internet (généré côté client)

**Ce que je dois faire :**
- Composant "PrintView" (page cachée stylée pour l'impression avec `@media print`)
- Ou génération PDF via lib `@react-pdf/renderer`
- Bouton "Imprimer" dans les slide-ins commandes

---

## Ordre d'exécution

1. **Fonctionnalité 2** — Produits + photos
2. **Fonctionnalité 3** — Commandes + emails
3. **Fonctionnalité 4** — Devis + conversion en commande
4. **Fonctionnalité 5** — Contact + commandes manuelles
5. **Fonctionnalité 6** — Gestion demandes (statuts, notes, annulation)
6. **Fonctionnalité 12** — Statuts personnalisables
7. **Fonctionnalité 13** — Calcul automatique produits
8. **Fonctionnalité 14** — Templates de messages
9. **Fonctionnalité 15** — Impression PDF
10. **Fonctionnalité 7** — Clients (DB + export)
11. **Fonctionnalité 10** — Notifications (polling + email hebdo)
12. **Fonctionnalité 11** — Historique (DB + audit log)
13. **Fonctionnalité 8** — Contenu
14. **Fonctionnalité 9** — Utilisateurs
15. **Fonctionnalité 1** — Auth + rôles (en dernier, proxy.ts activé avant mise en prod)

---

## QUESTIONS CLIENT (à valider avec Yacine)

- **Email de confirmation commande au client** : activer par défaut ou seulement si l'admin décide ?
- **Relance automatique** : envoyer un email au client si sa commande est en attente depuis X jours ? Si oui, combien de jours ?
- **Email hebdomadaire** : quel jour et quelle heure préférez-vous recevoir le résumé de la semaine ?
- **Durée de session** : 24h par défaut confirmé ? Ou vous préférez une autre durée ?
