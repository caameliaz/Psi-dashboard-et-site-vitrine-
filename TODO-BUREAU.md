# À faire au bureau

## 1. Pousser (pas encore fait)
- [ ] Tester après déploiement : commande avec prix ≠ catalogue, date de règlement passée (→ Livrée), pop-up téléphone sur client existant, modification d'une commande livrée (admin).
- [ ] Pousser sans le suivi panier (code écrit mais pas encore testé, non poussé : `cart-tracking`, `cart-stats`, `cartStore`, checkout, quote, `SiteVisitsModal`, `analytics/details`). Deux migrations partent : `cart_session` (table inutilisée tant que le code panier n'est pas poussé) et `order_client_phone`.
- ⚠️ Ne pas créer de commande/devis en local avant le déploiement (colonne `clientPhone` absente en prod).

## 2. Urgent : psi.dz pointe au mauvais endroit
Sitejet (cPanel) squatte le domaine ; `www.psi.dz` est bon, seule la racine est fausse.
- [ ] Vercel → Settings → Domains → cliquer `psi.dz` → noter l'IP demandée (souvent `76.76.21.21`, à vérifier).
- [ ] cPanel → Zone Editor → modifier la ligne A `psi.dz.` : remplacer `216.198.79.1` par cette IP.
- [ ] Si Sitejet (brouillon) bloque encore : le supprimer du domaine dans cPanel.
- [ ] Vérifier que https://psi.dz affiche le site Vercel.
- Ne pas toucher : `www`, `mail`, `ftp`, `cpanel`… ni suivre la popup « nameservers ».

## 3. Urgent : mails @psi.dz rejetés
Icosnet refuse l'IP Brevo (`550 … listed as abusive`). Gmail marche.
- [ ] Dépanner : mettre une adresse Gmail sur les comptes @psi.dz (Radja, Karim).
- [ ] Appeler Icosnet : autoriser `include:spf.brevo.com` / ne plus rejeter sur UCEPROTECT.
- [ ] Ticket Brevo envoyé, attendre.
- [ ] Sans nouvelle en quelques jours : changer de service d'envoi (Resend, Mailjet, SMTP2GO) — Claude peut le brancher, il suffit de changer les variables SMTP dans Vercel (noter d'abord les valeurs Brevo) et d'ajouter 2-3 DNS dans cPanel.
- ⚠️ Brevo → Sécurité → Adresses IP autorisées : laisser **Désactivé**.
- [ ] Temporaire : « Désactiver le code de connexion » pour Radja et Karim, **à réactiver** dès que les mails arrivent.

## 4. Référencement Google
- [ ] **Google Business Profile** : business.google.com, compte de l'entreprise. Nom **SARL Paper Solutions Industry** (identique partout), catégorie, adresse (Centre El Qods, Niveau M1, Chéraga) ou zone de service, téléphone, `https://psi.dz`, horaires. Valider (courrier, téléphone ou vidéo, jusqu'à quelques semaines), puis description, photos, premiers avis. À faire après le point 2.
- [ ] **Search Console** : propriété Domaine `psi.dz`, valider par TXT dans cPanel, ajouter `psi-ga4-service@psi-analytics-503922.iam.gserviceaccount.com` (droit Restreint), activer « Google Search Console API » dans le projet `psi-analytics-503922`, prévenir Claude.

## 5. Stats du site
- [ ] **Exclure le bureau de Google Analytics** (depuis le réseau du bureau) : noter l'IP sur whatismyip.com → Admin → Flux de données (`G-7VJG0M6KY5`) → Définir le trafic interne (nom `Bureau PSI`, IP) → Filtres de données → « Internal Traffic » de Test à **Actif**.
- [ ] **Microsoft Clarity** (plus tard) : créer le projet sur clarity.microsoft.com, donner l'ID à Claude, mentionner Clarity et Analytics dans les mentions légales.

## Plus tard
- Code de connexion par appli d'authentification (Google Authenticator) au lieu du mail : à demander à Claude, quelques heures.
- Suivi des paniers du site public (code prêt, non poussé) : à tester puis pousser. Idée ensuite : relance WhatsApp des paniers abandonnés (téléphone tapé avant l'abandon).
- Stats : provenance des visiteurs, mobile/ordinateur, demandes envoyées depuis le site, produits consultés vs commandés.
