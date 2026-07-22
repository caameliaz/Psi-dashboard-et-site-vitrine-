import type { RequestDetail } from '@/components/ui/RequestPanel';

// ── Source de vérité UNIQUE pour convertir une commande/devis (format base)
//    en RequestDetail (format du panneau de détail).
//
// ⚠️ Avant, cette logique était dupliquée dans /admin/requests ET /admin/clients :
// les deux versions ont divergé (assignation, référence libre, métrage… manquants
// côté fiche client). Toute évolution doit se faire ICI, et nulle part ailleurs.

/** Statut en base → libellé affiché. */
export const DB_TO_UI: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE: 'En attente',
  VALIDE: 'Confirmé',
  LIVRE: 'Livré',
  ANNULE: 'Annulé',
};

/** Libellé affiché → statut en base. */
export const UI_TO_DB: Record<string, string> = {
  'En attente': 'EN_ATTENTE',
  'Confirmé': 'VALIDE',
  'Livré': 'LIVRE',
  'Annulé': 'ANNULE',
};

/**
 * Lignes produits. Une référence LIBRE n'a pas de produit lié :
 * son libellé est alors dans `description`.
 */
function toItems(rawItems: any[]): NonNullable<RequestDetail['items']> {
  return (rawItems ?? []).map((i: any) => {
    const base = i.product?.reference ?? i.product?.ref ?? i.description ?? '?';
    return {
      designation: i.metrage != null ? `${base} · ${i.metrage} m` : base,
      categorie: i.product?.category?.name ?? '',
      quantite: i.quantity ?? 0,
      prixUnitaire: i.unitPrice ?? 0,
      metrage: i.metrage ?? null,
    };
  });
}

/** Coordonnées client à utiliser quand la commande ne les porte pas
 *  (cas de la fiche client : elles viennent de la fiche elle-même). */
export interface ClientFallback {
  client?: string;
  entreprise?: string;
  telephone?: string;
  wilaya?: string;
  commune?: string;
  adresse?: string;
  email?: string;
}

/** Commande (format base) → RequestDetail. */
export function orderToDetail(o: any, fallback?: ClientFallback): RequestDetail {
  const phone =
    o.client?.phones?.find((p: any) => p.primary)?.number ??
    o.client?.phones?.[0]?.number ??
    fallback?.telephone ??
    '';
  const items = toItems(o.items);
  const produits = items.map((i) => `${i.designation} × ${i.quantite}`).join(', ') || '—';
  const total = items.reduce((acc, i) => acc + i.quantite * i.prixUnitaire, 0);

  return {
    id: o.id,
    ref: o.ref ?? o.id.slice(0, 8).toUpperCase(),
    type: 'Commande',
    source: o.source ?? 'SITE',
    client: o.clientName || o.client?.name || fallback?.client || '—',
    entreprise: o.clientCompany || o.client?.company || fallback?.entreprise || '—',
    telephone: phone,
    wilaya: o.client?.wilaya ?? o.clientWilaya ?? fallback?.wilaya ?? '',
    commune: o.clientCommune ?? o.client?.commune ?? fallback?.commune ?? '',
    adresse: o.client?.address ?? fallback?.adresse ?? '',
    email: o.client?.email ?? fallback?.email ?? '',
    produits,
    items,
    montant: total > 0 ? `${total.toLocaleString('fr-FR')} DA` : '—',
    statut: DB_TO_UI[o.status] ?? o.status,
    assignedToId: o.assignedTo?.id ?? o.assignedToId ?? null,
    assignedToName: o.assignedTo?.name ?? null,
    invoiceNumber: o.invoiceNumber ?? null,
    paymentMethod: o.paymentMethod ?? null,
    paymentDate: o.paymentDate ? new Date(o.paymentDate).toLocaleDateString('fr-FR') : null,
    vatEnabled: Boolean(o.vatEnabled),
    // `tva` pilote les documents exportés (bon de commande, PDF) : on le
    // renseigne depuis vatEnabled pour n'avoir QU'UNE source de vérité.
    tva: Boolean(o.vatEnabled),
    salesRepName: o.salesRepName ?? null,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Devis (format base) → RequestDetail. */
export function quoteToDetail(q: any, fallback?: ClientFallback): RequestDetail {
  const phone =
    q.client?.phones?.find((p: any) => p.primary)?.number ??
    q.client?.phones?.[0]?.number ??
    fallback?.telephone ??
    '';
  const items = toItems(q.items);
  const produits = items.map((i) => `${i.designation} × ${i.quantite}`).join(', ') || '—';

  return {
    id: q.id,
    ref: q.ref ?? q.id.slice(0, 8).toUpperCase(),
    type: 'Devis',
    source: q.source ?? 'SITE',
    client: q.clientName || q.client?.name || fallback?.client || '—',
    entreprise: q.clientCompany || q.client?.company || fallback?.entreprise || '—',
    telephone: phone,
    wilaya: q.client?.wilaya ?? q.clientWilaya ?? fallback?.wilaya ?? '',
    commune: q.clientCommune ?? q.client?.commune ?? fallback?.commune ?? '',
    adresse: q.client?.address ?? fallback?.adresse ?? '',
    email: q.client?.email ?? fallback?.email ?? '',
    produits,
    items,
    montant: q.proposedPrice ? `${Number(q.proposedPrice).toLocaleString('fr-FR')} DA` : 'Sur devis',
    statut: DB_TO_UI[q.status] ?? q.status,
    assignedToId: q.assignedTo?.id ?? q.assignedToId ?? null,
    assignedToName: q.assignedTo?.name ?? null,
    invoiceNumber: q.invoiceNumber ?? null,
    paymentMethod: q.paymentMethod ?? null,
    paymentDate: q.paymentDate ? new Date(q.paymentDate).toLocaleDateString('fr-FR') : null,
    vatEnabled: Boolean(q.vatEnabled),
    // `tva` pilote les documents exportés (bon de commande, PDF) : on le
    // renseigne depuis vatEnabled pour n'avoir QU'UNE source de vérité.
    tva: Boolean(q.vatEnabled),
    salesRepName: q.salesRepName ?? null,
    date: new Date(q.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(q.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    message: q.message ?? '',
  };
}
