
B	Tester en local la logique métier (guide de tests dans TESTS.md)	Maintenant
C	Corriger les petits trucs trouvés → recommit	Au fil des tests
D	Créer compte Vercel + déployer	Quand B/C sont ok
E	Tester en prod (push, emails, cookies)	Après D
F	Entreprise : emails + domaine + import clients	Demain

## Salut, pour que le site puisse envoyer les emails automatiques depuis Contact@psi.dz, il faut activer un réglage sur Microsoft. Peux-tu me dire :

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
  - SMTP_USER=Contact@psi.dz · SMTP_PASS · EMAIL_FROM=Contact@psi.dz · SMTP_PROVIDER=outlook
  - VAPID_PUBLIC · VAPID_PRIVATE · NEXT_PUBLIC_VAPID_PUBLIC  (notifs push — mêmes valeurs que .env local)
  - TRIGGER_* si récap hebdo via Trigger.dev
Code / config :
  - [x] build applique les migrations auto : "build": "prisma migrate deploy && next build"
  - [x] cookies Secure AUTO en prod (useSecureCookies = NODE_ENV==='production') — plus rien à faire
  - [x] headers de sécurité (HSTS/X-Frame/nosniff) + rate limiting (login + routes publiques) en place
  - [ ] activer SMTP AUTH côté Microsoft/Icosnet (voir bloc EMAILS) → sinon emails KO
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
- 9.1 Emails : plus de récap quotidien, récap hebdo jeudi 23h59, expéditeur Contact@psi.dz (Outlook), emails auto création compte ✅
       ⏳ reste externe : activer SMTP AUTH côté Microsoft (voir bloc ci-dessous)
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

📧 EMAILS — bloqueur externe (code prêt, il manque juste l'activation)
> Microsoft refuse l'envoi depuis Contact@psi.dz tant que "SMTP AUTH" n'est pas activé (erreur 535).
> À faire : soit via admin.microsoft.com (compte ADMIN → Utilisateurs → Contact@psi.dz → Courrier → cocher "SMTP authentifié"),
> soit demander à ICOSNET (qui gère le domaine/mails) d'activer SMTP AUTH sur Contact@psi.dz.
> Config app déjà OK : smtp.office365.com:587 STARTTLS, user Contact@psi.dz, mdp dans .env. Si MFA → générer un "mot de passe d'application".


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


# PSI — Guide de tests complet

Guide pour tester **toute l'application** avant de livrer. On suit les sections dans l'ordre, workflow par workflow.
Ce qui est neuf ou corrigé récemment est signalé par ⚠️ / **(nouveau)**.



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


## 🏠 8. Dashboard (`/admin/dashboard`)
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
