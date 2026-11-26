// Réservation du numéro de facture : dès qu'une commande / un devis a la TVA activée, il reçoit SON numéro de facture
// (plus petit numéro libre, dans l'ordre), même si la facture n'est pas encore générée. Plus de numéro « dépassé » parce
// que l'admin a oublié de générer la facture.
//  • annulation / TVA retirée → le numéro est libéré (réattribué ensuite, pastille « R » sur la commande qui le reprend) ;
//  • facture déjà émise → on refuse : il faut d'abord supprimer la facture (le numéro fait foi sur le document émis) ;
//  • seuls les numéros au format automatique (« F 023/2026 ») sont libérés : un numéro saisi à la main ou ancien
//    (« F2026-001 ») n'est jamais effacé.
import { prisma } from '@/lib/prisma';
import { bumpCounter, formatDocumentNumber, getNumberFormats, nextFreeSeq, parseDocumentNumber } from './numbering';

export type RequestKind = 'order' | 'quote';

export class InvoiceNumberError extends Error {
  status = 409;
}

type Row = { invoiceNumber: string | null; invoiceNumberReused: boolean; vatEnabled: boolean; status: string };

async function loadRow(kind: RequestKind, id: string): Promise<Row | null> {
  const sel = { invoiceNumber: true, invoiceNumberReused: true, vatEnabled: true, status: true } as const;
  return kind === 'order'
    ? prisma.order.findUnique({ where: { id }, select: sel })
    : prisma.quote.findUnique({ where: { id }, select: sel });
}

async function writeRow(kind: RequestKind, id: string, data: { invoiceNumber: string | null; invoiceNumberReused: boolean }, db: typeof prisma = prisma) {
  if (kind === 'order') await db.order.update({ where: { id }, data });
  else await db.quote.update({ where: { id }, data });
}

/** Une facture a-t-elle déjà été émise avec ce numéro ? */
async function issuedInvoice(number: string) {
  return prisma.document.findFirst({ where: { type: 'FACTURE', number }, select: { id: true, number: true } });
}

/** À appeler AVANT d'annuler / de retirer la TVA : refuse si le numéro réservé est déjà celui d'une facture émise. */
export async function assertInvoiceReleasable(kind: RequestKind, id: string) {
  const row = await loadRow(kind, id);
  if (!row?.invoiceNumber) return;
  const doc = await issuedInvoice(row.invoiceNumber);
  if (doc) throw new InvoiceNumberError(`La facture ${doc.number} est déjà générée : supprime-la d'abord (onglet Documents de la commande), puis recommence.`);
}

/**
 * Remet la commande / le devis dans l'état voulu : TVA active et non annulée → un numéro est réservé s'il n'y en a pas ;
 * annulée ou sans TVA → le numéro réservé (format automatique, sans facture émise) est libéré.
 * Idempotent : à appeler après toute modification pouvant toucher au statut, à la TVA ou au numéro. Renvoie l'état final.
 */
export async function syncInvoiceNumber(kind: RequestKind, id: string): Promise<{ invoiceNumber: string | null; invoiceNumberReused: boolean }> {
  const row = await loadRow(kind, id);
  if (!row) return { invoiceNumber: null, invoiceNumberReused: false };
  const formats = await getNumberFormats();
  const wantsNumber = row.vatEnabled && row.status !== 'ANNULE';

  // Libération
  if (!wantsNumber) {
    if (row.invoiceNumber && parseDocumentNumber(formats.FACTURE, row.invoiceNumber) && !(await issuedInvoice(row.invoiceNumber))) {
      await writeRow(kind, id, { invoiceNumber: null, invoiceNumberReused: false });
      return { invoiceNumber: null, invoiceNumberReused: false };
    }
    return { invoiceNumber: row.invoiceNumber, invoiceNumberReused: row.invoiceNumberReused };
  }
  if (row.invoiceNumber) return { invoiceNumber: row.invoiceNumber, invoiceNumberReused: row.invoiceNumberReused };

  // Réservation : verrou d'avis pour que deux demandes simultanées ne prennent pas le même numéro
  const year = new Date().getFullYear();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(740112)`;
    const db = tx as unknown as typeof prisma;
    const { seq, reused } = await nextFreeSeq('FACTURE', year, formats, db);
    const number = formatDocumentNumber(formats.FACTURE, seq, year);
    await writeRow(kind, id, { invoiceNumber: number, invoiceNumberReused: reused }, db);
    await bumpCounter('FACTURE', year, seq, db);
    return { invoiceNumber: number, invoiceNumberReused: reused };
  });
}

/** Facture émise : la commande / le devis prend le numéro réel de la facture (qui peut avoir été modifié ou regroupé). */
export async function attachIssuedInvoiceNumber(kind: RequestKind, id: string, number: string) {
  await writeRow(kind, id, { invoiceNumber: number, invoiceNumberReused: false });
}
