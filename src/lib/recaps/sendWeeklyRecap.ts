import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';
import { weeklyRecapTemplate } from '@/emails/weeklyRecapTemplate';
import { logoAttachment, type RecapItem } from '@/emails/shared';
import { DB_TO_UI, buildCard } from './shared';

// Même principe que sendDailyRecap : logique métier pure, indépendante de la
// planification, réutilisable depuis un script, une route de test ou une
// tâche Trigger.dev.

/** Lundi 00:00 de la semaine contenant `d`. */
function startOfWeek(d: Date) {
  const x = new Date(d);
  const dayOffset = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - dayOffset);
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface SendWeeklyRecapResult {
  totalCommandes: number;
  totalDevis: number;
  sent: number;
  failed: { email: string; error: string }[];
}

export async function sendWeeklyRecap(): Promise<SendWeeklyRecapResult> {
  const thisWeekStart = startOfWeek(new Date());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = thisWeekStart; // exclusif

  const [orders, quotes, admins] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
      include: { client: true, items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.quote.findMany({
      where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
      include: { client: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Étape 4 : seuls les admins ACTIFS avec une adresse email non vide reçoivent le récap.
    prisma.user.findMany({
      // Reçoivent le récap : les ADMINS + les employés ayant la permission
      // 'recevoir_recaps'. Chacun peut se désabonner depuis son profil (recapWeekly).
      where: {
        active: true,
        recapWeekly: true,
        OR: [{ role: 'ADMIN' }, { permissions: { has: 'recevoir_recaps' } }],
      },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const items: RecapItem[] = [
    ...orders.map((o): RecapItem => ({
      ref: o.ref ?? o.id.slice(0, 8).toUpperCase(),
      type: 'Commande',
      client: o.client?.company || o.client?.name || o.clientCompany || o.clientName || '—',
      statut: DB_TO_UI[o.status] ?? o.status,
      montant: `${o.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0).toLocaleString('fr-FR')} DA`,
    })),
    ...quotes.map((q): RecapItem => ({
      ref: q.ref ?? q.id.slice(0, 8).toUpperCase(),
      type: 'Devis',
      client: q.client?.company || q.client?.name || q.clientCompany || q.clientName || '—',
      statut: DB_TO_UI[q.status] ?? q.status,
      montant: q.proposedPrice ? `${Number(q.proposedPrice).toLocaleString('fr-FR')} DA` : 'Sur devis',
    })),
  ];

  const validAdmins = admins.filter((a) => a.email && a.email.trim() !== '');
  const skipped = admins.length - validAdmins.length;
  if (skipped > 0) {
    console.warn(`[sendWeeklyRecap] ${skipped} admin(s) actif(s) sans adresse email valide — ignorés.`);
  }
  if (validAdmins.length === 0) {
    console.warn('[sendWeeklyRecap] Aucun admin actif avec adresse email — récap non envoyé.');
    return { totalCommandes: orders.length, totalDevis: quotes.length, sent: 0, failed: [] };
  }

  const lastWeekEndInclusive = new Date(lastWeekEnd.getTime() - 86400000);
  const weekLabel = `${lastWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${lastWeekEndInclusive.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const adminUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/requests`;
  const { subject, html, text } = weeklyRecapTemplate({
    weekLabel,
    commandes: buildCard(orders),
    devis: buildCard(quotes),
    items,
    adminUrl,
  });

  const failed: { email: string; error: string }[] = [];
  let sent = 0;
  for (const admin of validAdmins) {
    const result = await sendEmail({ to: admin.email, subject, html, text, attachments: [logoAttachment] });
    if (result.success) sent++;
    else failed.push({ email: admin.email, error: result.error });
  }

  return { totalCommandes: orders.length, totalDevis: quotes.length, sent, failed };
}
