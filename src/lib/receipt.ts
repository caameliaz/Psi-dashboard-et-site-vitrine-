import { prisma } from '@/lib/prisma';
import { deliverStock } from '@/lib/order-stock';
import { scanLowStock } from '@/lib/low-stock';
import { createNotif } from '@/lib/notifications';
import { pushSSE } from '@/lib/sse-bus';

// ─────────────────────────────────────────────────────────────────────────────
// Réception d'un colis par le client : QR code collé sur le colis → page publique /r/[token]
// → bouton « Valider la réception » → la commande/le devis passe en Livré.
// ─────────────────────────────────────────────────────────────────────────────

export type ReceiptKind = 'order' | 'quote';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.psi.dz';

// Un jeton valide = 64 caractères hexadécimaux (cf. valeur par défaut posée par la base).
export const TOKEN_RE = /^[a-f0-9]{64}$/;

// Statuts où le client peut confirmer : la marchandise est confirmée ou prête (« Disponible »).
const CONFIRMABLE = ['VALIDE', 'PRODUITE'] as const;

export interface LabelLine {
  designation: string;
  laize: string;
  grammage: string;
  mandrin: string;
  metres: string;
  quantite: number;
  /** « 80/80 » (laize/longueur, comme sur le site public) ; texte libre pour une ligne sans produit. */
  format: string;
  /** Produit du catalogue (null = ligne libre) — sert à enregistrer un grammage/mandrin saisi à l'impression. */
  productId: string | null;
  /** Peut-on proposer de renseigner grammage/mandrin ? (rouleaux de papier oui, étiquettes et lignes libres non) */
  askable: boolean;
}

/** Valeur d'un champ personnalisé du produit dont le libellé contient `needle` (ex: « gramm », « mandrin »). */
function customValue(product: any, needle: string): string {
  const cf = (product?.customFields ?? []).find((c: any) => String(c.definition?.label ?? '').toLowerCase().includes(needle));
  if (!cf?.value) return '—';
  // Les unités sont déjà dans l'en-tête de colonne (« g/m² », « mm ») : « 55 g/m² » → « 55 », comme sur le modèle.
  const num = String(cf.value).match(/^\s*(\d+(?:[.,]\d+)?)/);
  return num ? num[1] : String(cf.value);
}

const fmt = (n: number | null | undefined) => (n == null ? '—' : String(Number.isInteger(n) ? n : Number(n.toFixed(2))));

/** Lignes du tableau de l'étiquette / du récapitulatif (une par produit). SANS aucun prix. */
export function buildLines(items: any[]): LabelLine[] {
  return (items ?? []).map((i: any) => {
    const p = i.product;
    if (!p) {
      // Référence libre (ex. « 57/69 ») : la laize est le 1er nombre ; le métrage vient de la ligne, sinon du 2e nombre.
      const m = String(i.description ?? '').match(/^\s*(\d+(?:[.,]\d+)?)\s*[/x×]\s*(\d+(?:[.,]\d+)?)/i);
      const laize = m ? fmt(Number(m[1].replace(',', '.'))) : '—';
      const metres = i.metrage != null ? fmt(i.metrage) : m ? fmt(Number(m[2].replace(',', '.'))) : '—';
      return { designation: i.description || 'Produit', laize, grammage: '—', mandrin: '—', metres, quantite: i.quantity ?? 0, format: i.description || 'Produit', productId: null, askable: true };
    }
    return {
      designation: p.name && p.name !== `${p.width}/${p.length}` ? `${p.reference} — ${p.name}` : p.reference,
      laize: fmt(p.width),
      grammage: customValue(p, 'gramm'),
      mandrin: customValue(p, 'mandrin'),
      metres: fmt(i.metrage ?? p.metrage ?? p.length),
      quantite: i.quantity ?? 0,
      format: `${fmt(p.width)}/${fmt(p.length)}`,
      productId: p.id ?? null,
      askable: !/tiquette/i.test(String(p.category?.name ?? '')),
    };
  });
}

/** Titres de l'étiquette : « Rouleaux de Papier Thermique » pour le thermique, sinon le nom de la catégorie. */
export function buildTitles(items: any[], lines: LabelLine[]): { titleFr: string; titleAr: string } {
  const cats = [...new Set((items ?? []).map((i: any) => i.product?.category?.name).filter(Boolean))] as string[];
  // Sans catégorie connue (lignes libres, ventes importées) : titre du papier thermique, le produit principal de PSI.
  const thermal = cats.length === 0 || cats.every((n) => /thermique/i.test(n) && !/tiquette/i.test(n));
  // « (55g/m²) » seulement si toutes les lignes ont le même grammage numérique.
  const gr = [...new Set(lines.map((l) => l.grammage.replace(/[^\d.,]/g, '')).filter(Boolean))];
  const grTxt = gr.length === 1 ? ` - (${gr[0]}g/m²)` : '';
  if (thermal) {
    return { titleFr: 'Rouleaux de Papier Thermique- Premium Quality', titleAr: `لفة ورق حراري- جودة عالية${grTxt}` };
  }
  return { titleFr: cats.length === 1 ? cats[0] : 'Produits PSI', titleAr: '' };
}

const ITEMS_INCLUDE = {
  items: { include: { product: { omit: { photo: true }, include: { category: { omit: { photo: true } }, customFields: { include: { definition: true } } } } } },
} as const;

/** Retrouve la commande ou le devis portant ce jeton (jamais par référence ni id). */
export async function findByToken(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const order = await prisma.order.findUnique({ where: { receiptToken: token }, include: ITEMS_INCLUDE });
  if (order) return { kind: 'order' as const, row: order };
  const quote = await prisma.quote.findUnique({ where: { receiptToken: token }, include: ITEMS_INCLUDE });
  if (quote) return { kind: 'quote' as const, row: quote };
  return null;
}

/** Données d'étiquette d'une commande/devis (par id, côté admin). */
export async function labelDataFor(kind: ReceiptKind, id: string) {
  const row: any = kind === 'order'
    ? await prisma.order.findUnique({ where: { id }, include: ITEMS_INCLUDE })
    : await prisma.quote.findUnique({ where: { id }, include: ITEMS_INCLUDE });
  if (!row) return null;
  const lines = buildLines(row.items);
  return { id, kind, ref: row.ref ?? id.slice(0, 8).toUpperCase(), token: row.receiptToken as string, lines, ...buildTitles(row.items, lines) };
}

/** Première ouverture de la page du QR par le client : mémorisée (une seule fois). */
export async function markScanned(kind: ReceiptKind, id: string) {
  const where = { id, receiptScannedAt: null };
  const data = { receiptScannedAt: new Date() };
  if (kind === 'order') await prisma.order.updateMany({ where, data });
  else await prisma.quote.updateMany({ where, data });
}

export type ConfirmResult =
  | { ok: true; confirmedAt: Date; already: boolean }
  | { ok: false; reason: 'invalid' | 'not_ready' | 'unavailable' | 'rolllink' };

/**
 * « Valider la réception » côté client : passe la commande/le devis en LIVRÉ, comme le ferait un admin
 * (date de livraison, sortie du stock réservé), puis prévient l'équipe. Idempotent : un 2e clic ou une 2e
 * requête ne refait rien (mise à jour conditionnelle, donc pas de double sortie de stock).
 */
export async function confirmReceipt(token: string): Promise<ConfirmResult> {
  const found = await findByToken(token);
  if (!found) return { ok: false, reason: 'invalid' };
  const { kind, row } = found;

  if (row.receiptConfirmedAt) return { ok: true, confirmedAt: row.receiptConfirmedAt, already: true };
  if (row.status === 'LIVRE') return { ok: true, confirmedAt: row.deliveredAt ?? new Date(), already: true };
  if (row.source === 'ROLLINK') return { ok: false, reason: 'rolllink' };
  if (row.status === 'ANNULE' || row.status === 'RETOURNE') return { ok: false, reason: 'unavailable' };
  if (!(CONFIRMABLE as readonly string[]).includes(row.status)) return { ok: false, reason: 'not_ready' };

  const now = new Date();
  const where = { id: row.id, receiptConfirmedAt: null, status: { in: [...CONFIRMABLE] } };
  const data = { status: 'LIVRE' as const, deliveredAt: now, receiptConfirmedAt: now };
  const res = kind === 'order' ? await prisma.order.updateMany({ where, data }) : await prisma.quote.updateMany({ where, data });
  if (res.count === 0) {
    // Quelqu'un d'autre vient de le faire (double clic, admin…) : rien à refaire.
    return { ok: true, confirmedAt: now, already: true };
  }

  let stockWarning = '';
  try {
    await deliverStock(kind, row.id);
  } catch (e) {
    console.error('[receipt] Erreur de mise à jour du stock :', e);
    stockWarning = ' — ⚠ la mise à jour du stock a échoué, à vérifier';
  }
  try { await scanLowStock(); } catch (e) { console.error('[receipt] scanLowStock :', e); }

  const clientLabel = (row as any).clientCompany || (row as any).clientName || '—';
  const entity = kind === 'order' ? 'commande' : 'devis';
  try {
    const { notif, userIds } = await createNotif({
      type: 'ACTION_AUTRE',
      title: 'Réception confirmée par le client',
      message: `Le client ${clientLabel} a confirmé la réception de ${kind === 'order' ? 'la commande' : 'du devis'} ${row.ref ?? ''} (QR code) — ${entity} passé(e) en Livré${stockWarning}`,
      ...(kind === 'order' ? { orderId: row.id } : { quoteId: row.id }),
    });
    pushSSE('activity', {
      id: notif.id, type: notif.type, title: notif.title, message: notif.message, createdAt: notif.createdAt.toISOString(),
    }, userIds);
  } catch (e) {
    console.error('[receipt] notification :', e);
  }

  return { ok: true, confirmedAt: now, already: false };
}
