# Note pour Camélia — Younes n'a pas pu utiliser son mail de bienvenue

## 1. Le « délai » du mail de bienvenue

**Le mail de bienvenue n'a pas de date limite.** Il contient directement l'email et le mot de passe de Younes (pas de lien à cliquer), et ce mot de passe reste valable tant qu'on ne le change pas.

Ce qui expire vraiment, c'est le **code de connexion à 6 chiffres** envoyé par email à chaque connexion : il est valable **5 minutes** et ne sert qu'une fois (5 essais max). Si Younes parle d'un « délai dépassé », c'est très probablement ce code. Il lui suffit de retaper son email + mot de passe pour en recevoir un nouveau.

## 2. Peut-on renvoyer le mail de bienvenue ?

**Mise à jour : il y a maintenant un bouton « ✉️ Renvoyer le mail de bienvenue »** (profil de l'utilisateur → Sécurité, visible par tout compte qui gère les utilisateurs). Il génère un nouveau mot de passe, l'écrit dans le mail de bienvenue et l'envoie. Le mot de passe s'affiche aussi à l'écran pour le passer par WhatsApp si le mail ne part pas. Le tableau ci-dessous décrit les autres moyens, plus anciens.

Le mot de passe est stocké chiffré : on ne peut pas retrouver l'ancien, seulement en créer un nouveau.

| # | Qui | Où | Ce qui se passe |
|---|-----|----|-----------------|
| 1 | **Camélia** (seule à voir ce bouton) | Réglages → Utilisateurs → ouvrir le profil de Younes → section **Sécurité** → **✉️ Envoyer le mail « erreur résolue »** | Nouveau mot de passe généré et **envoyé directement à Younes** par email, avec un message d'excuse. Le mot de passe s'affiche aussi à l'écran. Si le mail ne part pas, un message d'alerte le dit : envoyer le mot de passe affiché par WhatsApp. |
| 2 | **Younes** | Page de connexion → **Mot de passe oublié ?** | Nouveau mot de passe généré et envoyé automatiquement à Younes. Aucune action d'admin. Limites : 2 demandes par 30 min pour le compte, 5 par 5 min par connexion internet. Tu reçois une notification. |
| 3 | **N'importe quel admin** | Même profil → **🔑 Réinitialiser le mot de passe** | Nouveau mot de passe affiché à l'écran. **Il n'est pas envoyé à Younes** (le mail va uniquement à Camélia), donc il faut le lui transmettre à la main (WhatsApp). |

À savoir :
- Si Younes **ne reçoit aucun mail** (mauvaise adresse, spam, boîte pleine), vérifie son adresse dans son profil. Attention : modifier l'adresse déclenche un autre mail de bienvenue, qui **ne contient pas de mot de passe**.
- Si sa boîte ne reçoit vraiment plus rien, le même profil permet de **désactiver temporairement le code de connexion par email** (il se connecte alors avec le mot de passe seul). À réactiver ensuite.

## 3. Ce que fait Younes dans l'app

**Je ne peux pas le savoir depuis le code.** Son compte n'existe que dans la base de production : le code ne contient aucune trace de lui, ni de son rôle ni de ses permissions. Pour le voir : Réglages → Utilisateurs → profil de Younes. Ce qu'il peut faire dépend des cases cochées, parmi :

- voir les commandes et devis, modifier les statuts, assigner une commande
- voir ou modifier les fiches clients
- voir ou modifier les produits
- voir ou modifier le stock, voir les listes d'achat et de production, voir le stock par commercial
- voir l'historique, recevoir les récaps par email
- modifier le contenu du site, gérer les utilisateurs
- « voir tous les clients » (sans cette case, un commercial ne voit que **ses** clients et **ses** commandes)
- lecture seule (bloque toute modification)

Réglage par défaut d'un employé : voir les commandes, modifier les statuts, voir les clients, voir les produits, voir l'historique.

## 4. Ce que Younes voit sur mobile

**Barre verte en bas de l'écran**, avec seulement les entrées auxquelles il a droit :

| Entrée | Condition |
|--------|-----------|
| Dashboard | toujours |
| Créer (commande ou devis rapide) | toujours, sauf compte en lecture seule |
| Commandes | « voir les commandes » |
| Clients | « voir les clients » |
| Stock | « voir le stock » ou « voir les listes d'achat/production » |

En haut : bouton retour, logo PSI, activation des notifications push, cloche de notifications et **icône profil**.

**Profil sur mobile** : l'icône profil ouvre « Mon profil » (infos, changement de mot de passe, notifications, installation de l'app, bouton « Se déconnecter »). Younes peut donc changer son mot de passe depuis son téléphone.

**Pages réservées à l'ordinateur** : Produits et Réglages (donc Utilisateurs). Sur mobile, elles affichent « Cette page est sur ordinateur » avec un bouton « Retour au menu » qui ramène au dashboard.

**Installation de l'app** : sur mobile, tant que l'app n'est pas installée, une pop-up propose de l'installer (« Plus tard » la masque 7 jours).
- Il n'y a pas de bouton « Installer » : la pop-up explique la marche à suivre, de la même façon sur les deux téléphones. Le bouton « OK, compris » la masque 7 jours. Le rappel reste dans Profil → Application.
- Android : menu ⋮ du navigateur → « Installer l'application » (ou « Ajouter à l'écran d'accueil »). Dans WhatsApp, Facebook ou Instagram, la pop-up demande d'abord d'ouvrir la page dans Chrome.
- iPhone : Partager → « Sur l'écran d'accueil », dans Safari uniquement.
- Une fois l'app installée, l'utilisateur touche l'icône téléphone en haut pour activer les notifications.

**Dashboard d'un commercial** (sans « voir tous les clients/ventes ») : ses propres commandes, devis, clients et ventes, filtrés côté serveur. Les visites du site n'apparaissent que pour les comptes qui ont « voir/modifier le contenu du site ». Les listes d'achat et de production n'apparaissent que s'il a « voir le stock » ou « voir les listes d'achat/production ».
