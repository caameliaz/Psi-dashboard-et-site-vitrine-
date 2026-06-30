'use client';

import { useState, useEffect, useCallback } from 'react';

type NotifType = 'commande' | 'devis' | 'action' | 'team';

interface Notif {
  id: string | number;
  type: NotifType;
  title: string;
  preview: string;
  detail: string;
  time: string;
  read: boolean;
}

function dbNotifType(type: string): NotifType {
  if (type === 'ORDER') return 'commande';
  if (type === 'QUOTE') return 'devis';
  if (type === 'TEAM')  return 'team';
  return 'action';
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

function dbNotifToNotif(n: any): Notif {
  return {
    id: n.id,
    type: dbNotifType(n.type ?? 'ACTION'),
    title: n.title ?? '—',
    preview: n.body ?? '',
    detail: n.meta ?? '',
    time: relativeTime(n.createdAt),
    read: n.read ?? false,
  };
}

const typeConfig: Record<NotifType, { label: string; dot: string; bg: string; border: string }> = {
  commande: { label: 'Commande', dot: '#4CAF4F', bg: '#F0FDF4', border: '#BBF7D0' },
  devis:    { label: 'Devis',    dot: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  action:   { label: 'Action',   dot: '#9CA3AF', bg: '#F8FAFC', border: '#E2E8F0' },
  team:     { label: 'Équipe',   dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
};

function IconBell() {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#717171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function TopBar() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen]     = useState(false);
  const unread = notifs.filter((n) => !n.read).length;

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.map(dbNotifToNotif));
      }
    } catch { /* silently ignore — pas de session encore */ }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markRead = async (id: string | number) => {
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  };

  const markAll = async () => {
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
    await fetch('/api/notifications/read', { method: 'POST' }).catch(() => {});
  };

  return (
    <header className="border-b border-[#E4EBF5] flex items-center justify-end px-8" style={{ background: '#FAFCFF', height: 80, minHeight: 80 }}>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors shadow-sm"
        >
          <IconBell />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3B82F6] border-2 border-white" />
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-[calc(100%+10px)] bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] z-50 overflow-hidden flex flex-col" style={{ width: 500 }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#F2F4F7]">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[17px] font-bold text-[#0F172A]">Notifications</h3>
                  {unread > 0 && (
                    <span className="text-[11px] font-bold bg-[#3B82F6] text-white px-2 py-0.5 rounded-full">{unread} nouvelles</span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={markAll} className="text-[12px] font-semibold text-[#4CAF4F] hover:text-[#388E3C] transition-colors">
                    Tout marquer lu
                  </button>
                )}
              </div>

              {/* Légende types */}
              <div className="flex items-center gap-5 px-6 py-3 border-b border-[#F2F4F7]">
                {(Object.entries(typeConfig) as [NotifType, typeof typeConfig[NotifType]][]).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A9BB5]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.dot }} />
                    {v.label}
                  </span>
                ))}
              </div>

              {/* Liste */}
              <style>{`.notif-scroll::-webkit-scrollbar{width:4px}.notif-scroll::-webkit-scrollbar-track{background:transparent}.notif-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.08);border-radius:4px}`}</style>
              <div className="notif-scroll py-2" style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {notifs.map((n) => {
                    const cfg = typeConfig[n.type];
                    return (
                      <div key={n.id} onClick={() => markRead(n.id)}
                        className="mx-4 my-1.5 rounded-xl border cursor-pointer transition-all px-4 py-3"
                        style={{ background: '#fff', borderColor: '#E2E8F0' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C7D7F0'; e.currentTarget.style.background = '#F8FAFC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[#0F172A] leading-snug mb-0.5">{n.title}</p>
                            <p className="text-[12px] text-[#374151]">{n.preview}</p>
                            <p className="text-[11px] text-[#8A9BB5] mt-1">{n.detail}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-[11px] text-[#ABBED1] whitespace-nowrap">{n.time}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#F2F4F7] text-center">
                <button className="text-[12px] font-semibold text-[#4CAF4F] hover:text-[#388E3C] transition-colors">
                  Voir toutes les notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
