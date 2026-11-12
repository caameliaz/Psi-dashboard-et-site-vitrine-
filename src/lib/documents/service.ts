// Logique serveur des documents : réglages/modèles, préparation d'un brouillon (commande, devis ou BL → contenu pré-rempli),
// émission (numéro, compteur, copie du modèle), modification par les admins (avec historique), recherche par lien public.
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { SITE_URL } from '@/lib/receipt';
import { qrSvg, receiptUrl } from '@/lib/label-print';
import { computeTotals, fmtMoney, mergeSettings, mergeTemplate, round2 } from './calc';
import { DEFAULT_DESIGNATION } from './defaults';
import { bumpCounter, formatDocumentNumber, getNumberFormats, parseDocumentNumber, suggestBlNumber, suggestInvoiceNumberFromBls, suggestNumber } from './numbering';
import type { DocLine, DocParty, DocumentData, DocumentKind, DocumentSettingsData, DocumentTemplateConfig, RenderableDocument } from './types';

export const DOC_LABEL: Record<DocumentKind, string> = { BL: 'BL', FACTURE: 'Facture', PROFORMA: 'Proforma' };

export class DocError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// ── Réglages et modèles ──────────────────────────────────────────────────────
export async function getSettings(): Promise<DocumentSettingsData> {
  const row = await prisma.documentSettings.findUnique({ where: { id: 'default' } });
  return mergeSettings(row?.data);
}
export async function getTemplate(type: DocumentKind): Promise<DocumentTemplateConfig> {
  const row = await prisma.documentTemplate.findUnique({ where: { type } });
  return mergeTemplate(type, row?.config);
}
export async function getAllTemplates(): Promise<Record<DocumentKind, DocumentTemplateConfig>> {
  const rows = await prisma.documentTemplate.findMany();
  const by = new Map(rows.map((r) => [r.type, r.config]));
  return { BL: mergeTemplate('BL', by.get('BL')), FACTURE: mergeTemplate('FACTURE', by.get('FACTURE')), PROFORMA: mergeTemplate('PROFORMA', by.get('PROFORMA')) };
}

// ── Parties ──────────────────────────────────────────────────────────────────
function psiParty(s: DocumentSettingsData): DocParty {
  const p = s.psi;
  return { name: p.name, address: [p.addressHeader, p.city].filter(Boolean).join('\n'), phone: p.phone, rc: p.rc, nif: p.nif, nis: p.nis, rib: p.rib };
}

const FISCAL = ['rc', 'nif', 'nis', 'ai'] as const;

function clientParty(row: any): DocParty {
  const c = row.client;
  const commune = String(row.clientCommune ?? c?.commune ?? '').trim();
  // « 16 - Alger » → « Alger » (le numéro de wilaya n'a rien à faire sur un document)
  const wilaya = String(row.clientWilaya ?? c?.wilaya ?? '').replace(/^\s*\d+\s*[-–]\s*/, '').trim();
  const addr = String(c?.address ?? '');
  // La commune n'est pas répétée si l'adresse la contient déjà
  const place = [commune && !addr.toLowerCase().includes(commune.toLowerCase()) ? commune : '', wilaya].filter(Boolean).join(', ');
  return {
    name: row.clientCompany || c?.company || row.clientName || c?.name || '',
    address: [c?.address, place].filter((x) => x && String(x).trim()).join('\n'),
    phone: row.clientPhone ?? undefined,
    rc: c?.rc ?? '', nif: c?.nif ?? '', nis: c?.nis ?? '', ai: c?.ai ?? '',
  };
}

// ── Lignes ───────────────────────────────────────────────────────────────────
const numStr = (n: number | null | undefined) => (n == null ? '' : String(Number.isInteger(n) ? n : Number(n.toFixed(2))));

function designationFor(product: any, settings: DocumentSettingsData): string {
  if (product?.documentDesignation?.trim()) return product.documentDesignation.trim();
  if (product?.category?.documentDesignation?.trim()) return product.category.documentDesignation.trim();
  const catName = String(product?.category?.name ?? '');
  // Papier thermique (ou référence libre, toujours du thermique chez PSI) : texte par défaut des réglages.
  if (!product || /thermique/i.test(catName)) return settings.defaultDesignation || DEFAULT_DESIGNATION;
  return [catName, product.name && product.name !== `${product.width}/${product.length}` ? product.name : ''].filter(Boolean).join('\n');
}

function linesFromItems(items: any[], settings: DocumentSettingsData, includesVat: boolean): DocLine[] {
  return (items ?? []).map((i: any) => {
    const p = i.product;
    const ratio = includesVat ? 1 + settings.vatRate / 100 : 1;
    const price = round2(Number(i.unitPrice ?? 0) / ratio);
    if (!p) {
      // Référence libre (ex. « 57/69 ») : laize = 1er nombre ; métrage = valeur de la ligne, sinon 2e nombre.
      const m = String(i.description ?? '').match(/^\s*(\d+(?:[.,]\d+)?)\s*[/x×]\s*(\d+(?:[.,]\d+)?)/i);
      return {
        ref: String(i.description ?? ''), designation: designationFor(null, settings),
        laize: i.width != null ? String(i.width) : m ? m[1].replace(',', '.') : '',
        metrage: i.metrage != null ? numStr(i.metrage) : i.length != null ? String(i.length) : m ? m[2].replace(',', '.') : '',
        quantity: i.quantity ?? 0, unitPrice: price, observation: '',
      } as DocLine;
    }
    // Le code interne (PT-07…) est le « nom » du produit quand il est renseigné ; sinon la référence (57/69).
    const code = p.name && p.name !== `${p.width}/${p.length}` ? p.name : p.reference;
    return {
      ref: code, designation: designationFor(p, settings),
      laize: numStr(p.width), metrage: numStr(i.metrage ?? p.metrage ?? p.length),
      quantity: i.quantity ?? 0, unitPrice: price, observation: '',
    } as DocLine;
  });
}

const sameLine = (a: DocLine, b: DocLine) => a.ref === b.ref && a.designation === b.designation && a.laize === b.laize && a.metrage === b.metrage && a.unitPrice === b.unitPrice;

/** Additionne les lignes identiques de plusieurs BL (même réf, laize, métrage et prix). */
function mergeLines(all: DocLine[]): { lines: DocLine[]; priceWarnings: string[] } {
  const lines: DocLine[] = [];
  for (const l of all) {
    const hit = lines.find((x) => sameLine(x, l));
    if (hit) hit.quantity += l.quantity;
    else lines.push({ ...l, observation: '' });
  }
  const priceWarnings: string[] = [];
  const seen = new Map<string, number>();
  for (const l of lines) {
    const k = `${l.ref}|${l.laize}|${l.metrage}`;
    if (seen.has(k) && seen.get(k) !== l.unitPrice) priceWarnings.push(`${l.ref || 'Une référence'} (${l.laize}/${l.metrage}) a des prix différents selon les BL : vérifie les lignes.`);
    seen.set(k, l.unitPrice);
  }
  return { lines, priceWarnings };
}

// ── Chargement des sources ───────────────────────────────────────────────────
const SOURCE_INCLUDE = {
  client: { omit: { photo: true } },
  items: { include: { product: { omit: { photo: true }, include: { category: { omit: { photo: true } } } } } },
} as const;

async function loadSource(orderId?: string | null, quoteId?: string | null) {
  if (orderId) {
    const o: any = await prisma.order.findUnique({ where: { id: orderId }, include: SOURCE_INCLUDE });
    return o ? { kind: 'order' as const, row: o } : null;
  }
  if (quoteId) {
    const q: any = await prisma.quote.findUnique({ where: { id: quoteId }, include: SOURCE_INCLUDE });
    return q ? { kind: 'quote' as const, row: q } : null;
  }
  return null;
}

export interface Draft {
  kind: DocumentKind;
  data: DocumentData;
  suggestedNumber: string;
  bis: boolean;
  orderId: string | null;
  quoteId: string | null;
  clientId: string | null;
  blIds: string[];
  missingFiscal: string[]; // ['rc','nif',…] manquants sur la fiche client
  warnings: string[];
  template: DocumentTemplateConfig;
  settings: DocumentSettingsData;
}

export async function prepareDraft(input: { kind: DocumentKind; orderId?: string | null; quoteId?: string | null; blIds?: string[] }): Promise<Draft> {
  const { kind } = input;
  const settings = await getSettings();
  const template = await getTemplate(kind);
  const formats = await getNumberFormats();
  const year = new Date().getFullYear();
  const warnings: string[] = [];
  const now = new Date().toISOString();
  let data: DocumentData;
  let orderId: string | null = input.orderId ?? null;
  let quoteId: string | null = input.quoteId ?? null;
  let clientId: string | null = null;
  let clientRow: any = null;
  let blIds: string[] = [];
  let suggested: { number: string; bis?: boolean };

  if (kind === 'FACTURE') {
    const ids = [...new Set(input.blIds ?? [])];
    if (ids.length === 0) throw new DocError('Une facture se crée à partir d\'un ou plusieurs bons de livraison.');
    const bls = await prisma.document.findMany({ where: { id: { in: ids }, type: 'BL' } });
    if (bls.length !== ids.length) throw new DocError('Bon de livraison introuvable.', 404);
    const taken = bls.filter((b) => b.invoiceId);
    if (taken.length) throw new DocError(`Déjà facturé : ${taken.map((b) => b.number).join(', ')}.`, 409);
    const clientIds = new Set(bls.map((b) => b.clientId ?? ''));
    if (clientIds.size > 1) throw new DocError('Les BL regroupés doivent être du même client.');
    bls.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.createdAt.getTime() - b.createdAt.getTime());
    const datas = bls.map((b) => b.data as unknown as DocumentData);
    const { lines, priceWarnings } = mergeLines(datas.flatMap((d) => d.lines));
    warnings.push(...priceWarnings);
    const orderIds = [...new Set(bls.map((b) => b.orderId).filter(Boolean))] as string[];
    orderId = orderIds.length === 1 ? orderIds[0] : null;
    clientId = bls[0].clientId;
    blIds = bls.map((b) => b.id);
    clientRow = clientId ? await prisma.client.findUnique({ where: { id: clientId }, omit: { photo: true } }) : null;
    const first = datas[0];
    const client = { ...first.client, ...(clientRow ? { rc: clientRow.rc ?? first.client.rc, nif: clientRow.nif ?? first.client.nif, nis: clientRow.nis ?? first.client.nis, ai: clientRow.ai ?? first.client.ai } : {}) };
    const dates = datas.map((d) => d.orderDate).filter(Boolean).sort() as string[];
    const payment = first.paymentMethod || settings.defaultPaymentMethod;
    data = {
      date: now, client, psi: psiParty(settings), psiFooter: [],
      orderRef: [...new Set(datas.map((d) => d.orderRef).filter(Boolean))].join(', ') || undefined, orderDate: dates[0],
      lines, vatRate: settings.vatRate, paymentMethod: payment,
      blNumbers: bls.map((b) => b.number), totals: computeTotals(lines, settings.vatRate, payment, settings.stampDuty),
    };
    suggested = await suggestInvoiceNumberFromBls(year, bls.map((b) => b.seq), formats);
  } else {
    const src = await loadSource(orderId, quoteId);
    if (!src) throw new DocError('Commande ou devis introuvable.', 404);
    const row = src.row;
    if (src.kind === 'order') quoteId = null; else orderId = null;
    clientId = row.clientId ?? null;
    clientRow = row.client ?? null;
    const lines = linesFromItems(row.items, settings, !!row.priceIncludesVat);
    if (kind === 'PROFORMA' && src.kind === 'quote' && lines.every((l) => !l.unitPrice) && row.proposedPrice && lines.length === 1) {
      // Devis à prix global : un seul article → prix unitaire déduit du prix proposé.
      lines[0].unitPrice = round2(Number(row.proposedPrice) / (lines[0].quantity || 1));
    }
    if (lines.some((l) => !l.unitPrice) && kind !== 'BL') warnings.push('Certaines lignes n\'ont pas de prix : saisis-les avant d\'émettre.');
    const payment = row.paymentMethod && row.paymentMethod !== 'À crédit' && row.paymentMethod !== 'Dépensé' && row.paymentMethod !== 'Offert'
      ? (/virement|ch[eè]que/i.test(row.paymentMethod) ? settings.defaultPaymentMethod : row.paymentMethod)
      : settings.defaultPaymentMethod;
    data = {
      date: now, client: clientParty(row), psi: psiParty(settings), psiFooter: [],
      orderRef: row.ref ?? undefined, orderDate: row.createdAt?.toISOString?.() ?? undefined,
      lines, vatRate: settings.vatRate, paymentMethod: payment,
      ...(kind === 'BL' ? { showQr: template.showQr, receiptToken: row.receiptToken, deliveryDate: '', deliveryPlace: '' } : {}),
      totals: computeTotals(lines, settings.vatRate, payment, settings.stampDuty),
    };
    if (kind === 'BL') {
      const s = await suggestBlNumber(year, clientId, formats);
      suggested = s;
      if (s.bis) warnings.push('Ce client a déjà un BL à facturer : numéro « bis » proposé (modifiable).');
    } else {
      suggested = await suggestNumber('PROFORMA', year, formats);
    }
  }

  const missingFiscal = kind === 'BL' ? [] : FISCAL.filter((k) => !String((data.client as any)[k] ?? '').trim());
  return { kind, data, suggestedNumber: suggested.number, bis: !!suggested.bis, orderId, quoteId, clientId, blIds, missingFiscal, warnings, template, settings };
}

// ── Émission ─────────────────────────────────────────────────────────────────
function cleanLines(lines: any[]): DocLine[] {
  return (Array.isArray(lines) ? lines : []).map((l) => ({
    ref: String(l.ref ?? '').trim(), designation: String(l.designation ?? ''), laize: String(l.laize ?? '').trim(), metrage: String(l.metrage ?? '').trim(),
    quantity: Number(l.quantity) || 0, unitPrice: round2(Number(l.unitPrice) || 0), observation: String(l.observation ?? ''),
    ...(l.custom && typeof l.custom === 'object' ? { custom: Object.fromEntries(Object.entries(l.custom).map(([k, v]) => [k, String(v ?? '')])) } : {}),
  }));
}

/** Nettoie / complète le contenu reçu du navigateur et recalcule les totaux (le serveur fait foi). */
async function normalizeData(raw: any, settings: DocumentSettingsData): Promise<DocumentData> {
  const lines = cleanLines(raw?.lines);
  if (lines.length === 0) throw new DocError('Le document doit contenir au moins une ligne.');
  const vatRate = Number.isFinite(Number(raw?.vatRate)) ? Number(raw.vatRate) : settings.vatRate;
  const paymentMethod = String(raw?.paymentMethod ?? settings.defaultPaymentMethod);
  const party = (p: any): DocParty => ({
    name: String(p?.name ?? ''), address: String(p?.address ?? ''), phone: p?.phone ? String(p.phone) : undefined,
    rc: p?.rc ? String(p.rc) : undefined, nif: p?.nif ? String(p.nif) : undefined, nis: p?.nis ? String(p.nis) : undefined,
    ai: p?.ai ? String(p.ai) : undefined, rib: p?.rib ? String(p.rib) : undefined,
  });
  const str = (v: unknown) => (v == null || v === '' ? undefined : String(v));
  return {
    date: raw?.date && !isNaN(new Date(raw.date).getTime()) ? new Date(raw.date).toISOString() : new Date().toISOString(),
    client: party(raw?.client), psi: party(raw?.psi ?? psiParty(settings)), psiFooter: Array.isArray(raw?.psiFooter) ? raw.psiFooter.map(String) : [],
    orderRef: str(raw?.orderRef), orderDate: str(raw?.orderDate), lines, vatRate, paymentMethod,
    dueDate: str(raw?.dueDate), validity: str(raw?.validity), deliveryDate: str(raw?.deliveryDate), deliveryPlace: str(raw?.deliveryPlace),
    showQr: raw?.showQr === undefined ? undefined : !!raw.showQr, receiptToken: str(raw?.receiptToken),
    blNumbers: Array.isArray(raw?.blNumbers) ? raw.blNumbers.map(String) : undefined,
    headerExtra: raw?.headerExtra && typeof raw.headerExtra === 'object' ? Object.fromEntries(Object.entries(raw.headerExtra).map(([k, v]) => [k, String(v ?? '')])) : undefined,
    notes: str(raw?.notes),
    totals: computeTotals(lines, vatRate, paymentMethod, settings.stampDuty),
  };
}

export interface IssueInput {
  kind: DocumentKind;
  number: string;
  data: unknown;
  customFields?: Record<string, string>;
  orderId?: string | null;
  quoteId?: string | null;
  clientId?: string | null;
  blIds?: string[];
  userId: string;
}

export async function issueDocument(input: IssueInput) {
  const { kind } = input;
  const settings = await getSettings();
  const template = await getTemplate(kind);
  const formats = await getNumberFormats();
  const number = String(input.number ?? '').trim();
  if (!number) throw new DocError('Le numéro du document est obligatoire.');
  const data = await normalizeData(input.data, settings);
  const year = new Date(data.date).getFullYear();

  const exists = await prisma.document.findUnique({ where: { type_number: { type: kind, number } }, select: { id: true } });
  if (exists) throw new DocError(`Le numéro « ${number} » existe déjà.`, 409);

  const parsed = parseDocumentNumber(formats[kind], number);
  const blIds = [...new Set(input.blIds ?? [])];
  if (kind === 'FACTURE') {
    if (blIds.length === 0) throw new DocError('Une facture se crée à partir d\'un ou plusieurs BL.');
    const taken = await prisma.document.count({ where: { id: { in: blIds }, OR: [{ invoiceId: { not: null } }, { type: { not: 'BL' } }] } });
    if (taken) throw new DocError('Un des BL est déjà facturé.', 409);
  }

  const created = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        type: kind, number, year: parsed?.year ?? year, seq: parsed?.seq ?? null, suffix: parsed?.suffix ?? null,
        orderId: input.orderId ?? null, quoteId: input.quoteId ?? null, clientId: input.clientId ?? null,
        data: data as unknown as Prisma.InputJsonValue,
        templateSnapshot: template as unknown as Prisma.InputJsonValue,
        customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
        createdById: input.userId,
      },
    });
    if (kind === 'FACTURE') await tx.document.updateMany({ where: { id: { in: blIds } }, data: { invoiceId: doc.id } });
    return doc;
  });
  if (parsed) await bumpCounter(kind, parsed.year ?? year, parsed.seq).catch(console.error);

  createAudit({
    userId: input.userId, action: `${DOC_LABEL[kind]} créé${kind === 'BL' ? '' : 'e'}`,
    entity: 'DOCUMENT', entityId: created.id, orderId: input.orderId ?? null, quoteId: input.quoteId ?? null,
    detail: `${number} — ${data.client.name}${kind !== 'BL' ? ` — ${fmtMoney(data.totals.net)} DA` : ''}`,
  });
  return created;
}

// ── Modification (admins) avec historique ────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  date: 'date', client: 'client', orderRef: 'commande', orderDate: 'date de commande', lines: 'lignes', vatRate: 'TVA', paymentMethod: 'mode de règlement',
  dueDate: 'échéance', validity: 'validité', deliveryDate: 'date de livraison', deliveryPlace: 'lieu de livraison', showQr: 'QR', notes: 'notes', headerExtra: 'champs ajoutés',
};

// JSON.stringify indépendant de l'ordre des clés (la base JSONB ne le conserve pas) : sert à repérer ce qui a VRAIMENT changé.
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().filter((k) => (v as any)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}

export async function updateDocument(id: string, patch: { number?: string; data?: unknown; customFields?: Record<string, string> }, userId: string) {
  const cur = await prisma.document.findUnique({ where: { id } });
  if (!cur) throw new DocError('Document introuvable.', 404);
  const settings = await getSettings();
  const before = cur.data as unknown as DocumentData;
  const upd: Prisma.DocumentUpdateInput = {};
  const changes: string[] = [];

  if (patch.number !== undefined && patch.number.trim() && patch.number.trim() !== cur.number) {
    const number = patch.number.trim();
    const clash = await prisma.document.findUnique({ where: { type_number: { type: cur.type, number } }, select: { id: true } });
    if (clash) throw new DocError(`Le numéro « ${number} » existe déjà.`, 409);
    const formats = await getNumberFormats();
    const parsed = parseDocumentNumber(formats[cur.type], number);
    upd.number = number; upd.seq = parsed?.seq ?? null; upd.suffix = parsed?.suffix ?? null;
    if (parsed?.year) upd.year = parsed.year;
    changes.push(`numéro ${cur.number} → ${number}`);
    if (parsed) await bumpCounter(cur.type, parsed.year ?? cur.year, parsed.seq).catch(console.error);
  }
  if (patch.data !== undefined) {
    const after = await normalizeData({ ...before, ...(patch.data as object) }, settings);
    // Les champs figés (QR, jeton, BL regroupés) restent ceux de l'émission si le formulaire ne les renvoie pas.
    upd.data = after as unknown as Prisma.InputJsonValue;
    for (const k of Object.keys(FIELD_LABELS)) {
      if (stable((before as any)[k] ?? null) !== stable((after as any)[k] ?? null)) changes.push(FIELD_LABELS[k]);
    }
    if (before.totals.ttc !== after.totals.ttc) changes.push(`total TTC ${fmtMoney(before.totals.ttc)} → ${fmtMoney(after.totals.ttc)}`);
    if (before.totals.stamp !== after.totals.stamp) changes.push(`timbre ${fmtMoney(before.totals.stamp)} → ${fmtMoney(after.totals.stamp)}`);
  }
  if (patch.customFields !== undefined) {
    if (stable(cur.customFields ?? {}) !== stable(patch.customFields)) changes.push('champs ajoutés');
    upd.customFields = patch.customFields as Prisma.InputJsonValue;
  }
  if (changes.length === 0) return cur;
  const next = await prisma.document.update({ where: { id }, data: upd });
  createAudit({
    userId, action: `${DOC_LABEL[cur.type]} modifié${cur.type === 'BL' ? '' : 'e'}`, entity: 'DOCUMENT', entityId: id, orderId: cur.orderId, quoteId: cur.quoteId,
    detail: `${next.number} — ${[...new Set(changes)].join(', ')}`,
  });
  return next;
}

export async function deleteDocument(id: string, userId: string) {
  const cur = await prisma.document.findUnique({ where: { id }, include: { bls: { select: { id: true } } } });
  if (!cur) throw new DocError('Document introuvable.', 404);
  if (cur.type === 'BL' && cur.invoiceId) throw new DocError('Ce BL est inclus dans une facture : supprime d\'abord la facture.', 409);
  await prisma.document.delete({ where: { id } });
  createAudit({ userId, action: `${DOC_LABEL[cur.type]} supprimé${cur.type === 'BL' ? '' : 'e'}`, entity: 'DOCUMENT', entityId: id, orderId: cur.orderId, quoteId: cur.quoteId, detail: cur.number });
}

// ── Rendu d'un document enregistré ───────────────────────────────────────────
export function toRenderable(row: { type: DocumentKind | string; number: string; data: unknown; templateSnapshot: unknown; customFields: unknown }, qr?: string): RenderableDocument {
  const type = row.type as DocumentKind;
  return {
    type, number: row.number,
    template: mergeTemplate(type, row.templateSnapshot),
    data: row.data as unknown as DocumentData,
    customFields: (row.customFields ?? {}) as Record<string, string>,
    qrSvg: qr,
  };
}

/** QR de réception d'un BL (même lien que l'étiquette colis). */
export async function qrForDocument(row: { type: string; data: unknown }): Promise<string | undefined> {
  const d = row.data as DocumentData;
  if (row.type !== 'BL' || !d.receiptToken || d.showQr === false) return undefined;
  return qrSvg(receiptUrl(d.receiptToken, SITE_URL));
}

export async function findByShareToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return prisma.document.findUnique({ where: { shareToken: token } });
}

export { formatDocumentNumber };
