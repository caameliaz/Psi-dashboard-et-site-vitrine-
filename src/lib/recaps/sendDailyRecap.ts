import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';
import { dailyRecapTemplate, type DailyRecapItem } from '@/emails/dailyRecapTemplate';
import { logoAttachment } from '@/emails/shared';
import { DB_TO_UI, buildCard } from './shared';

// Logique métier pure : récupère les données + envoie l'email. Ne dépend
// d'aucun système de planification — appelable directement depuis un script,
// une route API de test, ou (plus tard) une tâche Trigger.dev.

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface SendDailyRecapResult {
  itemCount: number;
  sent: number;
  failed: { email: string; error: string }[];
}

export async function sendDailyRecap(): Promise<SendDailyRecapResult> {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [orders, quotes, admins] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      include: { client: true, items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.quote.findMany({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      include: { client: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Étape 4 : seuls les admins ACTIFS avec une adresse email non vide reçoivent le récap.
    // `User.email` est obligatoire en base (schema.prisma), mais on filtre quand même
    // les chaînes vides par sécurité plutôt que de supposer que la contrainte tient.
    prisma.user.findMany({
      where: { role: 'ADMIN', active: true },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const items: DailyRecapItem[] = [
    ...orders.map((o): DailyRecapItem => ({
      ref: o.ref ?? o.id.slice(0, 8).toUpperCase(),
      type: 'Commande',
      client: o.client?.company || o.client?.name || o.clientCompany || o.clientName || '—',
      statut: DB_TO_UI[o.status] ?? o.status,
      montant: `${o.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0).toLocaleString('fr-FR')} DA`,
    })),
    ...quotes.map((q): DailyRecapItem => ({
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
    console.warn(`[sendDailyRecap] ${skipped} admin(s) actif(s) sans adresse email valide — ignorés.`);
  }
  if (validAdmins.length === 0) {
    console.warn('[sendDailyRecap] Aucun admin actif avec adresse email — récap non envoyé.');
    return { itemCount: items.length, sent: 0, failed: [] };
  }

  const dateLabel = yesterdayStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const adminUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/requests`;
  const { subject, html, text } = dailyRecapTemplate({
    dateLabel,
    commandes: buildCard(orders),
    devis: buildCard(quotes),
    items,
    adminUrl,
  });

  const failed: { email: string; error: string }[] = [];
  let sent = 0;
  // Chaque admin reçoit le récap dans sa propre boîte — envois séquentiels
  // pour rester simple et éviter de saturer la connexion SMTP Gmail.
  for (const admin of validAdmins) {
    const result = await sendEmail({ to: admin.email, subject, html, text, attachments: [logoAttachment] });
    if (result.success) sent++;
    else failed.push({ email: admin.email, error: result.error });
  }

  return { itemCount: items.length, sent, failed };
}
