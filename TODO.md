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

**Fait sur la base de test (16/09)** : 93 clients sur 97 assignés automatiquement
à leur commercial (déduit du commercial unique et cohérent trouvé dans leurs
commandes/devis historiques). Reste volontairement non assigné :
- **Aquarium** — 2 commerciaux différents dans son historique (KARIM D. et
  Bilal B.), à trancher manuellement par l'utilisatrice via le bouton
  réassigner déjà existant dans l'app (`ClientAssignmentPanel`/`/api/clients/assign`).
- **3 clients** sans aucune commande/devis avec commercial renseigné (créés
  sans historique de vente rattaché).

**Une fois la migration appliquée en prod**, il faudra rejouer la même
opération sur la vraie base (même logique : déduire `assignedToId` du
commercial unique trouvé dans l'historique commandes/devis de chaque client),
puis trancher manuellement les cas ambigus comme Aquarium.

---

## 4. Numérotation des commandes/devis importés — FAIT (16/09)

**Statut : implémenté et appliqué sur la base de test.**

**Décision actée (15/09), maintenant en place :**
- Le numéro de référence, une fois attribué, **ne doit jamais être retouché**
  rétroactivement (déjà potentiellement imprimé/envoyé aux clients).
- L'ordre chronologique réel s'obtient en triant par **date** (`createdAt`,
  déjà correctement réglée à la vraie date de vente lors d'un import — cf.
  `src/app/api/ventes/import/route.ts`), **pas** par le numéro de référence.
  Le numéro sert d'identifiant unique, pas d'indicateur d'ordre.
- Quand le fichier Excel importé a un numéro de facture, il est repris **tel
  quel** comme référence de la commande/devis (si non déjà pris par une autre
  commande/devis) ; sinon une référence est générée dans le même format que
  le reste de l'app (`CMD-xx-xxxx` / `DEV-xx-xxxx`).

**Fait :**
1. `src/lib/generate-ref.ts` corrigé : le compteur reposait sur
   `prisma.order.count()` (global, toutes wilayas confondues) alors que le
   numéro généré est **par wilaya** (`CMD-16-0001`) — dès qu'une commande
   d'une autre wilaya existait, ou qu'un import laissait des `ref: null`, le
   compteur se désynchronisait (ex. réf `CMD-No-0001` observée en prod de
   test). Remplacé par un `MAX` sur les refs existantes du même préfixe
   (`CMD-16-`, `DEV-31-`...), robuste aux trous.
2. `src/app/api/ventes/import/route.ts` modifié : chaque commande/devis créé
   reçoit désormais une vraie `ref` à la création (n° de facture repris s'il
   est libre, sinon généré via `generateOrderRef`/`generateQuoteRef`) — ne
   laisse plus jamais `ref: null`.
3. **Rattrapage ponctuel sur les 119 commandes/devis déjà importés
   manuellement (session du 16/09)** : script one-off exécuté pour leur
   attribuer une `ref` selon la même règle (facture reprise si libre, sinon
   générée) — 12 ont repris leur n° de facture, 107 ont reçu une référence
   générée. Ce rattrapage n'a pas besoin d'être refait : c'est le code
   ci-dessus qui s'applique pour tout import futur.

**Reste à faire une fois la vraie base de prod migrée** : rejouer le même
rattrapage ponctuel sur les commandes/devis de prod qui auraient été importés
sans `ref` avant ce correctif (si applicable).
