// Réglages et modèles PAR DÉFAUT, repris des PDF actuels (F 021/2026 et BL016-2026). Tout est ensuite modifiable
// par les admins dans Réglages → Documents ; « Revenir au modèle d'origine » remet ces valeurs.
import { DEFAULT_STAMP_DUTY } from './stamp-duty';
import type { DocumentKind, DocumentSettingsData, DocumentTemplateConfig, TemplateColumn, TemplateField } from './types';

const f = (id: string, label: string, enabled = true): TemplateField => ({ id, label, enabled });
const col = (id: string, label: string, enabled = true): TemplateColumn => ({ id, label, enabled });

export const DEFAULT_DESIGNATION = ['Rouleau papier thermique blanc', 'Grammage papier : 55 gr/m²', 'Origine papier Europe (Germany)', 'Mandrin en plastique'].join('\n');

export const DEFAULT_SETTINGS: DocumentSettingsData = {
  psi: {
    name: 'Sarl Paper Solutions Industry',
    addressHeader: 'Centre des affaire El Qods, niveau M1',
    city: 'Cheraga- Alger',
    addressFooter: 'Centre des affaires EL QODS, Niveau 5 Cheraga, Alger',
    phone: '+213 770 169 060',
    rc: '26B 1022595-00/16',
    nif: '00 2616102259525',
    nis: '0 026 1650 00805 45',
    rib: 'SGA 021 00003 113007539116',
  },
  vatRate: 19,
  defaultPaymentMethod: 'Virement/Chèque',
  stampDuty: DEFAULT_STAMP_DUTY,
  numberFormats: { FACTURE: 'F {seq:3}/{year}', BL: 'BL{seq:3}{suffix}-{year}', PROFORMA: 'FP-{seq:2}-{year}' },
  defaultDesignation: DEFAULT_DESIGNATION,
};

const FOOTER_LEGAL = [
  'Sarl PAPER SOLUTIONS INDUSTRY   RC: 26B 1022595-00/16   Nif: 002616102259525   Nis: 0 026 1650 00805 45',
  'RIB: SGA/ 021 00003 113007539116',
  'Centre des affaires EL QODS, Niveau 5 Cheraga, Alger   Tel: +213770169060',
];

const PARTY_PSI_FACTURE = [f('name', ''), f('address', 'Adresse:'), f('phone', 'Telephone:'), f('rc', 'RC:'), f('nif', 'Nif:'), f('nis', 'Nis:'), f('rib', 'RIB:')];
const PARTY_CLIENT_FACTURE = [f('name', ''), f('address', 'Adresse:'), f('rc', 'RC:'), f('nif', 'Nif:'), f('nis', 'Nis:'), f('ai', 'AI:')];
const COLS_PRIX = [col('ref', 'Références'), col('designation', 'Désignation'), col('laize', 'Laize(mm)'), col('metrage', 'Métrage(m)'), col('quantity', 'Quantité (nbre rouleaux)'), col('unitPrice', 'PU H.T'), col('amount', 'Montant HT')];

export const DEFAULT_TEMPLATES: Record<DocumentKind, DocumentTemplateConfig> = {
  BL: {
    title: 'BON DE LIVRAISON',
    showLogo: true,
    showQr: true,
    headerFields: [f('number', 'N° BL:'), f('date', 'Date:')],
    partyA: { enabled: true, title: 'Fournisseur', fields: [f('name', ''), f('address', 'Adresse:')] },
    partyB: { enabled: true, title: 'Client:', fields: [f('name', ''), f('address', 'Adresse:')] },
    orderLine: { enabled: true, label: 'Commande du' },
    columns: [col('ref', 'Références'), col('designation', 'Désignation'), col('laize', 'Laize(mm)'), col('quantity', 'Quantité (nbre rlx)'), col('observation', 'Observation')],
    totals: { enabled: false, labelHt: 'TOTAL HT', labelVat: 'TVA', labelTtc: 'TOTAL TTC', labelStamp: 'Timbre' },
    amountInWords: { enabled: false, label: '' },
    deliveryInfo: { enabled: true, dateLabel: 'Date de livraison :', placeLabel: 'Lieu de livraison :' },
    signatures: { enabled: true, leftLabel: 'Signature et cachet du Client', rightLabel: 'Fournisseur' },
    notes: { enabled: false, text: '' },
    footer: { enabled: true, lines: FOOTER_LEGAL },
    customFields: [],
  },
  FACTURE: {
    title: 'FACTURE',
    showLogo: true,
    showQr: false,
    headerFields: [f('number', 'N° Facture:'), f('date', 'Date Facture:'), f('dueDate', 'Échéance de règlement:'), f('paymentMethod', 'Mode de règlement :')],
    partyA: { enabled: true, title: 'Entreprise:', fields: PARTY_PSI_FACTURE },
    partyB: { enabled: true, title: 'Client:', fields: PARTY_CLIENT_FACTURE },
    orderLine: { enabled: true, label: 'Commande du' },
    columns: COLS_PRIX,
    totals: { enabled: true, labelHt: 'TOTAL HT', labelVat: 'TVA 19%', labelTtc: 'TOTAL TTC', labelStamp: 'Timbre' },
    amountInWords: { enabled: true, label: 'Arrêtée la présente facture à la somme de:' },
    deliveryInfo: { enabled: false, dateLabel: '', placeLabel: '' },
    signatures: { enabled: false, leftLabel: '', rightLabel: '' },
    notes: { enabled: false, text: '' },
    footer: { enabled: true, lines: FOOTER_LEGAL },
    customFields: [],
  },
  PROFORMA: {
    title: 'FACTURE PROFORMA',
    showLogo: true,
    showQr: false,
    headerFields: [f('number', 'N° Proforma:'), f('date', 'Date:'), f('validity', 'Validité:'), f('paymentMethod', 'Mode de règlement :')],
    partyA: { enabled: true, title: 'Entreprise:', fields: PARTY_PSI_FACTURE },
    partyB: { enabled: true, title: 'Client:', fields: PARTY_CLIENT_FACTURE },
    orderLine: { enabled: false, label: 'Commande du' },
    columns: COLS_PRIX,
    totals: { enabled: true, labelHt: 'TOTAL HT', labelVat: 'TVA 19%', labelTtc: 'TOTAL TTC', labelStamp: 'Timbre' },
    amountInWords: { enabled: true, label: 'Arrêtée la présente facture proforma à la somme de:' },
    deliveryInfo: { enabled: false, dateLabel: '', placeLabel: '' },
    signatures: { enabled: false, leftLabel: '', rightLabel: '' },
    notes: { enabled: false, text: '' },
    footer: { enabled: true, lines: FOOTER_LEGAL },
    customFields: [],
  },
};
