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

## 3. Mails @psi.dz rejetés — réglé (3 oct 2026, selon toi)
- [ ] Vérifier que les mails arrivent bien sur les comptes @psi.dz (Radja, Karim) : création de compte, code de connexion, mot de passe oublié.
- [ ] **Réactiver le code de connexion** (double authentification) pour Radja et Karim s'il a été désactivé temporairement.
- [ ] Si tu avais mis une adresse Gmail sur leurs comptes à titre de dépannage : remettre leur adresse @psi.dz.
- ⚠️ Brevo → Sécurité → Adresses IP autorisées : laisser **Désactivé**.

## 4. Référencement Google (suivi)
Fait le 3 octobre 2026 : Search Console (propriété Domaine `psi.dz` vérifiée, sitemap `https://www.psi.dz/sitemap.xml` envoyé), titres/descriptions par page en français (en ligne), `/cart` et `/checkout` en `noindex`, fiche Google Business validée (SARL Paper Solutions Industry, catégorie Manufacturer + Paper Distributor). `psi.dz` redirige bien vers `www.psi.dz` (point 2 réglé).
⚠️ Ne JAMAIS supprimer le TXT `google-site-verification=…` dans cPanel (sinon Google retire la vérification).

**À vérifier**
- [ ] **~6 oct** — Search Console → Sitemaps : statut « Réussite » (et plus « Impossible de récupérer ») + environ 10 pages découvertes. Toujours en erreur après 3 jours → prévenir Claude.
- [ ] **~6 oct** — Search Console → Inspection de l'URL → Demander l'indexation de `https://www.psi.dz`, `/products`, `/quote`, `/contact` (pour les nouveaux titres).
- [ ] **~17 oct** — Google : `site:psi.dz` → titres en français « … | SARL Paper Solutions Industry », plus de « Thermal Paper Solutions », plus de `/cart`.
- [ ] **~17 oct** — Search Console → Pages : nombre de pages indexées, aucune erreur ni page `/admin` ou `/cart` indexée.
- [ ] **~31 oct** — Search Console → Performances : clics, impressions, requêtes qui amènent les visiteurs.
- [ ] **~31 oct** — Google Maps : chercher « SARL Paper Solutions Industry Chéraga » → la fiche apparaît avec le bon nom, téléphone, horaires.
- [ ] **Quand `/cart` a disparu de `site:psi.dz`** — demander à Claude de remettre `/cart` et `/checkout` dans le `Disallow` de `src/app/robots.ts` (volontairement retirés pour que Google lise le `noindex`).
- [ ] **Dans 1 semaine** — Vercel → Usage : « Fast Origin Transfer » n'a pas grimpé anormalement (Google relit plus souvent le site).

**À faire**
- [ ] Fiche Google Business : vérifier les onglets Contact (téléphone +213 770 150 656, site `https://www.psi.dz` avec www), Hours (dim–jeu 8h–17h), Location (point sur le bon bâtiment) ; ajouter photos (local, logo, rouleaux) et produits (rouleaux TPE, rouleaux caisses).
- [ ] Message au responsable (Gmail + validation de la description/adresse/téléphone/horaires). Puis l'ajouter à Search Console (Paramètres → Utilisateurs → **Complet**), et à la fin le passer **Propriétaire** (Search Console) et propriétaire de la fiche Business.
- [ ] Search Console → Paramètres → Associations → **Google Analytics** → Associer (`G-7VJG0M6KY5`).
- [ ] Search Console : ajouter `psi-ga4-service@psi-analytics-503922.iam.gserviceaccount.com` (droit Restreint) + activer « Google Search Console API » dans le projet `psi-analytics-503922`, puis prévenir Claude (pour les stats de recherche dans le dashboard).

**Facultatif (à demander à Claude)**
- Données structurées « Organization » (nom, téléphone, adresse, logo).
- `noindex` sur les pages `/admin`.
- Texte « À propos » du site : dit « transformation et distribution » → reformuler en « fabrication » (Réglages → Contenu du site).
- 44 vulnérabilités Dependabot (GitHub) : trier et mettre à jour les dépendances, une par une, avec tests (pas de `npm audit fix --force`).

## 5. Stats du site
- [ ] **Exclure le bureau de Google Analytics** (depuis le réseau du bureau) : noter l'IP sur whatismyip.com → Admin → Flux de données (`G-7VJG0M6KY5`) → Définir le trafic interne (nom `Bureau PSI`, IP) → Filtres de données → « Internal Traffic » de Test à **Actif**.
- [ ] **Microsoft Clarity** (plus tard) : créer le projet sur clarity.microsoft.com, donner l'ID à Claude, mentionner Clarity et Analytics dans les mentions légales.

## Plus tard
- Code de connexion par appli d'authentification (Google Authenticator) au lieu du mail : à demander à Claude, quelques heures.
- Suivi des paniers du site public (code prêt, non poussé) : à tester puis pousser. Idée ensuite : relance WhatsApp des paniers abandonnés (téléphone tapé avant l'abandon).
- Stats : provenance des visiteurs, mobile/ordinateur, demandes envoyées depuis le site, produits consultés vs commandés.



Référence	Quantité
57/69 (hors catalogue)	8 340
80/80	3 661
80/60	1 010
57/30	690
57/57 (hors catalogue)	600
57/40	408
35/45	240
100/150-2	192
20/40	10
git status --short

# 1) Modification du rôle d'un utilisateur + nom du rôle dans l'Historique
git add src/app/admin/settings/users/page.tsx src/app/admin/settings/history/page.tsx
git commit -m "Modification du role d'un utilisateur: enregistre/retire le role perso, nom du role dans l'historique"

# 2) Journal des pages consultées par les comptes lecture seule (visible de Camelia uniquement)
git add src/lib/audit.ts src/proxy.ts src/app/api/audit/route.ts "src/app/api/users/[id]/route.ts" src/app/api/activity src/components/PageViewTracker.tsx src/components/AdminShell.tsx
git commit -m "Journal des pages consultees par les comptes lecture seule (visible de la proprietaire uniquement)"

git push origin main
git add src/lib/audit.ts src/app/api/audit/route.ts
git commit -m "Journal des connexions et des pages: visible aussi par le compte admin2"
git push origin main
Ton site a déjà un sitemap.xml et un robots.txt générés automatiquement, donc le côté technique est prêt. Le compte Google que tu as créé sert à Google Search Console. Voici la suite.

1. Ajouter ton site dans Search Console

Va sur https://search.google.com/search-console et clique sur « Ajouter une propriété ».
Choisis Domaine et entre psi.dz. Cette option couvre www et sans www.
Google te donne un enregistrement TXT à ajouter dans la zone DNS du domaine, chez ton registrar. Pour un .dz, c'est souvent NIC.dz ou ton hébergeur DNS. Ajoute-le, attends quelques minutes ou quelques heures, puis clique sur « Valider ».
Si tu ne peux pas modifier le DNS, choisis plutôt Préfixe d'URL avec https://www.psi.dz et la méthode « balise HTML ». Dans ce cas, dis-le-moi et j'ajoute la balise dans le code.
2. Envoyer le sitemap
Dans Search Console, ouvre « Sitemaps » et ajoute sitemap.xml. L'adresse complète est https://www.psi.dz/sitemap.xml. Ouvre-la d'abord dans ton navigateur pour vérifier qu'elle s'affiche.

3. Demander l'indexation
Colle https://www.psi.dz dans la barre du haut (« Inspection de l'URL »), puis clique sur « Demander une indexation ». Fais pareil pour /products.

4. Patienter
L'indexation prend de quelques jours à quelques semaines. Pour tester, tape site:psi.dz dans Google.

À vérifier de ton côté

Le domaine www.psi.dz doit bien pointer vers le site sur Vercel. Sinon, le sitemap annonce de mauvaises URLs. Dans ce cas, mets la bonne adresse dans NEXT_PUBLIC_SITE_URL sur Vercel.
Pour t'aider à apparaître sur les recherches locales, crée aussi une fiche Google Business Profile (Google Maps) pour PSI.
Je peux aussi améliorer le SEO dans le code : balise de vérification, metadataBase, titres et descriptions par page, données structurées « Organization ». Dis-moi si tu veux que je le fasse.