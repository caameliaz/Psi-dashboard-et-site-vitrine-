import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAudit, PAGE_VIEW_ACTION } from '@/lib/audit';
import { isReadOnly } from '@/lib/permissions';

// Libellés lisibles des pages (du plus précis au plus général — on prend le premier préfixe qui correspond)
const PAGES: [string, string][] = [
  ['/admin/dashboard', 'Dashboard'],
  ['/admin/requests', 'Commandes & devis'],
  ['/admin/clients', 'Clients'],
  ['/admin/products', 'Produits'],
  ['/admin/recipes', 'Recettes'],
  ['/admin/stock', 'Stock'],
  ['/admin/settings/messages', 'Réglages › Messages'],
  ['/admin/settings/content', 'Réglages › Contenu du site'],
  ['/admin/settings/history', 'Réglages › Historique'],
  ['/admin/settings/users', 'Réglages › Utilisateurs'],
  ['/admin/settings', 'Réglages'],
  ['/admin/notifications', 'Notifications'],
  ['/admin/profile', 'Profil'],
];

// POST /api/activity — { path } : enregistre « Page consultée » pour un compte en LECTURE SEULE
// (investisseurs…). Ne fait rien pour les autres comptes. Le journal n'est visible que de la propriétaire
// (cf. OWNER_ONLY_ACTIONS). Le libellé est calculé ICI à partir du chemin (le client n'envoie rien d'autre).
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isReadOnly(session.user)) return NextResponse.json({ ok: true, tracked: false });

  let path = '';
  try { path = String((await request.json()).path ?? ''); } catch { /* corps invalide */ }
  path = path.split('?')[0].slice(0, 120);
  if (!path.startsWith('/admin')) return NextResponse.json({ ok: false }, { status: 400 });

  const label = PAGES.find(([p]) => path === p || path.startsWith(p + '/'))?.[1] ?? 'Autre page';
  createAudit({ userId: session.user.id, action: PAGE_VIEW_ACTION, entity: 'UTILISATEUR', entityId: session.user.id, detail: `${label} (${path})` });
  return NextResponse.json({ ok: true, tracked: true });
}
