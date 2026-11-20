// Document d'exemple pour l'aperçu en direct de Réglages → Documents (modèle + réglages → faux document rempli).
import { computeTotals } from './calc';
import { formatDocumentNumber } from './numbering';
import type { DocLine, DocumentData, DocumentKind, DocumentSettingsData, DocumentTemplateConfig, RenderableDocument } from './types';

export function sampleDocument(type: DocumentKind, template: DocumentTemplateConfig, settings: DocumentSettingsData, qrSvg?: string): RenderableDocument {
  const p = settings.psi;
  const year = new Date().getFullYear();
  const lines: DocLine[] = [
    { ref: 'PT-07', designation: settings.defaultDesignation, laize: '57', metrage: '60', quantity: 3200, unitPrice: 93.3, observation: '100 Cartons de 30 rouleaux' },
    { ref: 'PT-04', designation: settings.defaultDesignation, laize: '80', metrage: '80', quantity: 500, unitPrice: 120, observation: '' },
  ];
  const data: DocumentData = {
    date: new Date().toISOString(),
    psi: { name: p.name, address: [p.addressHeader, p.city].filter(Boolean).join('\n'), phone: p.phone, rc: p.rc, nif: p.nif, nis: p.nis, rib: p.rib },
    client: { name: 'Sarl Exemple Client', address: 'Cité des Orangers N°4\nKouba, Alger', rc: '0972335 B 06', nif: '000 616289044533', nis: '16281230031', ai: '16187286022' },
    psiFooter: [],
    orderRef: 'CMD-16-0070',
    orderDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    lines,
    vatRate: settings.vatRate,
    paymentMethod: settings.defaultPaymentMethod,
    deliveryDate: '', deliveryPlace: '', showQr: true,
    totals: computeTotals(lines, settings.vatRate, settings.defaultPaymentMethod, settings.stampDuty),
  };
  return {
    type,
    number: formatDocumentNumber(settings.numberFormats[type], 23, year),
    template, data, qrSvg,
    customFields: Object.fromEntries(template.customFields.map((f) => [f.id, f.defaultValue ?? 'Exemple'])),
  };
}
