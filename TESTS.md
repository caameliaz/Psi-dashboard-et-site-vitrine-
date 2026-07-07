# PSI — Tests des workflows

Compte	Mot de passe	Rôle
admin1@psi.dz	psi2026	Admin (tout)
admin2@psi.dz	psi2026	Admin (tout)
employe1@psi.dz	psi2026	Employé complet
employe2@psi.dz	psi2026	Employé limité (lecture seule)

Guide simple pour tester l'app avant de livrer. On suit les étapes dans l'ordre, workflow par workflow.


## ➕ Créer une commande / devis à la main

**Depuis /admin/requests :**
1. Cliquer **+ Nouvelle demande**
2. Choisir "Commande", remplir le client (nom, wilaya, téléphone)
3. Choisir un produit dans la liste → le prix se remplit tout seul
4. (Optionnel) activer TVA 19 % → le total se recalcule
5. Valider → la commande apparaît avec le badge "Manuel"
6. Refaire pareil en choisissant "Devis" → apparaît dans l'onglet Devis

**Depuis une fiche client :**
1. Aller dans `/admin/clients` → ouvrir une fiche → **Nouvelle commande**
2. Le client est déjà pré-rempli
3. Valider → apparaît dans /requests ET dans l'historique du client

---

## 🔎 Filtres et recherche (/admin/requests)

1. Onglet "Tous" → commandes + devis mélangés, en attente en haut
2. Onglet "Commandes" → seulement les commandes
3. Onglet "Devis" → seulement les devis
4. Filtre statut "Confirmé" → seulement les confirmés
5. Changer la période (Ce mois / 3 derniers mois / Tout)
6. Rechercher par entreprise → filtre en direct
7. Rechercher par numéro (ex "CMD-") → filtre par référence
8. Bouton **Effacer** → remet tous les filtres à zéro

---

## 👥 Clients

1. `/admin/clients` → tous les clients s'affichent (même ceux sans commande)
2. Rechercher par nom / entreprise / wilaya
3. Cliquer un client → sa fiche s'ouvre (infos + historique)
4. Cliquer une ligne de l'historique → ouvre le détail de cette commande
5. Modifier le client → les changements sont sauvegardés
6. Créer un client → apparaît dans la liste
7. Supprimer un client → fenêtre de confirmation → le client part, ses commandes/devis restent
8. ⚠️ Si la suppression est impossible → un **message clair** s'affiche (pas une erreur bizarre)

---

## 🗑️ Suppressions — vérifier les messages (important, corrigé récemment)

1. Supprimer un **produit qui n'est utilisé nulle part** → marche
2. Supprimer un **produit déjà dans des commandes** → message "Impossible : produit utilisé, désactivez-le plutôt" (pas d'erreur brute)
3. Supprimer une **catégorie qui contient des produits** → message "Impossible : X produits dans cette catégorie"
4. Supprimer un **utilisateur qui a créé des commandes/notes** → message "Impossible, désactivez-le plutôt"
5. Essayer de supprimer **son propre compte** → refusé avec message
6. Supprimer un **client** (même avec des messages de contact) → doit marcher maintenant

---

## 🔔 Notifications (avec 2 comptes ouverts)

1. Un toast apparaît en haut à droite quand il y a du nouveau
2. Le toast disparaît après quelques secondes (ou au clic)
3. La cloche montre le nombre de non-lus
4. Dans le panneau : les non-lus ont un fond coloré
5. Cliquer une notif → passe en "lue"
6. Bouton "Tout marquer lu" → la cloche se vide
7. Quand l'**Employé** fait une action → l'**Admin** reçoit la notif
8. Quand l'**Admin** fait une action → l'**Employé** reçoit la notif
9. ⚠️ Celui qui fait l'action ne reçoit **jamais** sa propre notif

---

## 📊 Exports Excel

**Rapport de ventes :**
1. Cliquer **Rapport de ventes** → un fichier `.xlsx` se télécharge
2. Il contient seulement les commandes **Livrées**
3. Une ligne par produit, avec une colonne "Source" (Site web / Manuel)
4. Une ligne TOTAL en bas

**Export du tableau :**
1. Filtrer puis cliquer **Exporter** → télécharge le tableau tel qu'affiché
2. Vérifier les colonnes + le récap en bas

---

## 🏠 Dashboard

1. Le **post-it jaune** affiche : la date du jour, les stats du jour, "X livrées ce mois" en bas
2. Le **camembert** montre les produits, avec la légende à droite
3. Passer la souris sur un morceau du camembert → une **petite carte blanche** suit la souris (produit + % + quantité)
4. La carte **Origine** montre la répartition Site web / Manuel
5. Le tableau du bas montre les dernières demandes
6. Cliquer une ligne → ouvre le détail
7. Faire une nouvelle commande depuis le site → le dashboard se met à jour tout seul (sans rafraîchir)

---

## 📸 Photos produits (nouveau)

1. Dashboard → **Produits** → **Nouveau produit** (ou Modifier un produit existant)
2. Cliquer sur la zone photo → choisir une image → elle s'affiche en aperçu
3. Enregistrer
4. Aller sur le **site public** `/products` → la photo apparaît sur la carte du produit
5. Un produit **sans** photo → garde le visuel par défaut (cercles verts)

---

## 🔐 Page de connexion (nouveau)

1. Se déconnecter → la page login s'affiche **sans la barre latérale** (sidebar)
2. La carte de connexion est **grande et centrée**, avec le logo, fond dégradé vert
3. Se reconnecter → tout marche normalement

---

## 🔒 Sécurité (à tester, corrigé récemment)

1. En **Employé**, essayer de modifier/supprimer un produit → refusé (403)
2. En **Employé**, essayer de supprimer un utilisateur → refusé
3. **Sans être connecté**, essayer d'accéder à `/api/orders` → refusé (401)
4. **Sans être connecté**, essayer de créer/supprimer une catégorie → refusé (corrigé : avant c'était ouvert à tous ⚠️)

---

## 🎫 Permissions employé (nouveau — à bien tester)

Se connecter en **`employe2@psi.dz`** (employé limité) et comparer avec **`admin1@psi.dz`** :

1. **Sidebar** → l'employé limité voit **moins de menus** (pas Produits/Contenu/Utilisateurs selon ses droits)
2. **Produits** (si accès) → l'employé sans "modifier produits" ne voit **pas** les boutons Nouveau/Modifier/Supprimer
3. **Commande** → l'employé sans "modifier statuts" ne voit **pas** les boutons Confirmer/Livrer/Annuler/Modifier
4. **Test API direct** (optionnel) → même en connaissant l'URL, l'employé est bloqué (403) sur une action interdite
5. L'**admin** (`admin1`) → voit et peut TOUT (toutes les permissions)

👉 Comparaison clé : `employe2` (limité) doit clairement pouvoir faire **moins** que `admin1`.

---

## 👤 Utilisateurs (Admin seulement)

1. Créer un employé → les autres admins reçoivent une notif
2. Modifier le rôle d'un compte → pris en compte à sa prochaine connexion
3. Désactiver un compte → ce compte ne peut plus se connecter

**Changer les permissions d'un employé existant :**
1. En admin (`admin1@psi.dz`) → menu **Utilisateurs**
2. Cliquer sur un employé (ex: **Employé Limité**) → sa fiche s'ouvre → **Modifier**
3. Cocher/décocher des permissions (ex: donner "Modifier les produits") → **Enregistrer**
4. Dans la fenêtre où l'employé est connecté → **se déconnecter et se reconnecter**
5. ⚠️ Après reconnexion → l'employé a les nouvelles permissions (nouveaux menus/boutons apparaissent)
   *(le changement n'est PAS instantané dans une session déjà ouverte — il faut se reconnecter, c'est normal)*

---

## ✅ Avant de livrer — check final

1. Toutes les sections ci-dessus testées
2. Aucune erreur rouge dans le terminal du serveur
3. `npx next build` passe sans erreur *(déjà vérifié ✓)*
4. Les notifications marchent bien entre 2 comptes
5. Supprimer un client ne casse pas ses commandes
6. Les permissions employé fonctionnent (employé limité ≠ admin)
7. Modifier une commande (quantités/produits) marche
8. Photos produits visibles sur le site public
9. Page login sans sidebar + agrandie
10. La base contient les 4 comptes (2 admins + 2 employés)

---

## 📌 Rappel — les statuts possibles

- **Commande** : En attente → Confirmé → Livré (ou → Annulé → Restaurer)
- **Devis** : En attente → Confirmé → Converti en commande (ou → Annulé → Restaurer)
