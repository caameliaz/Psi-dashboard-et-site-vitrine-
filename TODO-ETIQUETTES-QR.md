# TODO — Étiquettes colis + QR code « Valider la réception »

Statut : **plan validé, rien n'est encore codé.**
Les modifs supplémentaires (demandes du responsable) sont à ajouter en section 9.

---

## 1. Objectif

- Chaque **commande** et chaque **devis** peut produire une **étiquette** (fidèle au modèle PSI : titre FR/AR, logo, schéma du rouleau, tableau, adresse) avec un **QR code**.
- Le client scanne le QR sur son colis → page publique (sans connexion) avec le **récapitulatif** (produits + quantités) et un bouton **« Valider la réception »**.
- Le clic passe automatiquement la commande en **Livré** (comme si un admin l'avait fait : date de livraison, stock, historique, notifications).

## 2. Décisions déjà prises

| Sujet | Décision |
|---|---|
| Plusieurs produits | **Une seule étiquette par commande** ; chaque produit = **une ligne de plus dans le tableau** |
| Nombre d'étiquettes | Choisi à l'impression (1 par colis) ; en lot : un nombre **par commande** dans une fenêtre |
| Format | **3 formats au choix avant l'impression** : A4 / étiquettes adhésives / imprimante thermique |
| Titre | **Français** ; l'arabe est cherché par Claude puis **validé par toi** avant mise en ligne |
| Impression | **Possible à tout moment**, quel que soit le statut (commande ou devis) |
| Validation client | **Seule action restreinte par statut** (voir 4) |
| Page publique | Contenu **comme l'étiquette** : produits, caractéristiques, quantités. **Aucun prix**, aucun téléphone, aucune adresse |
| Sécurité du QR | Jeton **aléatoire long** (jamais la référence ni l'id) ; le lien ne permet que de lire le récap et de valider |

## 3. Base de données

- [ ] `Order.receiptToken` et `Quote.receiptToken` : `String? @unique`
- [ ] Migration Prisma (à ajouter à la liste des migrations à rejouer en prod, cf. `TODO.md` §0)
- [ ] Jeton créé **à la première impression** (pas de reprise des anciennes commandes)

## 4. Règles de la validation client

- [ ] Autorisée seulement si statut **Validée** ou **Produite** (à confirmer pour les devis : mêmes statuts)
- [ ] Déjà livrée → message « Réception déjà confirmée le … », pas de 2e validation
- [ ] En attente / Contactée / Annulée / Retournée → message « pas encore prête / non disponible », bouton masqué
- [ ] Commande **RollLink** : jamais livrable dans PSI Dash → pas de bouton
- [ ] Étape de confirmation (« Êtes-vous sûr ? ») pour éviter un clic par erreur
- [ ] Limitation de débit sur les routes publiques (`src/lib/rate-limit.ts`)
- [ ] Effets identiques à un passage en Livré admin : `deliveredAt`, `deliverStock`, historique (« Réception confirmée par le client (QR) »), notification aux admins + commercial assigné

## 5. API

- [ ] Route publique : lecture du récap par jeton (sans prix ni coordonnées)
- [ ] Route publique : validation de la réception par jeton
- [ ] Route admin : obtenir/créer le jeton d'une commande ou d'un devis
- [ ] Vérifier que le proxy (`src/proxy.ts`) laisse bien passer ces routes sans session

## 6. Page publique `/r/[token]`

- [ ] Mobile d'abord, en français (arabe éventuel plus tard)
- [ ] Référence + produits + caractéristiques + quantités (comme l'étiquette)
- [ ] Bouton « Valider la réception » + états (déjà reçue, indisponible, succès)

## 7. Étiquette

- [ ] Composant fidèle au modèle : titre FR + AR, logo `public/logo-psi-transparent.png`, schéma du rouleau, tableau **Laize / Grammage / Mandrin Ø / Mètres / Nbre rouleaux**, adresse « Centre des affaires El Qods - Cheraga - ALGER · Tél : 0770169060 · contact@psi.dz »
- [ ] QR code (nouvelle dépendance `qrcode`)
- [ ] Vérifier où sont stockés laize / grammage / mandrin / mètres (champs personnalisés produit ?)
- [ ] Une ligne de tableau par produit ; gérer le cas « beaucoup de lignes » (réduction de police)
- [ ] Titre : « Rouleaux de Papier Thermique … » pour le thermique ; nom du produit en FR pour les autres ; **arabe à valider avec toi**
- [ ] Police compatible arabe dans la fenêtre d'impression
- [ ] Les 3 formats : dimensions à confirmer (hypothèse : thermique/adhésive 100×100 mm, A4 = plusieurs étiquettes par page)
- [ ] Option possible : numéro de colis « 2/5 » sur chaque étiquette

## 8. Interface admin

- [ ] Bouton **« Imprimer étiquettes »** dans le panneau d'une commande/devis (`RequestPanel`) → fenêtre : nombre d'étiquettes + format
- [ ] **Sélection multiple** dans la liste (`admin/requests/page.tsx`, qui n'en a pas) : cases à cocher + barre d'actions
- [ ] Fenêtre d'impression en lot : nombre d'étiquettes **par commande** + format
- [ ] Fenêtre d'impression dédiée (`@page`, une étiquette par page/case)
- [ ] Permissions : définir qui peut imprimer (à confirmer)

## 9. Autres modifs (demande du responsable) — Papier médical visible sur le site

**Ce que demande le responsable** : rendre visibles sur le site public les **3 références du papier médical** (photo avec les appareils) et les présenter en **« secteur médical »**, **sans prix** et avec **« Demander un devis »** au lieu de « Ajouter au panier ».

| Réf. (photo) | Désignation | Format |
|---|---|---|
| RT-ECG-001 | Papier thermique ECG | 50 mm × 30 m |
| RT-ECO-002 | Papier thermique Échographie | 110 mm × 20 m |
| RT-MED-003 | Papier thermique médical standard | 80 mm × 20 m |

**Précision de Camélia :** ces références **existent déjà** dans une catégorie « médical » qui n'est **pas visible** sur le site public. On n'ajoute donc pas de nouveau produit : on **rend publiques les 3 réfs** et on traite cette catégorie comme un **cas particulier**.

**Comment ça marche aujourd'hui (vérifié dans le code) :**
- Chaque produit a un interrupteur `visibleOnSite` (admin → Produits). L'accueil n'affiche une catégorie que si elle contient au moins un produit **actif ET visible** avec largeur/longueur > 0 (`CategoryBrowser.tsx`).
- Donc : rendre les 3 réfs visibles (admin, sans code) → la catégorie apparaît toute seule.
- Mais elle apparaîtrait **avec prix et bouton « Ajouter au panier »** : c'est ça qu'il faut changer (code).

**✅ Code fait (8 nov. 2026, non commité, migration pas encore appliquée)** : champ `Category.quoteOnly` + migration `20261108120000_category_quote_only` ; interrupteur « Sur devis uniquement » dans l'admin Produits (modifier la description de la catégorie) ; accueil, page catégorie et page devis adaptés ; prix mis à 0 côté serveur (page d'accueil + `/api/products`) ; commande publique refusée pour ces produits. **Reste :** appliquer la migration, régler les données dans l'admin (voir ci-dessous), tester, puis rejouer en prod.

**État de la base de test (lu le 8 nov.)** : catégorie « Papier thermique medical » = 4 produits, tous masqués, prix 0 : PT-007 (50/20), PT-008 (57/15), PT-009 (57/20), PT-010 (110/20). Ça ne correspond pas exactement aux 3 réfs du responsable (50×30, 110×20, 80×20) → à trancher.

**À faire :**
- [ ] **Admin (sans code)** : activer « visible sur le site » sur les 3 réfs ; mettre la photo des appareils sur la catégorie ; nom de catégorie du type « Rouleaux thermiques – Secteur médical »
- [ ] **Identifier la catégorie** : ajouter un champ `Category.quoteOnly` (migration) + interrupteur dans l'admin des catégories → plus robuste qu'un test sur le nom « médical » (à valider)
- [ ] **Accueil** (`CategoryBrowser.tsx`) : si `quoteOnly` → pas de prix (ligne ~211), pas de compteur de quantité, bouton **« Demander un devis »** à la place de « Ajouter au panier » (ligne ~139)
- [ ] **Page catégorie** (`products/[id]/page.tsx`) : pas de prix unitaire ni de total (lignes ~245 et ~270), même bouton « Demander un devis »
- [ ] **Carte produit** (`ProductCard.tsx`) : même traitement
- [ ] **Vraiment cacher les prix** : ne pas les envoyer à la page publique (`/api/products`, props de l'accueil, sitemap), sinon visibles dans le code source de la page
- [ ] **Bloquer le panier** pour ces produits (store + page checkout) en plus du masquage des boutons
- [ ] Bouton « Demander un devis » → `/quote`, idéalement avec la référence pré-sélectionnée (à vérifier dans `/quote`)
- [ ] Vérifier que la catégorie apparaît dans les 6 affichées sur l'accueil (`limit={6}`, tri par nom) sinon elle n'est que dans « Voir tout »
- [ ] Textes FR dans `src/lib/i18n/fr.ts`
- [ ] Rendu mobile
- [ ] Prod : refaire le réglage (visibilité + photo + interrupteur) sur la vraie base ; ajouter la migration à la liste de `TODO.md` §0

## 10. Vérification et livraison

- [ ] Lint + TypeScript
- [ ] Test du parcours complet : impression → scan → validation → statut Livré + stock + historique + notification
- [ ] Tester les cas : déjà livrée, annulée, RollLink, jeton invalide, devis
- [ ] Rejouer la migration en production
- [ ] Commit/push : **fait par toi** (Claude donne les commandes)

## 11. Points encore ouverts

- ✅ Fichier de l'étiquette reçu : `Carton MOON MOBIL 57-60 METRES-64 rlx.pdf` (à la racine). Logo : déjà dans `public/` (`Logo PSI-avectexte.jpeg`, `logo-psi-transparent.png`) ; schéma du rouleau à extraire du PDF ou redessiner.
- ✅ Domaine du QR : `https://www.psi.dz`.
- Dimensions exactes des 3 formats (hypothèse actuelle : 100×100 mm thermique/adhésive, A4 = plusieurs par page).
- Traduction arabe pour les produits non thermiques.
- Papier médical : nom exact de la catégorie « médical », codes exacts des 3 réfs en base, photo d'origine en bonne qualité, flag `quoteOnly` OK ou test sur le nom ?
