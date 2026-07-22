# Manuel d'utilisation — Espace de gestion PSI

**Site public :** psi.dz
**Espace de gestion :** psi.dz/admin

---

## 1. Se connecter

1. Ouvrir **psi.dz/admin**
2. Saisir son **email** et son **mot de passe**
3. Un **code à 6 chiffres** arrive par email → le saisir

> Le code expire au bout de 5 minutes. S'il n'arrive pas, vérifier les spams,
> puis utiliser « Renvoyer le code ».

**Mot de passe oublié ?** Cliquer sur le lien en bas de la page de connexion :
un nouveau mot de passe est envoyé immédiatement par email.

**Changer son mot de passe :** menu *Profil* → *Changer le mot de passe*.

---

## 2. Le tableau de bord

C'est la page d'accueil. Elle affiche en un coup d'œil :

- **Commandes / Devis du mois** et l'évolution par rapport au mois précédent
- **Ventes du mois** en dinars — filtrable par commercial
- **Objectif mensuel** avec barre de progression
- **Post-it** : commandes du jour, en attente, confirmées
- **Répartition** des demandes par source (site web / manuel)
- **Top produits** les plus vendus

Les chiffres se mettent à jour **automatiquement**, sans recharger la page.

---

## 3. Commandes et devis

### Créer une commande

1. Menu **Commandes** → bouton **+ Nouveau**
2. Choisir *Commande* ou *Devis*
3. Renseigner le client : **entreprise, téléphone, wilaya et commune** sont obligatoires
   *(si le client existe déjà, il est proposé automatiquement pendant la saisie)*
4. Ajouter les produits : catégorie → référence → métrage → quantité → prix
   *(le prix et le métrage se remplissent seuls selon la référence choisie)*
5. Choisir le **commercial** responsable
6. Facultatif : n° de facture, mode de paiement, date de règlement
7. **Enregistrer**

> Un n° de facture commençant par **F** active automatiquement la TVA sur le document.

### Suivre une commande

Les demandes sont triées : **En attente** en haut, puis **Confirmé**, **Livré**, **Annulé**.

Cliquer sur une ligne ouvre le détail, d'où l'on peut :

| Action | Effet |
|---|---|
| **Confirmer** | passe la commande en *Confirmé* |
| **Marquer Livré** | clôture la commande |
| **Annuler** | motif obligatoire |
| **Modifier** | changer les produits, quantités, prix |
| **Notes** | commentaire interne, visible par l'équipe |
| **WhatsApp / Email** | contacter le client avec un modèle de message |
| **Imprimer / Excel** | générer le bon de commande |

### Importer d'anciennes ventes

Menu **Commandes** → **Importer** (ordinateur uniquement).
Le fichier Excel doit contenir : Date, N° Facture, Client, Commercial, Wilaya,
Référence, Quantité, Prix Unitaire, Montant, Mode Paiement, Date Règlement.

---

## 4. Clients

Menu **Clients** : toutes les fiches, avec recherche, filtre par secteur et tri.

Une fiche client contient :

- Coordonnées, wilaya, commune, secteur d'activité
- **Historique complet** des commandes et devis
- **Notes internes** (fil horodaté, visible par toute l'équipe)
- Boutons **Appeler**, **WhatsApp**, **Email**
- **Export** de la fiche en PDF ou Excel

**Ajouter un client :** bouton *+ Nouveau client*.
**Importer une liste :** bouton *Importer Excel* (ordinateur uniquement).

> **Désactiver plutôt que supprimer.** Un client désactivé disparaît de la liste
> mais son historique est conservé. Il est réactivé automatiquement s'il
> repasse commande.

---

## 5. Produits

Menu **Produits** : le catalogue affiché sur le site public.

1. Cliquer sur **✎ Modifier** pour activer le mode édition
2. Sélectionner une catégorie à gauche
3. Ajouter ou modifier les références : dimensions, métrage, prix, utilisation
4. Ajouter une **photo** de catégorie (visible sur le site)
5. Remplir la **fiche technique** : grammage, origine, mandrin, papier, couleur

> **Interrupteur vert = visible sur le site.** Désactiver une référence la retire
> du site sans effacer l'historique des ventes.
> Un produit déjà vendu ne peut pas être supprimé — seulement désactivé.

---

## 6. Notifications

- **Cloche** en haut à droite : nouvelles commandes, devis, changements de statut,
  assignations. Cliquer sur une notification ouvre directement l'élément concerné.
- **Sur téléphone** : activer dans *Profil* → *Notifications système*
  pour recevoir les alertes même l'application fermée.
- **Par email** : récapitulatif automatique chaque jour à **20h** et bilan chaque
  **jeudi soir**. Réservé aux administrateurs et aux employés autorisés.

---

## 7. Utilisateurs et autorisations

Menu **Utilisateurs** (administrateurs uniquement).

**Créer un compte :** *+ Nouvel utilisateur* → nom, email, rôle, autorisations.
Le mot de passe est généré automatiquement et envoyé par email à la personne.

**Les autorisations** se cochent une par une :

| Autorisation | Permet de |
|---|---|
| Voir les commandes & devis | consulter les demandes |
| Modifier les statuts | confirmer, livrer, annuler |
| Assigner | attribuer une demande à un commercial |
| Ré-assigner le client | rattacher une demande à un autre client |
| Voir / Modifier les clients | consulter ou éditer les fiches |
| Voir / Modifier les produits | consulter ou éditer le catalogue |
| Voir l'historique | consulter le journal des actions |
| Recevoir les récaps par email | recevoir les bilans automatiques |
| Modifier le contenu du site | éditer les textes du site public |
| Gérer les utilisateurs | créer et modifier les comptes |

> Pour modifier les autorisations : ouvrir la fiche → **Modifier** → cocher → enregistrer.

**Réservé aux administrateurs**, quelles que soient les cases cochées :
supprimer définitivement un client · définir les objectifs mensuels ·
voir l'historique de toute l'équipe.

---

## 8. Sur le terrain (téléphone)

Se connecter depuis un téléphone ouvre un **menu simplifié** :
consulter les demandes du jour, créer une commande rapide, appeler un client.

Toutes les pages restent accessibles via le menu ☰.

---

## 9. Le site public

Les clients peuvent, depuis **psi.dz** :

- Consulter le catalogue et les fiches techniques
- Ajouter au panier et **passer commande**
- Demander un **devis**
- Contacter l'entreprise

Toute commande ou demande de devis arrive **immédiatement** dans l'espace de gestion,
et l'équipe reçoit une notification.

Les textes du site (présentation, contact, réseaux sociaux) se modifient depuis
le menu **Contenu**.

---

## 10. Questions fréquentes

**Le code de connexion n'arrive pas**
Vérifier les spams. Sinon « Renvoyer le code ».

**J'ai oublié mon mot de passe**
Lien en bas de la page de connexion — un nouveau est envoyé immédiatement.

**Une commande a disparu de la liste**
Vérifier les filtres (période, statut, responsable) en haut de la page.

**Je ne vois pas un menu**
Les menus dépendent des autorisations. Contacter un administrateur.

**Comment supprimer un client ?**
Le **désactiver** — l'historique des ventes est conservé.
Seul un administrateur peut supprimer définitivement.

**La page met du temps à charger**
Après une longue inactivité, la première requête prend 1 à 2 secondes.
C'est normal.

---

*PSI — Paper Solutions Industry · Centre El Qods, Niveau M1 — Chéraga, Alger*
