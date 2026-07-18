import type { RecapCardData } from '@/emails/shared';

export const DB_TO_UI: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE: 'En attente',
  VALIDE: 'Confirmé',
  LIVRE: 'Livré',
  ANNULE: 'Annulé',
};

const STATUS_ORDER = ['En attente', 'Confirmé', 'Livré', 'Annulé'];

/** Carte récap : total + répartition par statut (uniquement les statuts présents). */
export function buildCard(records: { status: string }[]): RecapCardData {
  const counts: Record<string, number> = {};
  for (const r of records) {
    const label = DB_TO_UI[r.status] ?? r.status;
    counts[label] = (counts[label] ?? 0) + 1;
  }
  const breakdown = Object.entries(counts)
    .map(([statut, count]) => ({ statut, count }))
    .sort((a, b) => STATUS_ORDER.indexOf(a.statut) - STATUS_ORDER.indexOf(b.statut));
  return { total: records.length, breakdown };
}
