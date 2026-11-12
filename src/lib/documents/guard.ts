// Droits d'accès aux documents : le BL est ouvert à toute personne qui voit les commandes ;
// facture et proforma (prix, TVA, timbre) sont réservées aux ADMINS, comme l'émission et la modification.
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import type { DocumentKind } from './types';

export type DocSession = { id: string; role?: string; isAdmin: boolean };

export async function guardDocs(kind: DocumentKind | 'ADMIN') {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), user: null as DocSession | null };
  const u = session.user as { id: string; role?: string; permissions?: string[] };
  const isAdmin = u.role === 'ADMIN';
  const user: DocSession = { id: u.id, role: u.role, isAdmin };
  if (kind === 'ADMIN' || kind === 'FACTURE' || kind === 'PROFORMA') {
    if (!isAdmin) return { error: NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 }), user: null as DocSession | null };
  } else if (!hasPermission(session.user as never, 'voir_commandes')) {
    return { error: NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 }), user: null as DocSession | null };
  }
  return { error: null, user };
}

export const isKind = (v: unknown): v is DocumentKind => v === 'BL' || v === 'FACTURE' || v === 'PROFORMA';
