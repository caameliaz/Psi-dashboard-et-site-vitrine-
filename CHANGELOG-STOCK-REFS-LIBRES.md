# Réfs libres : cycle de vie stock aligné sur les produits (2026-10-26)

Avant : une réf libre (ligne de commande/devis sans fiche produit) n'avait qu'une colonne
`available`, ne se décrémentait jamais à la commande et n'avait ni Réservé, ni En livraison,
ni En retour. Tout partait directement en production.

## Données
- `FreeTextRecipe` (qui porte déjà le stock par libellé exact) gagne `reserved`, `inDelivery`,
  `returned` (à côté de `available`).
- Migration : `prisma/migrations/20261026120000_free_text_stock_columns`.
  En local : `npx prisma migrate deploy` puis `npx prisma generate`.

## Logique (`src/lib/order-stock.ts`)
- `reserveFreeStock` / `releaseFreeReserved` : disponible ⇄ réservé (réservé jamais négatif).
- `reallocateFreeStock(label)` (exportée) : redistribue le disponible aux commandes/devis en
  attente de production sur ce libellé, FIFO (priorité d'abord), puis `checkCompletion`.
- `confirmStock` (lignes libres) : prend d'abord le disponible (→ réservé). Tout couvert →
  `FROM_STOCK`, sans production. Sinon seul le manquant part en production
  (`neededQuantity = manquant`, `resolvedQuantity = part prise sur le stock`).
- `releaseOrderItemStock` (annulation, retrait de ligne) : réservé → disponible, puis
  `reallocateFreeStock`.
- `deliverStock` : le réservé baisse du montant livré (plafonné au réservé existant).
- `returnStock` : `returned` += quantité (upsert de la ligne si elle n'existe pas).

## Routes
- `production-list/[id]` (PATCH, ligne libre) : les pièces produites pour la commande passent
  en Réservé de la réf libre.
- `orders/[id]` et `quotes/[id]` (modification d'une commande confirmée) : les lignes libres
  sont recréées → leur stock réservé est libéré avant suppression (sinon perdu).
- `stock/free-refs` : GET renvoie les 4 colonnes ; POST accepte `field` pour « Correction »
  (available | reserved | inDelivery | returned) ; un réapprovisionnement ou une correction du
  disponible relance `reallocateFreeStock`.
- `free-text-recipes` : GET ne liste que les réfs avec une recette (la table porte aussi du
  stock) ; DELETE efface seulement la recette si la réf a du stock.

## UI (`src/app/admin/stock/page.tsx`)
- Onglet « Réfs libres » : colonnes Disponible, Réservé, Total, En livraison, En retour, Statut.
- Modale « Gérer le stock » : Correction avec choix du champ.

## Limites connues
- Pas de seuil/buffer ni de liste d'achat pour les réfs libres : le manquant va en production.
- Corriger le Réservé à la baisse ne retire pas la couverture aux commandes (contrairement
  aux produits, cf. `reassessProductReserved`).
- « Mettre disponible malgré le manque » (force) ne réserve rien : à la livraison le réservé
  est plafonné, donc jamais négatif.
- Non testé en conditions réelles : seul `tsc --noEmit` a été passé.
