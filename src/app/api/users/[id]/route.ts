import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — modifier rôle / statut / infos (permission gerer_utilisateurs)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = body.active;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.photo !== undefined) data.photo = body.photo;
    if (body.permissions !== undefined) data.permissions = body.permissions;
    if (body.password !== undefined) data.password = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        active: true, phone: true, photo: true, permissions: true, createdAt: true,
      },
    });

    const action = body.active === false ? 'Utilisateur désactivé'
      : body.active === true ? 'Utilisateur activé'
      : body.permissions !== undefined && Object.keys(body).length === 1 ? 'Autorisations modifiées'
      : 'Utilisateur modifié';
    createAudit({ userId: session.user.id, action, entity: 'UTILISATEUR', entityId: id, detail: user.name });
    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/[id] — supprimer un utilisateur (permission gerer_utilisateurs)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    // Empêcher de supprimer son propre compte
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 409 });
    }

    // Blocage si l'utilisateur a de l'activité (préserve l'historique) — proposer la désactivation
    const [orders, quotes, notes, logs] = await Promise.all([
      prisma.order.count({ where: { createdById: id } }),
      prisma.quote.count({ where: { createdById: id } }),
      prisma.clientNote.count({ where: { authorId: id } }),
      prisma.auditLog.count({ where: { userId: id } }),
    ]);
    if (orders + quotes + notes + logs > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer : cet utilisateur a de l'activité (commandes, devis, notes ou journal). Désactivez-le plutôt." },
        { status: 409 }
      );
    }

    await prisma.user.delete({ where: { id } });
    createAudit({ userId: session.user.id, action: 'Utilisateur supprimé', entity: 'UTILISATEUR', entityId: id, detail: `${target.name} (${target.email})` });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
