import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { suggestNumber } from '@/lib/documents/numbering';

// GET /api/invoices/next-number — prochain numéro de facture LIBRE (sans le réserver), même compteur que les Documents.
// Format réglable (Réglages > Documents), par défaut « F 023/2026 ». Le numéro d'une commande avec TVA est réservé
// automatiquement (cf. lib/documents/reservation.ts) : cette route ne sert plus qu'à l'afficher.
export async function GET() {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  try {
    const { number } = await suggestNumber('FACTURE', new Date().getFullYear());
    return NextResponse.json({ nextNumber: number });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
  }
}
