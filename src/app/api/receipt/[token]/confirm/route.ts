import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { confirmReceipt } from '@/lib/receipt';

// POST /api/receipt/[token]/confirm — PUBLIC (le client qui a scanné le QR du colis, sans compte).
// Le jeton aléatoire (64 hex) fait office de secret. Limite de débit par IP contre les essais en rafale.
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limited = rateLimit(request, 'receipt-confirm', 10, 60_000);
  if (limited) return limited;

  const { token } = await params;
  try {
    const result = await confirmReceipt(token);
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid: 'Lien invalide.',
        not_ready: "Votre commande n'est pas encore prête : la réception ne peut pas être confirmée pour le moment.",
        unavailable: 'Cette commande ne peut plus être confirmée.',
        rolllink: 'Cette commande est suivie via RollLink : la réception ne se confirme pas ici.',
      };
      return NextResponse.json({ error: messages[result.reason], reason: result.reason }, { status: result.reason === 'invalid' ? 404 : 409 });
    }
    return NextResponse.json({ ok: true, already: result.already, confirmedAt: result.confirmedAt });
  } catch (e) {
    console.error('[receipt] confirm :', e);
    return NextResponse.json({ error: 'Une erreur est survenue. Merci de réessayer.' }, { status: 500 });
  }
}
