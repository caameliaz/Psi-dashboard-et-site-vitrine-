import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardDocs } from '@/lib/documents/guard';
import { documentExcelBuffer, documentFileName } from '@/lib/documents/excel';
import { toRenderable } from '@/lib/documents/service';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/documents/[id]/excel — fichier .xlsx du document.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const row = await prisma.document.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  const guard = await guardDocs(row.type);
  if (guard.error) return guard.error;
  const doc = toRenderable(row);
  return new NextResponse(Buffer.from(documentExcelBuffer(doc)), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(documentFileName(doc))}`,
    },
  });
}
