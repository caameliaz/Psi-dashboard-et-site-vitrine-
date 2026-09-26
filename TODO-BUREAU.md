# À faire au bureau

## Exclure l'équipe PSI des visites du site (Google Analytics)

Les pages `/admin` ne sont plus comptées. Mais quand quelqu'un de l'équipe ouvre
le site public (psi.dz) depuis le bureau, ça compte encore comme une visite.
Il faut le faire **depuis le réseau du bureau** (pour récupérer la bonne IP).

- [ ] **Récupérer l'IP publique du bureau** : sur un PC branché au réseau du
      bureau, ouvrir https://www.whatismyip.com et noter l'adresse IPv4
      (ex. `41.xxx.xxx.xxx`). Si le bureau a plusieurs connexions internet (fibre +
      4G…), le faire pour chacune.
- [ ] **Déclarer l'IP comme trafic interne** : analytics.google.com →
      Admin (roue dentée en bas à gauche) → **Flux de données** → cliquer sur le
      flux du site (`G-7VJG0M6KY5`) → **Configurer les paramètres de la balise** →
      **Afficher plus** → **Définir le trafic interne** → **Créer** :
      - Nom de la règle : `Bureau PSI`
      - `traffic_type` : laisser `internal`
      - Type de correspondance : **L'adresse IP est égale à** → coller l'IP
      - Enregistrer.
- [ ] **Activer le filtre** : Admin → **Paramètres des données** →
      **Filtres de données** → filtre « Internal Traffic » → le passer de
      **Test** à **Actif** → Enregistrer.
      ⚠️ Tant qu'il est en « Test », rien n'est exclu.
- [ ] **Vérifier** : ouvrir psi.dz depuis le bureau, puis dans Google Analytics →
      Rapports → **Temps réel** : votre visite ne doit plus apparaître
      (compter quelques minutes).

À savoir :
- Le filtre ne s'applique qu'**à partir de son activation**, pas aux visites passées.
- Si l'IP du bureau change (box redémarrée, changement d'opérateur), il faudra la
  mettre à jour dans la règle. Demander à l'opérateur si l'IP est **fixe**.
- Les visites de l'équipe **hors du bureau** (téléphone en 4G, maison) resteront
  comptées.

---

## Mails @psi.dz rejetés (codes de connexion non reçus)

**Le problème** : Brevo envoie bien, mais le serveur mail d'Icosnet (mail.psi.dz)
refuse les mails venant de l'IP Brevo `77.32.148.25`, listée sur UCEPROTECT
(erreur `550 5.5.1 Server IP 77.32.148.25 listed as abusive`). Seules les boîtes
**@psi.dz** sont touchées ; Gmail & co reçoivent normalement.
Le DNS (SPF, DKIM, DMARC) est correct — rien à y changer.

- [ ] **Dépanner tout de suite** : dans l'admin, mettre temporairement une adresse
      Gmail sur le compte des personnes en @psi.dz qui ne reçoivent plus leur code
      (Radja…). Remettre l'adresse @psi.dz une fois le problème réglé.
- [ ] **Ticket Brevo** envoyé (demander un autre pool d'IP).
- [ ] **Appeler Icosnet** (la vraie solution) : leur demander d'autoriser les IP de
      Brevo (`include:spf.brevo.com`) pour les boîtes @psi.dz, ou de ne plus rejeter
      sur la seule liste UCEPROTECT. Leur donner l'erreur 550 ci-dessus.
- [ ] **Si rien n'a bougé après quelques jours** : passer les mails vers @psi.dz par
      un autre service d'envoi (Claude modifie `sendEmail()`, il faudra ajouter 2-3
      enregistrements DNS dans cPanel).

### Services d'envoi gratuits possibles (plan C)

⚠️ Tarifs et limites relevés en 2026 : **à revérifier sur leur site** avant de
choisir, ils changent souvent.

| Service | Gratuit | Limites de l'offre gratuite |
|---|---|---|
| **Brevo** (actuel) | oui | 300 mails / jour. IP **partagées** → c'est justement le problème actuel. |
| **Resend** | oui | 3 000 mails / mois **et** 100 / jour max · 1 seul domaine · IP partagées · pas d'IP dédiée en gratuit. Le plus simple à brancher. |
| **Mailjet** | oui | 6 000 mails / mois **et** 200 / jour max · logo/mention Mailjet possible dans les mails · IP partagées. |
| **SMTP2GO** | oui | 1 000 mails / mois **et** 200 / jour max · IP partagées. |
| **Amazon SES** | non (presque) | ~0,10 $ / 1 000 mails (quasi gratuit à nos volumes) · **carte bancaire obligatoire** · compte bloqué en « sandbox » au départ (il faut demander à AWS d'en sortir, 1-2 jours) · plus technique à configurer. |

Limites communes à **toutes** les offres gratuites :
- **IP partagées** avec d'autres clients : si un autre client spamme, l'IP peut être
  listée à son tour → **aucune garantie** que le problème ne revienne pas.
  UCEPROTECT niveaux 2/3 liste parfois des réseaux entiers (y compris de gros
  services). **Avant de choisir**, tester les IP du service sur
  https://mxtoolbox.com/blacklists.aspx.
- **Plafond journalier** : au-delà, les mails ne partent plus jusqu'au lendemain
  (codes de connexion compris). À nos volumes (codes 2FA + récaps +
  notifications) on reste normalement très en dessous, mais à surveiller.
- **Pas de support prioritaire** (réponse lente, parfois uniquement par email).
- La seule vraie garantie est une **IP dédiée** (payant, plusieurs dizaines d'€ / mois)
  — ou qu'**Icosnet arrête de bloquer** Brevo, ce qui est gratuit.

### ⚠️ À ne PAS toucher dans Brevo

Brevo → Sécurité → **Adresses IP autorisées** (« Blocage d'adresses IP non
autorisées », Clés API / Clés SMTP) : **laisser « Désactivé »**.
Ce réglage limite les IP qui ont le droit d'*utiliser* nos clés Brevo. Le site
tourne sur Vercel, dont les IP changent tout le temps → si on l'active, **plus
aucun mail ne part** (codes de connexion, récaps, notifications). Ça n'a rien à
voir avec le rejet par Icosnet.

---

## Tuto : passer temporairement sur un autre service d'envoi

**Aucune ligne de code à changer.** Le code (`src/lib/email/send.ts`) sait parler à
n'importe quel serveur SMTP : il suffit de changer des **variables d'environnement**
dans Vercel. Brevo n'est pas supprimé : pour revenir, on remet les anciennes valeurs.

### Étape 0 — Noter la config Brevo actuelle (pour pouvoir revenir)

Vercel → projet → **Settings → Environment Variables** → noter quelque part (pas
dans ce fichier, il est dans Git !) les valeurs actuelles de :
`SMTP_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

### Étape 1 — Créer le compte et valider le domaine psi.dz

Dans le service choisi : ajouter le domaine **psi.dz**. Il affiche 2 à 4
enregistrements DNS à créer.

Les ajouter dans **cPanel → Zone Editor → psi.dz → Add Record**, en recopiant
exactement le **type**, le **nom** et la **valeur** affichés.

Règles :
- **Ne rien supprimer** des enregistrements Brevo existants (brevo1/brevo2,
  brevo-code, envoi…) : les deux services peuvent coexister.
- **SPF** (`v=spf1 … ~all` sur psi.dz) : il ne doit y en avoir **qu'un seul**. Si le
  service demande un `include:`, l'**ajouter dans l'enregistrement existant**, juste
  avant `~all` (ex. `… include:spf.brevo.com include:spf.mailjet.com ~all`). Ne
  jamais créer un 2ᵉ enregistrement SPF, ne jamais enlever `+a +mx +ip4:197.140.11.7`.
- Ne pas toucher au `_dmarc` existant.
- Attendre que le service affiche le domaine **« Verified / Vérifié »**
  (quelques minutes à quelques heures).

### Étape 2 — Récupérer les identifiants SMTP

| Service | SMTP_HOST | SMTP_PORT | SMTP_USER | SMTP_PASS | DNS demandés (en gros) |
|---|---|---|---|---|---|
| **Resend** | `smtp.resend.com` | `465` | `resend` (littéralement) | la clé API (`re_…`), menu **API Keys** | DKIM `resend._domainkey` (TXT) + MX et TXT sur le sous-domaine `send` |
| **Mailjet** | `in-v3.mailjet.com` | `587` | la **API Key** | la **Secret Key** (menu Compte → API Keys) | DKIM `mailjet._domainkey` (TXT) + `include:spf.mailjet.com` dans le SPF + TXT de validation |
| **SMTP2GO** | `mail.smtp2go.com` | `465` | l'utilisateur SMTP créé dans **Sending → SMTP Users** | son mot de passe | 3 CNAME (DKIM, retour, liens) |
| **Amazon SES** | `email-smtp.<région>.amazonaws.com` (ex. `eu-west-3`) | `465` | identifiant SMTP (**SMTP settings → Create SMTP credentials**, ≠ clés IAM) | mot de passe SMTP associé | 3 CNAME DKIM (+ sortir du « sandbox » via une demande à AWS) |

(Valeurs relevées en 2026 : si le site du service indique autre chose, c'est lui
qui a raison.)

### Étape 3 — Tester EN LOCAL avant de toucher à la prod

1. Dans le `.env` **local** du projet, remplacer les lignes SMTP par :
   ```
   SMTP_PROVIDER=cpanel
   SMTP_HOST=<host du tableau>
   SMTP_PORT=<port du tableau>
   SMTP_USER=<user>
   SMTP_PASS=<mot de passe / clé>
   EMAIL_FROM=contact@psi.dz
   ```
   (`cpanel` = le mode « SMTP générique » du code : il utilise juste HOST/PORT.
   Ne pas mettre `brevo`, ce mode est spécifique à Brevo.)
2. Lancer `npm run dev`, ouvrir http://localhost:3000/admin/login et se connecter
   avec le compte **radja@psi.dz**.
3. **Radja reçoit le code ?**
   - ✅ Oui → passer à l'étape 4.
   - ❌ Non → regarder les logs du service (souvent la même erreur 550 : ses IP
     sont aussi bloquées par Icosnet). Inutile de basculer la prod : seul Icosnet
     peut régler le problème.
4. Remettre les valeurs Brevo dans le `.env` local ensuite (ou garder, au choix).

### Étape 4 — Basculer la prod

1. Vercel → **Settings → Environment Variables** → modifier les 6 variables avec
   les mêmes valeurs que le test local (environnement **Production**).
2. Vercel → **Deployments** → dernier déploiement → **⋯ → Redeploy**
   (les variables ne sont prises en compte qu'au redéploiement).
3. Vérifier : se connecter avec un compte @psi.dz et un compte Gmail → les deux
   doivent recevoir le code. Vérifier aussi les logs du nouveau service.

### Étape 5 — Revenir sur Brevo (quand Icosnet a débloqué)

1. Remettre les 6 valeurs Brevo notées à l'étape 0 dans Vercel → **Redeploy**.
2. Tester une connexion avec un compte @psi.dz.
3. Les enregistrements DNS du service temporaire peuvent rester (inoffensifs) ou
   être supprimés ; si un `include:` a été ajouté dans le SPF, le retirer.

### Pendant qu'on est sur un autre service

- Surveiller le **plafond journalier** de l'offre gratuite (voir tableau plus haut) :
  au-delà, plus aucun mail ne part jusqu'au lendemain, codes de connexion compris.
- Tous les mails passent par le nouveau service (pas seulement ceux vers @psi.dz).

---

## Comptes exemptés du code de connexion (temporaire)

Paramètres → Utilisateurs → fiche de la personne → **Sécurité** →
« Désactiver le code de connexion par email ». Le compte se connecte alors avec le
**mot de passe seul** (badge rouge « ⚠ Sans code » dans la liste des utilisateurs).

- [ ] Désactiver le code pour **Radja** et **Karim** (après le déploiement).
- [ ] **Les réactiver** dès que les mails @psi.dz arrivent de nouveau
      (Icosnet débloqué, ou autre service d'envoi en place) : même bouton,
      « Réactiver le code de connexion par email ».

Pendant ce temps, leur compte n'est protégé que par le mot de passe : leur
conseiller un mot de passe solide et unique (réinitialisable depuis la même fiche).

---

## Plus tard : code via une application d'authentification (au lieu du mail)

**Objectif** : ne plus dépendre des mails pour se connecter. Le code à 6 chiffres
est généré par une appli sur le téléphone (Google Authenticator, Microsoft
Authenticator, Authy…), fonctionne **sans internet** et change toutes les 30 s.
Plus sûr que le code par email, et le problème Icosnet/Brevo ne pourrait plus
bloquer les connexions.

**Ce que ça change pour l'équipe**
- Une seule fois : installer l'appli, puis dans le dashboard (Profil → Sécurité)
  **scanner un QR code**.
- À chaque connexion : mot de passe, puis le code affiché dans l'appli.
- Le code par email reste disponible **en secours** (téléphone perdu, etc.).

**Travail côté code (à demander à Claude — quelques heures)**
- Base : champs `totpSecret` (chiffré) et `totpEnabledAt` sur `User` (migration).
- Profil : page « Activer l'application d'authentification » → QR code + saisie
  d'un premier code pour confirmer. Bouton « Désactiver » (avec mot de passe).
- Connexion : si l'appli est activée → demander le code de l'appli au lieu
  d'envoyer un mail ; lien « Recevoir plutôt un code par email ».
- Admin : pouvoir **réinitialiser** l'appli d'un utilisateur (téléphone perdu).
- Codes de secours à usage unique (8 codes à imprimer/garder) — optionnel.
- Bibliothèque : `otplib` (standard TOTP, compatible toutes les applis) + `qrcode`.

**Limites à connaître**
- Téléphone perdu / changé sans transfert de l'appli → il faut qu'un admin
  réinitialise, ou utiliser le code email / un code de secours.
- L'heure du téléphone doit être correcte (réglage automatique), sinon codes refusés.
- Chaque personne doit faire l'activation une fois : prévoir 5 min par personne.

---

## Statistiques du site public : idées à faire plus tard

Déjà en place (fenêtre « Voir le détail » de la carte Site public) : visites,
visiteurs en ligne maintenant, clics WhatsApp, villes, produits consultés, vues par
catégorie. Tout ce qui suit est **gratuit**.

### 1. Mots tapés sur Google — Google Search Console (config ~15 min)

Montre les recherches Google qui amènent sur psi.dz (« rouleau thermique Alger »…),
la position du site dans Google et les pages mal référencées.

- [ ] search.google.com/search-console (même compte Google que Google Analytics) →
      **Ajouter une propriété** → type **Domaine** → `psi.dz`.
- [ ] Copier l'enregistrement **TXT** affiché → cPanel → Zone Editor → psi.dz →
      Add Record (type TXT, nom `psi.dz.`) → revenir cliquer **Valider**.
      (Ne pas toucher au TXT SPF existant : c'est un enregistrement **en plus**.)
- [ ] Search Console → **Paramètres → Utilisateurs et autorisations → Ajouter** :
      `psi-ga4-service@psi-analytics-503922.iam.gserviceaccount.com`, droit **Restreint**.
- [ ] console.cloud.google.com (projet `psi-analytics-503922`) → **API et services →
      Bibliothèque** → « Google Search Console API » → **Activer**.
- [ ] Prévenir Claude → il ajoute le bloc « Mots tapés sur Google » dans la fenêtre.

Limites : premières données **2-3 jours** après validation ; Google masque les
recherches trop rares → avec peu de trafic, liste courte au début.

### 2. Microsoft Clarity — cartes de chaleur + enregistrements de visites

Gratuit et illimité. Montre **où les visiteurs cliquent**, **jusqu'où ils descendent**
dans chaque page, et permet de **revoir des visites** comme une vidéo (champs de
formulaire masqués automatiquement). Détecte aussi les clics de frustration.

- [ ] clarity.microsoft.com → se connecter (compte Microsoft ou Google) →
      **New project** → nom `PSI site`, URL `https://psi.dz`.
- [ ] Récupérer l'**ID du projet** (Settings → Overview, ~10 caractères).
- [ ] Donner l'ID à Claude → il ajoute le script **uniquement sur le site public**
      (pas sur l'admin), comme Google Analytics.
- [ ] Optionnel : Clarity → Settings → **Google Analytics integration** pour relier les deux.
- [ ] Mentionner Clarity et Google Analytics dans les **mentions légales / politique de
      confidentialité** du site (enregistrement des visites = données de navigation).

Limites : les enregistrements sont gardés **30 jours** (sauf ceux marqués favoris) ;
ne remplace pas Google Analytics (pas les mêmes chiffres), ça le complète.

### 3. Autres KPI possibles dans la fenêtre (sans config, juste du code)

- [ ] **D'où viennent les visiteurs** : Google, direct, Facebook/Instagram, WhatsApp…
- [ ] **Mobile / ordinateur / tablette**.
- [ ] **Demandes envoyées depuis le site** : devis envoyés, commandes passées, ajouts
      au panier, formulaire de contact → « combien de visiteurs deviennent des
      demandes » et quelles catégories en génèrent le plus. (Démarre à zéro au
      déploiement, pas d'historique.)
- [ ] **Produits consultés vs produits commandés** : repérer ceux qui intéressent
      mais ne se vendent pas.
