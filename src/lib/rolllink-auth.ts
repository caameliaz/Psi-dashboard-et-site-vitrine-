import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// Auth des routes /api/rolllink/* — appelées par RollLink (service externe),
// jamais par un navigateur avec session PSI Dash. Vérification par clé secrète
// partagée (header X-API-Key), comparée à ROLLINK_API_KEY (.env).
// ═══════════════════════════════════════════════════════════════════════════
export function checkRollLinkApiKey(request: NextRequest): NextResponse | null {
  const expected = process.env.ROLLINK_API_KEY;
  const provided = request.headers.get('x-api-key');

  if (!expected) {
    console.error('[rolllink] ROLLINK_API_KEY absente de .env — routes rolllink désactivées');
    return NextResponse.json({ error: 'Service indisponible' }, { status: 401 });
  }
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'Clé API invalide ou absente' }, { status: 401 });
  }
  return null;
}
