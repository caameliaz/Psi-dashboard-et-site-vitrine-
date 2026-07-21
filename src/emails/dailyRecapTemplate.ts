import { renderCards, renderHeader, renderItemsTable, wrapEmail, type RecapCardData, type RecapItem, type RenderedEmail } from './shared';

export type DailyRecapItem = RecapItem;

export interface DailyRecapData {
  dateLabel: string;
  commandes: RecapCardData;
  devis: RecapCardData;
  items: DailyRecapItem[];
  adminUrl: string;
}

export function dailyRecapTemplate({ dateLabel, commandes, devis, items, adminUrl }: DailyRecapData): RenderedEmail {
  const total = commandes.total + devis.total;
  const subject = `Récap quotidien PSI — ${dateLabel} (${total} demande${total !== 1 ? 's' : ''})`;

  const body = `
    ${renderHeader(`Récapitulatif du ${dateLabel}`, `${total} demande${total !== 1 ? 's' : ''} reçue${total !== 1 ? 's' : ''} aujourd'hui`, adminUrl)}
    ${renderCards(commandes, devis)}
    ${renderItemsTable(items)}`;

  const html = wrapEmail(body);

  const text = [
    `Récapitulatif PSI — ${dateLabel}`,
    '',
    `Commandes : ${commandes.total}${commandes.breakdown.map((b) => ` (${b.statut}: ${b.count})`).join('')}`,
    `Devis : ${devis.total}${devis.breakdown.map((b) => ` (${b.statut}: ${b.count})`).join('')}`,
    '',
    ...(items.length > 0
      ? items.map((i) => `${i.type} ${i.ref} · ${i.client} · ${i.statut} · ${i.montant}`)
      : ['Aucune commande ni devis la veille.']),
    '',
    `Ouvrir l'admin : ${adminUrl}`,
  ].join('\n');

  return { subject, html, text };
}
