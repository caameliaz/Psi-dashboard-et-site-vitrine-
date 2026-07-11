'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSSEContext } from '@/lib/sse-context';
import { useSession } from 'next-auth/react';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_AUTRE' | 'ACTION_PERSO' | 'ANNULATION';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface Toast {
  id: string;
  type: NotifType;
  title: string;
  message: string;
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

const TYPE_CONFIG: Record<NotifType, { dot: string; bg: string; border: string; label: string }> = {
  SITE_COMMANDE: { dot: '#4CAF4F', bg: '#F0FDF4', border: '#BBF7D0', label: 'Commande' },
  SITE_DEVIS:    { dot: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'Devis' },
  ACTION_AUTRE:  { dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'Activité' },
  ACTION_PERSO:  { dot: '#9CA3AF', bg: '#F8FAFC', border: '#E2E8F0', label: 'Action' },
  ANNULATION:    { dot: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'Annulation' },
};

function mapDbNotif(n: { id: string; type?: string; title?: string; message?: string; createdAt: string; read?: boolean }): Notif {
  return {
    id: n.id,
    type: (n.type ?? 'ACTION_AUTRE') as NotifType,
    title: n.title ?? '—',
    message: n.message ?? '',
    createdAt: n.createdAt,
    read: n.read ?? false,
  };
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.ACTION_AUTRE;
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 7000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="flex items-start justify-between gap-4 rounded-2xl shadow-2xl border px-5 py-4 cursor-pointer"
      style={{ background: '#fff', borderColor: cfg.border, minWidth: 360, maxWidth: 440 }}
      onClick={() => onDismiss(toast.id)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#0F172A] leading-snug">{toast.title}</p>
        <p className="text-[13px] text-[#374151] mt-1 leading-snug">{toast.message}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }} className="text-[#ABBED1] hover:text-[#64748B] text-[20px] leading-none flex-shrink-0 mt-0.5">×</button>
    </div>
  );
}

function IconBell() {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#717171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function NotifBell() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [open, setOpen]       = useState(false);
  const [toasts, setToasts]   = useState<Toast[]>([]);
  const notifIds = useRef(new Set<string>());

  const { subscribe } = useSSEContext();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const unread = notifs.filter((n) => !n.read).length;

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const mapped = data.map(mapDbNotif);
      mapped.forEach((n: Notif) => notifIds.current.add(n.id));
      setNotifs(mapped);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    return subscribe((payload) => {
      const notif = payload?.notif;
      if (!notif || notifIds.current.has(notif.id)) return;
      // Notif ciblée (assignation) : ne concerne que l'utilisateur visé
      if (notif.targetUserId && notif.targetUserId !== currentUserId) return;
      notifIds.current.add(notif.id);
      const mapped = mapDbNotif({ ...notif, read: false });
      setNotifs((prev) => [mapped, ...prev]);
      setToasts((prev) => [...prev, { id: notif.id, type: notif.type as NotifType, title: notif.title, message: notif.message }]);
    });
  }, [subscribe, currentUserId]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markRead = async (id: string) => {
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const markAll = async () => {
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
    await fetch('/api/notifications/read', { method: 'PATCH' }).catch(() => {});
  };

  return (
    <>
      {/* Toast container */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Bell button + dropdown */}
      <div className="relative">
        <button
          onClick={() => { setOpen((v) => !v); if (!open) fetchNotifs(); }}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors shadow-sm"
        >
          <IconBell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#EF4444] border-2 border-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-white leading-none px-0.5">{unread > 99 ? '99+' : unread}</span>
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-[calc(100%+10px)] bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] z-50 overflow-hidden flex flex-col" style={{ width: 420 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7]">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[16px] font-bold text-[#0F172A]">Notifications</h3>
                  {unread > 0 && (
                    <span className="text-[11px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded-full">{unread}</span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={markAll} className="text-[12px] font-semibold text-[#4CAF4F] hover:text-[#388E3C] transition-colors">
                    Tout marquer lu
                  </button>
                )}
              </div>
              <style>{`.notif-scroll::-webkit-scrollbar{width:4px}.notif-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.08);border-radius:4px}`}</style>
              <div className="notif-scroll py-2" style={{ maxHeight: 480, overflowY: 'auto' }}>
                {notifs.length === 0 && (
                  <p className="text-center text-[13px] text-[#ABBED1] py-10">Aucune notification</p>
                )}
                {notifs.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.ACTION_AUTRE;
                  return (
                    <div key={n.id}
                      onClick={() => markRead(n.id)}
                      className="mx-3 my-1 rounded-xl border cursor-pointer transition-all px-4 py-3"
                      style={{ background: n.read ? '#fff' : cfg.bg, borderColor: n.read ? '#E2E8F0' : cfg.border }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C7D7F0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = n.read ? '#E2E8F0' : cfg.border; }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[#0F172A] leading-snug">{n.title}</p>
                            <p className="text-[12px] text-[#374151] mt-0.5 leading-snug">{n.message}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="text-[11px] text-[#ABBED1] whitespace-nowrap">{relativeTime(n.createdAt)}</span>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-[#EF4444]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {notifs.length > 0 && (
                <div className="px-5 py-3 border-t border-[#F2F4F7] text-center">
                  <p className="text-[11px] text-[#ABBED1]">{notifs.length} notification{notifs.length > 1 ? 's' : ''} au total</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
