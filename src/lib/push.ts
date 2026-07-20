import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Configure les clés VAPID une seule fois
let configured = false;
function ensureConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC;
  const priv = process.env.VAPID_PRIVATE;
  if (!pub || !priv) return false;
  if (!configured) {
    const contact = process.env.EMAIL_FROM || 'Contact@psi.dz';
    webpush.setVapidDetails(
      contact.includes('@') ? `mailto:${contact}` : 'mailto:Contact@psi.dz',
      pub, priv,
    );
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;   // page ouverte au clic
  tag?: string;   // regroupe les notifs
}

// Envoie une notification push à une liste d'utilisateurs (tous leurs appareils).
// Non bloquant côté appelant : à utiliser avec .catch(() => {}).
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!ensureConfigured()) return;                 // pas de clés → on ignore silencieusement
  const targets = [...new Set(userIds)].filter(Boolean);
  if (targets.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: targets } } });
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        data,
      );
    } catch (err: any) {
      // 404/410 = abonnement expiré → on le supprime
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }
  }));
}
