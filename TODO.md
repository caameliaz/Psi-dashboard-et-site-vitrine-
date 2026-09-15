# TODO — à reporter sur la vraie base de données de PRODUCTION

Ce fichier liste les actions faites sur la base de **test** (Neon, celle du `.env`
de ce repo) qui doivent être **rejouées manuellement sur la vraie DB de prod**
de l'entreprise avant/au moment du déploiement de cette branche.

---

## 0. TOUTES les migrations Prisma de cette branche — ⚠️ à ne jamais oublier

**Avant tout déploiement de cette branche sur la vraie base de prod**, il faut
appliquer TOUTES les migrations créées sur cette branche, pas seulement celle
détaillée au point 1 ci-dessous. Une seule commande les applique toutes, dans
l'ordre, automatiquement :

```bash
npx prisma migrate deploy
```

(jamais `migrate dev` en prod — `dev` peut proposer un reset si Prisma détecte
une divergence entre le schéma et la base).

**Migrations créées sur cette branche à ce jour :**
- `20260913192116_add_client_assignment_and_leave` (détail au point 1)
- `20260915191048_add_product_visible_on_site` — ajoute `Product.visibleOnSite`
  (booléen, `DEFAULT true`) : indépendant de `active`, contrôle si le produit
  est affiché sur le site public sans toucher à sa disponibilité dans le
  dashboard. Non-destructive, tous les produits existants restent visibles.

Si d'autres migrations sont ajoutées plus tard sur cette branche, elles seront
listées ici aussi — mais `prisma migrate deploy` les applique de toute façon
toutes automatiquement, dans l'ordre, sans qu'il faille les lister une par une
à la main pour que ça marche. Cette liste sert juste à savoir ce qui a changé.

**Vérifier AVANT de lancer la commande** : que `DATABASE_URL`/`DIRECT_URL`
pointent bien vers la vraie base de prod (pas la base de test), sinon la
commande s'exécute sur la mauvaise base.

---

## 1. Migration Prisma — `add_client_assignment_and_leave` (détail)

**Quoi :** ajoute la notion de client assigné à un employé + la gestion des congés/intérim.

**Contenu de la migration** (`prisma/migrations/20260913192116_add_client_assignment_and_leave/migration.sql`) :
- Nouvelle colonne `Client.assignedToId` (nullable, clé étrangère vers `User`, `ON DELETE SET NULL`)
- Nouvelle table `LeaveAssignment` (congés/intérim)
- Nouvel enum `LeaveStatus` (`ACTIVE` / `ENDED`)

**Pourquoi il faut la rejouer sur la prod (et pas juste laisser Prisma le faire tout seul) :**
- Cette migration a été créée et testée sur la DB de test, PAS sur la DB de prod.
- Elle est **non-destructive** : `assignedToId` est nullable (aucune ligne existante
  cassée), et `LeaveAssignment` est une table entièrement nouvelle. Aucune donnée
  n'est supprimée ni modifiée par cette migration en elle-même.
- Cependant, il faut vérifier `prisma migrate deploy` (jamais `migrate dev` en
  prod — `dev` peut proposer un reset si Prisma détecte une divergence) sur la
  vraie base avant que le code de cette branche soit mis en ligne, sinon l'app
  en prod plantera dès qu'elle essaiera de lire/écrire `Client.assignedToId`
  ou `LeaveAssignment` qui n'existeront pas encore côté base.

**Commande à lancer côté prod (avec la vraie `DATABASE_URL`/`DIRECT_URL` en env) :**
```bash
npx prisma migrate deploy
```

---

## 2. Clés VAPID (notifications push) — rappel

**Quoi :** une nouvelle paire de clés VAPID de test a été générée en local pour
ne pas envoyer de notifications aux vrais employés pendant les tests (cf. `.env`,
section "Clés de TEST").

**Pourquoi c'est listé ici :** aucune action à faire côté prod — les clés de PROD
n'ont PAS été touchées (juste commentées en référence dans le `.env` local, qui
n'est de toute façon jamais commité — voir `.gitignore`). Ce point est juste
noté pour mémoire, à retirer de ce TODO si confirmé inutile.

---

## 3. Fonctionnalité "clients assignés + congés/intérim" — données initiales

Une fois la migration appliquée en prod, il faudra probablement :
- Assigner manuellement (ou via un script ponctuel) les clients existants à
  leur commercial habituel (`Client.assignedToId`), sinon ils n'apparaîtront
  chez personne tant qu'un admin ne les aura pas assignés.
- Vérifier avec l'équipe si un script de reprise (ex: déduire `assignedToId`
  depuis les commandes/devis déjà `assignedToId` historiques) est souhaité au
  lieu d'une ressaisie manuelle.

---

## 4. Numérotation des commandes/devis importés — EN ATTENTE de la vraie liste de ventes

**Statut : pas encore implémenté, en attente d'info.**

**Décision actée (15/09)** :
- Le numéro de référence, une fois attribué, **ne doit jamais être retouché**
  rétroactivement (déjà potentiellement imprimé/envoyé aux clients).
- L'ordre chronologique réel s'obtient en triant par **date** (`createdAt`,
  déjà correctement réglée à la vraie date de vente lors d'un import — cf.
  `src/app/api/ventes/import/route.ts`), **pas** par le numéro de référence.
  Le numéro sert d'identifiant unique, pas d'indicateur d'ordre.
- Le fichier Excel importé a normalement un numéro de commande **identique
  au numéro de facture** (pas de colonne séparée) — à utiliser tel quel comme
  référence de la commande importée, plutôt que d'en générer un nouveau,
  **une fois confirmé avec la vraie liste de ventes de l'entreprise**.

**Reste à faire une fois la vraie liste de ventes disponible :**
1. Confirmer le nom exact de la colonne "N° facture / commande" dans le vrai fichier.
2. Modifier `src/app/api/ventes/import/route.ts` pour utiliser ce numéro comme
   `ref` de la commande/devis importé (au lieu de laisser `ref: null` comme
   actuellement) — attention aux doublons/collisions avec des refs déjà
   attribuées par le système normal (`CMD-xx-xxxx`), à vérifier selon le
   format réel des numéros historiques de l'entreprise.
3. Corriger le compteur de `src/lib/generate-ref.ts` (actuellement basé sur
   `prisma.order.count()`, cassé par les imports sans ref) — cf. discussion
   du 13-14/09 : soit un compteur dédié en base (solide), soit `MAX` sur les
   refs existantes (plus simple, léger risque de collision en cas d'accès
   simultanés). Décision reportée, à trancher avec l'exemple réel en main.
