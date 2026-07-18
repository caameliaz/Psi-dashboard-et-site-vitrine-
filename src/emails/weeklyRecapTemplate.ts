import { renderCards, renderHeader, renderItemsTable, wrapEmail, type RecapCardData, type RecapItem, type RenderedEmail } from './shared';

export interface WeeklyRecapData {
  weekLabel: string;
  commandes: RecapCardData;
  devis: RecapCardData;
  items: RecapItem[];
  adminUrl: string;
}

export function weeklyRecapTemplate({ weekLabel, commandes, devis, items, adminUrl }: WeeklyRecapData): RenderedEmail {
  const total = commandes.total + devis.total;
  const subject = `Bilan hebdomadaire PSI — ${weekLabel} (${total} demande${total !== 1 ? 's' : ''})`;

  const body = `
    ${renderHeader('Bilan de la semaine', weekLabel, adminUrl)}
    ${renderCards(commandes, devis)}
    ${renderItemsTable(items)}`;

  const html = wrapEmail(body);

  const text = [
    `Bilan hebdomadaire PSI — ${weekLabel}`,
    '',
    `Commandes : ${commandes.total}${commandes.breakdown.map((b) => ` (${b.statut}: ${b.count})`).join('')}`,
    `Devis : ${devis.total}${devis.breakdown.map((b) => ` (${b.statut}: ${b.count})`).join('')}`,
    '',
    ...(items.length > 0
      ? items.map((i) => `${i.type} ${i.ref} · ${i.client} · ${i.statut} · ${i.montant}`)
      : ['Aucune commande ni devis cette semaine.']),
    '',
    `Ouvrir l'admin : ${adminUrl}`,
  ].join('\n');

  return { subject, html, text };
}
