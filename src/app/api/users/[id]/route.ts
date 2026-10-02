import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createAudit, LOGIN_ACTION } from '@/lib/audit';
import { sendEmail } from '@/lib/email/send';
import { logoAttachment } from '@/emails/shared';
import { renderPasswordResetDoneEmail } from '@/emails/passwordResetTemplate';
import { isOwnerEmail } from '@/lib/owner';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — modifier rôle / statut / infos (permission gerer_utilisateurs)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    // Désactivation (ex. licenciement) avec reprise des clients :
    //  • reassignClientsTo : commercial par défaut (clients non répartis, congés, autres commandes) ;
    //  • reassignClients   : { clientId: userId | null } pour répartir client par client.
    // Chaque commercial choisi doit exister, être actif et différent — vérifié AVANT de désactiver.
    const cibleReassignation: string | null = body.active === false && body.reassignClientsTo ? String(body.reassignClientsTo) : null;
    const repartition: Record<string, string | null> =
      body.active === false && body.reassignClients && typeof body.reassignClients === 'object' ? body.reassignClients : {};
    const cibles = [...new Set([cibleReassignation, ...Object.values(repartition)].filter((c): c is string => !!c))];
    if (cibles.length) {
      const actifs = await prisma.user.findMany({ where: { id: { in: cibles }, active: true }, select: { id: true } });
      if (actifs.length !== cibles.length || cibles.includes(id)) {
        return NextResponse.json({ error: 'Choisissez un autre commercial actif pour reprendre les clients' }, { status: 400 });
      }
    }

    // Récupérer l'ancien email avant la modification
    const oldUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) data.role = body.role;
    // Rôle personnalisé (étiquette) : id d'un rôle existant, ou null pour l'enlever. Un ADMIN n'en a jamais.
    if (body.customRoleId !== undefined || body.role === 'ADMIN') {
      const wanted = body.role === 'ADMIN' || !body.customRoleId ? null : String(body.customRoleId);
      data.customRoleId = wanted && (await prisma.customRole.findUnique({ where: { id: wanted }, select: { id: true } })) ? wanted : null;
    }
    if (body.active !== undefined) data.active = body.active;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.photo !== undefined) data.photo = body.photo;
    if (body.permissions !== undefined) data.permissions = body.permissions;
    if (body.twoFactorDisabled !== undefined) data.twoFactorDisabled = Boolean(body.twoFactorDisabled);
    if (body.password !== undefined) {
      data.password = await bcrypt.hash(body.password, 10);
      // Réinitialiser le mot de passe efface la demande "mot de passe oublié"
      data.resetRequested = false;
      data.resetRequestedAt = null;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true, customRoleId: true,
        active: true, phone: true, photo: true, permissions: true, createdAt: true, twoFactorDisabled: true,
      },
    });

    const action = body.active === false ? 'Utilisateur désactivé'
      : body.active === true ? 'Utilisateur activé'
      : body.twoFactorDisabled === true ? 'Code de connexion par email désactivé'
      : body.twoFactorDisabled === false ? 'Code de connexion par email réactivé'
      : body.permissions !== undefined && Object.keys(body).length === 1 ? 'Autorisations modifiées'
      : 'Utilisateur modifié';
    createAudit({ userId: session.user.id, action, entity: 'UTILISATEUR', entityId: id, detail: user.name });

    // Envoi d'email de bienvenue si l'email a changé (ou a été ajouté)
    if (body.email !== undefined && oldUser?.email !== body.email) {
      const { renderWelcomeEmailNoPassword } = await import('@/emails/accountCreatedTemplate');
      const mail = renderWelcomeEmailNoPassword({
        name: user.name ?? 'Utilisateur',
        email: user.email ?? body.email,
        role: user.role,
        roleName: user.customRoleId ? (await prisma.customRole.findUnique({ where: { id: user.customRoleId }, select: { name: true } }))?.name ?? null : null,
      });
      sendEmail({ to: user.email ?? body.email, subject: mail.subject, html: mail.html, attachments: [logoAttachment] })
        .catch(() => {});
    }

    // Réinitialisation de mot de passe → le nouveau est envoyé par email AUX ADMINS,
    // pour qu'ils puissent le transmettre sans avoir à le recopier de l'écran.
    if (body.password !== undefined) {
      const resetBy = session.user.name ?? session.user.email ?? 'Un administrateur';
      prisma.user
        .findMany({ where: { role: 'ADMIN', active: true }, select: { email: true } })
        .then((admins) => {
          const mail = renderPasswordResetDoneEmail({
            name: user.name ?? '—',
            email: user.email ?? '—',
            password: body.password,
            resetBy,
          });
          return Promise.all(
            admins
              .filter((a) => isOwnerEmail(a.email)) // e-mail contenant le mot de passe : propriétaire uniquement
              .map((a) =>
                sendEmail({ to: a.email!, subject: mail.subject, html: mail.html, attachments: [logoAttachment] }),
              ),
          );
        })
        .catch(() => {});
    }

    // ── Désactivation : clients et commandes/devis en cours repris par un autre commercial ──
    // • ses clients → nouveau commercial, qui ne voit que les commandes créées à partir
    //   d'aujourd'hui (assignedSince) — l'historique reste réservé aux admins ;
    // • ses commandes/devis EN COURS → nouveau commercial (pour le suivi) ; les ventes
    //   livrées/annulées restent à son nom (statistiques justes) ;
    // • ses congés en cours sont clôturés sans rendre les clients (compte désactivé) ;
    //   s'ils étaient chez un remplaçant, ils passent aussi au nouveau commercial.
    // Le stock déjà attribué à ce commercial n'est pas modifié ici.
    let reassignation: { clients: number; commandes: number; devis: number } | null = null;
    if (body.active === false && (body.reassignClientsTo !== undefined || body.reassignClients !== undefined)) {
      const maintenant = new Date();
      const enCours = { in: ['EN_ATTENTE', 'CONTACTE', 'VALIDE', 'PRODUITE'] as ('EN_ATTENTE' | 'CONTACTE' | 'VALIDE' | 'PRODUITE')[] };
      const [sesClients, conges] = await Promise.all([
        prisma.client.findMany({ where: { assignedToId: id }, select: { id: true } }),
        prisma.leaveAssignment.findMany({ where: { employeeId: id, status: 'ACTIVE' }, select: { clientIds: true } }),
      ]);
      // Client → commercial qui le reprend (répartition, sinon le commercial par défaut)
      const parCible = new Map<string | null, string[]>();
      for (const c of sesClients) {
        const cible = c.id in repartition ? (repartition[c.id] || null) : cibleReassignation;
        parCible.set(cible, [...(parCible.get(cible) ?? []), c.id]);
      }
      // Clients qu'il avait confiés à un remplaçant (congé en cours) → commercial par défaut s'il y en a un
      const clientsConges = conges.flatMap((c) => c.clientIds);
      const total = { clients: 0, commandes: 0, devis: 0 };
      await prisma.$transaction(async (tx) => {
        for (const [cible, ids] of parCible) {
          total.clients += (await tx.client.updateMany({ where: { id: { in: ids } }, data: { assignedToId: cible, assignedSince: cible ? maintenant : null } })).count;
          if (cible) {
            // Commandes/devis EN COURS de ces clients → suivent le client
            total.commandes += (await tx.order.updateMany({ where: { assignedToId: id, status: enCours, clientId: { in: ids } }, data: { assignedToId: cible } })).count;
            total.devis += (await tx.quote.updateMany({ where: { assignedToId: id, status: enCours, clientId: { in: ids } }, data: { assignedToId: cible } })).count;
          }
        }
        if (cibleReassignation) {
          if (clientsConges.length) {
            total.clients += (await tx.client.updateMany({ where: { id: { in: clientsConges } }, data: { assignedToId: cibleReassignation, assignedSince: maintenant } })).count;
          }
          // Ses autres commandes/devis en cours (clients qui ne sont pas à lui) → commercial par défaut
          total.commandes += (await tx.order.updateMany({ where: { assignedToId: id, status: enCours }, data: { assignedToId: cibleReassignation } })).count;
          total.devis += (await tx.quote.updateMany({ where: { assignedToId: id, status: enCours }, data: { assignedToId: cibleReassignation } })).count;
        }
        await tx.leaveAssignment.updateMany({ where: { employeeId: id, status: 'ACTIVE' }, data: { status: 'ENDED', endedAt: maintenant, endedById: session.user.id } });
      });
      reassignation = total;
      const noms = new Map((await prisma.user.findMany({ where: { id: { in: cibles } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
      const detailRepartition = [...parCible].map(([cible, ids]) => `${ids.length} → ${cible ? noms.get(cible) ?? cible : 'sans commercial'}`).join(', ');
      createAudit({
        userId: session.user.id,
        action: 'Utilisateur désactivé — reprise des clients',
        entity: 'UTILISATEUR',
        entityId: id,
        detail: `${user.name} : clients ${detailRepartition || '0'} ; ${total.commandes} commande(s) et ${total.devis} devis en cours transférés`,
      });
    }

    return NextResponse.json(reassignation ? { ...user, reassignation } : user);
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

    // Suppression définitive : réservée aux comptes autorisés (canHardDelete — Camélia).
    // Les autres admins peuvent seulement désactiver. Vérifié côté serveur, pas seulement à l'écran.
    const auteur = await prisma.user.findUnique({ where: { id: session.user.id }, select: { canHardDelete: true } });
    if (!auteur?.canHardDelete) {
      return NextResponse.json({ error: "Seule l'administratrice principale peut supprimer définitivement un compte. Désactivez-le plutôt." }, { status: 403 });
    }

    // Empêcher de supprimer son propre compte
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 409 });
    }

    // Blocage si l'utilisateur a de l'activité (préserve l'historique) — proposer la désactivation
    const [orders, quotes, notes, logs] = await Promise.all([
      prisma.order.count({ where: { createdById: id } }),
      prisma.quote.count({ where: { createdById: id } }),
      prisma.clientNote.count({ where: { authorId: id } }),
      // les simples lignes « Connexion » ne comptent pas comme de l'activité (cf. LOGIN_ACTION)
      prisma.auditLog.count({ where: { userId: id, NOT: { action: LOGIN_ACTION } } }),
    ]);
    if (orders + quotes + notes + logs > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer : cet utilisateur a de l'activité (commandes, devis, notes ou journal). Désactivez-le plutôt." },
        { status: 409 }
      );
    }

    // Ses lignes de connexion référencent le compte : on les efface avec lui
    await prisma.auditLog.deleteMany({ where: { userId: id, action: LOGIN_ACTION } });
    await prisma.user.delete({ where: { id } });
    createAudit({ userId: session.user.id, action: 'Utilisateur supprimé', entity: 'UTILISATEUR', entityId: id, detail: `${target.name} (${target.email})` });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
