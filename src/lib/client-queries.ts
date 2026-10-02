// Include « fiche complète » d'un client (dernières commandes/devis avec leurs lignes) :
// partagé entre GET /api/clients (liste historique) et GET /api/clients/[id]?record=true,
// pour que la fiche renvoie EXACTEMENT la même forme que la liste (cf. dbClientToRecord).
export const CLIENT_RECORD_INCLUDE = {
  deactivatedBy: { select: { name: true } },
  assignedTo: { select: { id: true, name: true } },
  sector: { select: { id: true, name: true } },
  phones: true,
  _count: { select: { orders: true, quotes: true } },
  orders: {
    select: {
      id: true, ref: true, createdAt: true, status: true, source: true,
      assignedTo: { select: { id: true, name: true } },
      items: {
        select: {
          quantity: true, unitPrice: true, description: true, metrage: true,
          product: { select: { reference: true } },
          stockPath: true, resolvedQuantity: true,
          purchaseListItem: { select: { status: true } },
          productionListItem: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
  quotes: {
    select: {
      id: true, ref: true, createdAt: true, status: true, proposedPrice: true, source: true,
      assignedTo: { select: { id: true, name: true } },
      items: {
        select: {
          quantity: true, description: true, metrage: true,
          product: { select: { reference: true } },
          stockPath: true, resolvedQuantity: true,
          purchaseListItem: { select: { status: true } },
          productionListItem: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
} as const;
