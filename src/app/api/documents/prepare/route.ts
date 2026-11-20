import { NextRequest, NextResponse } from 'next/server';
import { guardDocs, isKind } from '@/lib/documents/guard';
import { DocError, prepareDraft } from '@/lib/documents/service';

// POST /api/documents/prepare — brouillon pré-rempli (contenu, numéro proposé, infos manquantes) SANS rien enregistrer.
// Body : { kind, orderId? | quoteId?, blIds? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isKind(body.kind)) return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 });
    const guard = await guardDocs(body.kind);
    if (guard.error) return guard.error;
    const draft = await prepareDraft({ kind: body.kind, orderId: body.orderId, quoteId: body.quoteId, blIds: body.blIds });
    return NextResponse.json(draft);
  } catch (e) {
    if (e instanceof DocError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[documents/prepare]', e);
    return NextResponse.json({ error: 'Impossible de préparer le document' }, { status: 500 });
  }
}
