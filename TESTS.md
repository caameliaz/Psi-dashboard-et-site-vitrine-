
2️⃣ Récap général — ce qu'il reste
🔨 Ton code à toi (admin/API)
Rien à coder. Tout P1→P9 est fini. Il reste juste 2 tests qui ont besoin du déploiement (HTTPS obligatoire) :

⬜ Notifs push en prod (PC + Android app fermée ; iPhone via « ajout à l'écran d'accueil »)
⬜ Emails auto (création de compte) — testables une fois que ton chef a activé SMTP AUTH
🔨 Ton collègue (site public) — pas ton code
⬜ Responsive mobile (2 produits/ligne, zoom image détail)
⬜ Photos HD partout
⬜ Refonte affichage catégories/références
⏸️ Reportés (optionnels, à décider plus tard)
Bouton « Modifier montant » dans détail commande
Carte « nouveaux clients » sur dashboard
Traduction auto AR du contenu
Récap email quotidien (le hebdo jeudi 23h59 est déjà codé)
En clair : côté code, tu es prête. Le reste = déploiement + une action de ton chef (SMTP).





3️⃣ TUTO — Comment TU déploies (Vercel)
Prérequis : le code est sur GitHub (fait ✅), tu as une base Neon de prod.

Va sur vercel.com → connecte-toi avec ton compte GitHub.
Add New → Project → sélectionne ton repo psisite → Import.
Avant de cliquer Deploy, ouvre Environment Variables et ajoute (une par une) :
Variable	Valeur
DATABASE_URL	l'URL de ta base Neon de prod
NEXTAUTH_SECRET	une chaîne aléatoire forte (voir juste en dessous)
NEXTAUTH_URL	tu la mettras après (étape 6) une fois l'URL connue
SMTP_USER	Contact@psi.dz
SMTP_PASS	le mot de passe (celui de ton .env)
EMAIL_FROM	Contact@psi.dz
SMTP_PROVIDER	outlook
VAPID_PUBLIC	même valeur que ton .env local
VAPID_PRIVATE	même valeur que ton .env local
NEXT_PUBLIC_VAPID_PUBLIC	même valeur que ton .env local
Générer un NEXTAUTH_SECRET fort — dans ton terminal :


node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
Copie ce que ça affiche → c'est ta valeur.

Clique Deploy. Attends ~2-3 min. Le build applique tout seul les migrations de la base (prisma migrate deploy).
Vercel te donne une URL du type https://psisite-xxxx.vercel.app → c'est ton lien de test.
Reviens dans Settings → Environment Variables → mets NEXTAUTH_URL = cette URL (avec https://) → Redéploie (bouton Redeploy dans l'onglet Deployments).
✅ Site en ligne.

4️⃣ TUTO — Tests post-déploiement (dans l'ordre)
Sur l'URL .vercel.app :

Connexion admin → dashboard s'ouvre
Créer une commande + un devis → la cloche sonne, notif reçue
Exports Excel + PDF → se téléchargent
Notifs push : autorise les notifications → ferme l'onglet → fais une action depuis un autre compte → tu dois recevoir la push (PC et Android ; iPhone : ajoute d'abord le site à l'écran d'accueil)
Email test : ⚠️ ne marchera qu'après que ton chef a activé SMTP AUTH (étape 5)

6️⃣ TUTO — Redéployer après un changement
À chaque fois que tu modifies le code :


git add -A
git commit -m "ta description"
git push
👉 Vercel redéploie tout seul à chaque push (rien d'autre à faire). Les migrations de base passent automatiquement.

7️⃣ TUTO — Brancher le domaine psi.dz
Une fois le site validé sur l'URL .vercel.app :

Sur Vercel : Project → Settings → Domains → Add → tape psi.dz (et www.psi.dz).
Vercel t'affiche des enregistrements DNS à créer (type A et/ou CNAME avec des valeurs précises).
Envoie ces enregistrements à ICOSNET (qui gère le DNS de psi.dz) en leur demandant de les ajouter — ou fais-le toi-même si tu as accès au panneau DNS.
Propagation : quelques heures (jusqu'à 24-48h max). Vercel met le HTTPS tout seul.
Important : une fois psi.dz actif, reviens changer NEXTAUTH_URL = https://psi.dz → Redeploy.
✅ Site accessible sur psi.dz.


# infos vercel
Qui gère les comptes Microsoft / Outlook de l'entreprise ? (toi, quelqu'un de l'équipe, ou Icosnet ?)
As-tu un accès "administrateur" sur admin.microsoft.com ? (pas juste ta boîte mail — le vrai compte admin du domaine psi.dz)
Si oui, il y a une seule case à cocher (5 min) :
admin.microsoft.com → Utilisateurs → Contact@psi.dz → onglet Courrier → Gérer les applications de messagerie → cocher "SMTP authentifié" → Enregistrer.

Si c'est Icosnet qui gère, il suffit de les appeler et leur dire : « activez SMTP AUTH pour Contact@psi.dz ».
═══════════════════════════════════════════════════════════
💰 HÉBERGEMENT & COÛTS (à savoir face à l'entreprise)
═══════════════════════════════════════════════════════════
Architecture = 2 services séparés :
  • VERCEL = héberge l'APP (le site + l'admin)
  • NEON   = héberge la BASE DE DONNÉES (clients, commandes, users…)  ← reliée via DATABASE_URL

VERCEL :
  - Gratuit (Hobby) : ~100 Go/mois de trafic, largement suffisant pour un usage interne.
    ⚠️ Le gratuit interdit l'usage COMMERCIAL dans ses conditions → OK pour tester, pas pour la prod officielle.
  - Pro (~20$/mois) : à prendre quand l'entreprise l'utilise "pour de vrai". C'est l'entreprise qui paie.

NEON (base de données) :
  - Gratuit : 0,5 Go de stockage = facilement +10 000 clients (100 clients = quelques Mo → on est TRÈS loin).
  - ⚠️ Le gratuit met la base "en veille" après inactivité → 1ère requête ~1s de délai (erreur P1001 vue en dev).
  - Payant (~19$/mois) : supprime la veille (base toujours réveillée). À prendre seulement si la lenteur gêne.

RÉSUMÉ COÛTS :
  - Démarrage / tests : 0$ (Vercel gratuit + Neon gratuit, avec la petite veille DB)
  - Production réelle  : ~20$/mois (Vercel Pro) + éventuellement ~19$ (Neon payant) = 20 à 40$/mois
  - Le NOMBRE DE CLIENTS n'est jamais un problème (la limite c'est le trafic/stockage, pas le nb de fiches).

À CONSEILLER À L'ENTREPRISE :
  « On démarre gratuit pour valider. En production quotidienne → Vercel Pro (~20$/mois), sans maintenance
    de votre côté (HTTPS auto, redéploiement en 1 commande). La base reste gratuite tant qu'on ne dépasse
    pas ~10 000 clients, donc pour longtemps. Un VPS coûterait moins cher mais demande un admin serveur —
    pas rentable pour une PME. »

═══════════════════════════════════════════════════════════
# 🚀 CHECKLIST DÉPLOIEMENT VERCEL (à faire une fois avant mise en ligne)

Variables d'environnement à ajouter sur Vercel (Settings → Environment Variables) :
  - DATABASE_URL (Neon prod) · NEXTAUTH_SECRET · NEXTAUTH_URL (= l'URL prod, https://…)
  - EMAILS (⚠️ la boîte est chez ICOSNET/cPanel, PAS chez Microsoft — vérifié via MX/SPF) :
      SMTP_PROVIDER=cpanel · SMTP_HOST=mail.psi.dz · SMTP_PORT=465
      SMTP_USER=Contact@psi.dz · SMTP_PASS=<mdp de la boîte> · EMAIL_FROM=Contact@psi.dz
      ✅ testé le 21/07/2026 : connexion + envoi réels OK
  - VAPID_PUBLIC · VAPID_PRIVATE · NEXT_PUBLIC_VAPID_PUBLIC  (notifs push — mêmes valeurs que .env local)
  - ⚠️ CRON_SECRET  ← OBLIGATOIRE pour les récaps auto (quotidien 20h + hebdo jeudi 23h59).
      Sans lui la route /api/cron/recap refuse tout (protection anti-envoi massif d'emails).
      Générer la valeur :  node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
      Puis vérifier dans Vercel → onglet "Cron Jobs" que les 2 tâches apparaissent.
      (bouton "Run" pour tester sans attendre 20h)
Code / config :
  - [x] build applique les migrations auto : "build": "prisma migrate deploy && next build"
  - [x] cookies Secure AUTO en prod (useSecureCookies = NODE_ENV==='production') — plus rien à faire
  - [x] headers de sécurité (HSTS/X-Frame/nosniff) + rate limiting (login + routes publiques) en place
  - [x] emails OK (Icosnet/cPanel — voir bloc EMAILS) — testé en réel le 21/07/2026
  - [ ] mettre un NEXTAUTH_SECRET fort/unique sur Vercel (pas celui de dev)
Tests post-déploiement (HTTPS requis) : notifs push (PC/Android app fermée, iPhone via écran d'accueil) + envoi email test.




Email	Rôle
admin1@psi.dz	Admin (tout) — utilise celui-là
admin2@psi.dz	Admin (2e, pour tester notifs à 2)
employe1@psi.dz	Employé complet
employe2@psi.dz	Employé limité (lecture seule)

═══════════════════════════════════════════════════════════
✅ PRIORITÉ 9 — Retours entreprise (réunion)  TERMINÉE (9.1 → 9.9)
═══════════════════════════════════════════════════════════
- 9.1 Emails : récap hebdo jeudi 23h59 + récap quotidien 20h, expéditeur Contact@psi.dz (Icosnet/cPanel), emails auto création compte ✅
       ✅ envoi réel testé le 21/07/2026 — plus aucun bloqueur externe
- 9.2 Export fiche client PDF + Excel (infos + historique) ✅
- 9.3 Secteur d'activité par client (dropdown + gestion dashboard + badge) ✅
- 9.4 Champ métrage (m) facultatif partout (commande/devis/produit/site/Excel) ✅
- 9.5 Référence libre dans les commandes ✅
- 9.6 Bouton "+ Nouveau" (ex "+ Nouvelle commande") ✅
- 9.7 Réf auto par catégorie (préfixe → PTT-001, PTT-002…) ✅
- 9.8 Nom de produit éditable ✅
- 9.9 Excel 1 ligne/produit sans cases vides + colonnes wilaya/commune/cat/réf/métrage + export dashboard ✅
> Migration `p9` : Product.name/metrage, Category.prefix/refCounter, OrderItem/QuoteItem.metrage,
> Client.sectorId + table Sector, OrderItem.productId/description, table RequestNote.

📧 EMAILS — ✅ RÉSOLU le 21/07/2026 (connexion + envoi réels testés)
> ⚠️ Fausse piste initiale : on croyait la boîte chez Microsoft/Office 365 → erreur 535 en boucle.
> RÉALITÉ : la boîte Contact@psi.dz est hébergée chez ICOSNET (cPanel).
>   Preuves : MX de psi.dz → 197.140.11.7 (Icosnet) · SPF n'autorise que cette IP · cPanel accessible.
> Config qui marche (dans .env ET à mettre sur Vercel) :
>   SMTP_PROVIDER=cpanel · SMTP_HOST=mail.psi.dz · SMTP_PORT=465 (SSL) · user contact@psi.dz
> Le mot de passe était le bon depuis le début — aucun "mot de passe d'application" nécessaire.
> 💡 Le mdp de la boîte est réinitialisable seul depuis cPanel → Email Accounts → Manage.
> ⚠️ Depuis certaines connexions locales le port 465 fait des timeouts (1 essai sur 2) — normal, OK depuis Vercel.


═══════════════════════════════════════════════════════════
✅ TOUT LE CODE DE MA PART EST TERMINÉ (P1→P9, sauf reliquats ci-dessous)
═══════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════
🔨 CE QUI RESTE — MON CÔTÉ
═══════════════════════════════════════════════════════════
Rien à coder. Reste uniquement des tests/config qui exigent le déploiement (HTTPS) :
- [ ] 3bis Notifs push : tester en prod (PC + Android app fermée ; iPhone via "ajout écran d'accueil")
- [ ] 8.5 Emails auto création compte : tester une fois SMTP AUTH activé
- [ ] (reporté, à préciser si besoin) bouton "Modifier montant" détail commande · carte "nouveaux clients" dashboard · traduction auto AR du contenu

═══════════════════════════════════════════════════════════
🔨 CE QUI RESTE — COLLÈGUE (site public)
═══════════════════════════════════════════════════════════
- [ ] 7.1 Responsive public : 2 produits/ligne mobile · image détail produit trop grosse → zoom au clic · largeur filtres notifs
- [ ] 7.2 Photos de bonne qualité PARTOUT (produits + accueil) · redesign affichage des références
- [ ] 1.4 Catégories/produits refondus (photo catégorie, cards, filtre in-place accueil + /products) — repris de zéro
- [ ] récap quotidien email pour les admins

═══════════════════════════════════════════════════════════
🚀 APRÈS DÉPLOIEMENT — dans l'ordre
═══════════════════════════════════════════════════════════
1. Déployer sur Vercel (voir CHECKLIST DÉPLOIEMENT en haut) → obtenir l'URL .vercel.app
2. Mettre NEXTAUTH_URL = URL prod (cookies Secure déjà auto en prod)
3. Tester en prod : notifs push · connexion · commande/devis · exports · envoi email test
4. À l'entreprise : activer SMTP AUTH (leur admin Microsoft) → tester les mails
5. Brancher le domaine psi.dz sur l'URL Vercel (config DNS via Icosnet — propagation ~qq heures)
6. Remplir les vraies données (produits, clients) directement via l'app en ligne
> Cycle de correction après déploiement : git add -A && git commit -m "..." && git push → Vercel redéploie tout seul (~2 min).












# ══════════════ BACK-OFFICE ══════════════



## 📝 14. Contenu du site (`/admin/content`)

1. **Section Hero** : titre + sous-titre → Enregistrer → visible sur `/`
2. **À propos** : texte → Enregistrer → visible sur `/`
3. **Infos de contact** : adresse, email, téléphone, Facebook, Instagram → visible sur `/contact`
4. Chaque bloc a son bouton **Enregistrer** (avec état "enregistré ✓")

---

## 👤 15. Utilisateurs (Admin seulement — `/admin/users`)
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


## 🔔 17ter. Notifications SYSTÈME / push  ✅ CODÉ (Web Push / Option B) — À TESTER EN PROD

Le code est prêt. Marche seulement en PROD (HTTPS). Chaque user clique "Activer les notifications" (profil ou menu mobile).
Ne pas oublier les 3 variables VAPID sur Vercel. Tests à faire une fois déployé (HTTPS requis) :

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
