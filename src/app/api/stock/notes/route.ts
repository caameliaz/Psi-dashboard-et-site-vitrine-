import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAudit } from '@/lib/audit';

// Notes sur les références du stock — RÉSERVÉES AUX COMPTES ADMIN (rôle ADMIN). Les comptes employés, y compris ceux
// qui ont un libellé « Admin » ou la lecture seule (ex. Sid Stiti), n'y ont aucun accès : ni lecture, ni écriture.
const KINDS = ['PRODUCT', 'MATERIAL', 'FREE'] as const;
type Kind = (typeof KINDS)[number];

async function adminSession() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), session: null };
  if (session.user.role !== 'ADMIN') return { error: NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 }), session: null };
  return { error: null, session };
}

// Table pas encore créée (migration non appliquée) : on ne casse pas la page Stock
const tableAbsente = (e: unknown) => (e as { code?: string } | null)?.code === 'P2021';

// GET /api/stock/notes?kind=PRODUCT&key=<id> → les notes d'une référence (plus récentes en premier)
// GET /api/stock/notes                      → { "PRODUCT:<id>": nombre, … } pour colorer les crayons
export async function GET(request: NextRequest) {
  const guard = await adminSession();
  if (guard.error) return guard.error;

  const kind = request.nextUrl.searchParams.get('kind');
  const key = request.nextUrl.searchParams.get('key');
  try {
    if (kind && key) {
      if (!KINDS.includes(kind as Kind)) return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
      const notes = await prisma.stockNote.findMany({
        where: { kind, refKey: key },
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } },
      });
      return NextResponse.json(notes);
    }
    const groups = await prisma.stockNote.groupBy({ by: ['kind', 'refKey'], _count: { _all: true } });
    return NextResponse.json(Object.fromEntries(groups.map((g) => [`${g.kind}:${g.refKey}`, g._count._all])));
  } catch (e) {
    if (tableAbsente(e)) return NextResponse.json(kind && key ? [] : {});
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/stock/notes { kind, key, content }
export async function POST(request: NextRequest) {
  const guard = await adminSession();
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const kind = String(body.kind ?? '');
    const key = String(body.key ?? '').trim();
    const content = String(body.content ?? '').trim();
    if (!KINDS.includes(kind as Kind) || !key) return NextResponse.json({ error: 'Référence invalide' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'La note est vide' }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: 'Note trop longue (2000 caractères max)' }, { status: 400 });

    const note = await prisma.stockNote.create({
      data: { kind, refKey: key, content, authorId: session.user.id },
      select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } },
    });
    createAudit({ userId: session.user.id, action: 'Note stock ajoutée', entity: 'STOCK', entityId: key, detail: content.slice(0, 120) });
    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    if (tableAbsente(e)) return NextResponse.json({ error: 'Les notes ne sont pas encore activées (migration en attente du prochain déploiement)' }, { status: 503 });
    console.error(e);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
