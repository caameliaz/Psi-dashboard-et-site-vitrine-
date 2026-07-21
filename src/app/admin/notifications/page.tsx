'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSSE } from '@/lib/use-sse';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_AUTRE' | 'ACTION_PERSO' | 'ANNULATION';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  orderId?: string | null;
  quoteId?: string | null;
  clientId?: string | null;
  link?: string | null;
}

// Cible de navigation d'une notif (null = non cliquable)
function notifTarget(n: { orderId?: string | null; quoteId?: string | null; clientId?: string | null; link?: string | null }): string | null {
  if (n.orderId) return `/admin/requests?open=${n.orderId}`;
  if (n.quoteId) return `/admin/requests?open=${n.quoteId}`;
  if (n.clientId) return `/admin/clients?open=${n.clientId}`;
  if (n.link) return n.link;
  return null;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return "À l'instant";
  if (min < 60)  return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1)   return 'Hier';
  return `Il y a ${d}j`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TYPE_CONFIG: Record<NotifType, { dot: string; bg: string; border: string; label: string; icon: string }> = {
  SITE_COMMANDE: { dot: '#4CAF4F', bg: '#F0FDF4', border: '#BBF7D0', label: 'Commande site',  icon: '🛒' },
  SITE_DEVIS:    { dot: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'Devis site',     icon: '📋' },
  ACTION_AUTRE:  { dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'Activité équipe', icon: '⚡' },
  ACTION_PERSO:  { dot: '#9CA3AF', bg: '#F8FAFC', border: '#E2E8F0', label: 'Ma action',       icon: '👤' },
  ANNULATION:    { dot: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'Annulation',      icon: '🚫' },
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'all',     label: 'Toutes' },
  { key: 'unread',  label: 'Non lues' },
  { key: 'SITE_COMMANDE', label: 'Commandes' },
  { key: 'SITE_DEVIS',    label: 'Devis' },
  { key: 'ACTION_AUTRE',  label: 'Activité' },
];

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const router = useRouter();

  const fetchNotifs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.map((n: any): Notif => ({
          id:        n.id,
          type:      (n.type ?? 'ACTION_AUTRE') as NotifType,
          title:     n.title ?? '—',
          message:   n.message ?? '',
          createdAt: n.createdAt,
          read:      n.read ?? false,
          orderId:   n.orderId ?? null,
          quoteId:   n.quoteId ?? null,
          clientId:  n.clientId ?? null,
          link:      n.link ?? null,
        })));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);
  // Temps réel : nouvelle notif → apparaît sans refresh ni spinner
  useSSE(useCallback(() => { fetchNotifs(true); }, [fetchNotifs]));

  const markRead = async (id: string) => {
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const markAll = async () => {
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
    await fetch('/api/notifications/read', { method: 'PATCH' }).catch(() => {});
  };

  const filtered = notifs.filter((n) => {
    if (filter === 'all')    return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Notifications</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">
            {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll}
            className="px-4 py-2 rounded-xl text-[13px] font-bold text-white transition-colors"
            style={{ background: '#4CAF4F' }}>
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors border"
            style={filter === f.key
              ? { background: '#0F172A', color: '#fff', borderColor: '#0F172A' }
              : { background: '#fff', color: '#8A9BB5', borderColor: '#E2E8F0' }}>
            {f.label}
            {f.key === 'unread' && unread > 0 && (
              <span className="ml-1.5 bg-[#EF4444] text-white rounded-full px-1.5 py-0.5 text-[10px]">{unread}</span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#4CAF4F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#ABBED1] text-[14px]">Aucune notification</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.ACTION_AUTRE;
            const target = notifTarget(n);
            return (
              <div key={n.id}
                onClick={() => { if (!n.read) markRead(n.id); if (target) router.push(target); }}
                className="rounded-xl border p-4 transition-all"
                style={{
                  background: n.read ? '#fff' : cfg.bg,
                  borderColor: n.read ? '#E2E8F0' : cfg.border,
                  cursor: (target || !n.read) ? 'pointer' : 'default',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-[20px] flex-shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.dot, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-[#0F172A] leading-snug">{n.title}</p>
                    <p className="text-[13px] text-[#374151] mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-[#ABBED1] mt-2">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="flex-shrink-0 text-[11px] font-semibold text-[#8A9BB5] hover:text-[#374151] transition-colors border border-[#E2E8F0] rounded-lg px-2 py-1 bg-white">
                      Lu
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
