import { NextResponse } from 'next/server';
import { documentExcelBuffer, documentFileName } from '@/lib/documents/excel';
import { findByShareToken, toRenderable } from '@/lib/documents/service';

// GET /d/[token]/excel — téléchargement Excel depuis le lien envoyé au client (jeton non devinable, pas de connexion).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await findByShareToken(token);
  if (!row) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  const doc = toRenderable(row);
  return new NextResponse(Buffer.from(documentExcelBuffer(doc)), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(documentFileName(doc))}`,
    },
  });
}
