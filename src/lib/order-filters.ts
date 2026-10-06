// Les commandes source = ROLLINK (créées par POST /api/rolllink/commandes) ne servent qu'à la
// logique de stock (réservation, production, achat). RollLink a sa propre facturation : elles ne
// doivent JAMAIS entrer dans le chiffre d'affaires, les compteurs ni les listes de PSI Dash.
// → tout calcul de CA / stats / liste "normale" doit inclure l'un de ces filtres.
// (Order.source n'est pas nullable : `not` suffit. À NE PAS utiliser pour le stock, la production
// et l'achat, qui doivent continuer à voir ces commandes.)

/** Filtre `where` d'un `prisma.order.*`. */
export const WHERE_HORS_ROLLINK = { source: { not: 'ROLLINK' } } as const;

/** Filtre `where` d'un `prisma.orderItem.*` (passe par la commande parente). */
export const ITEM_WHERE_HORS_ROLLINK = { order: WHERE_HORS_ROLLINK } as const;

/** Filtre `where` d'un `prisma.order.*` pour ne garder QUE les commandes RollLink (toggle). */
export const WHERE_ROLLINK_SEULEMENT = { source: 'ROLLINK' } as const;
