'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSSEContext } from '@/lib/sse-context';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_AUTRE' | 'ACTION_PERSO' | 'ANNULATION';
type Category  = 'CREATION' | 'MAJ' | 'SUPPRESSION';

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
  if (min < 1)  return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1)  return 'Hier';
  return `Il y a ${d}j`;
}

function getCategory(n: Notif): Category {
  if (n.type === 'SITE_COMMANDE' || n.type === 'SITE_DEVIS') return 'CREATION';
  const msg = (n.title + ' ' + n.message).toLowerCase();
  if (msg.includes('supprimé') || msg.includes('suppression')) return 'SUPPRESSION';
  if (
    msg.includes('créé') || msg.includes('crée') || msg.includes('nouvel') ||
    msg.includes('nouvelle') || msg.includes('nouveau') || msg.includes('converti')
  ) return 'CREATION';
  return 'MAJ';
}

const CAT_CONFIG: Record<Category, { label: string; bg: string; color: string; border: string }> = {
  CREATION:    { label: 'CRÉATION',    bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  MAJ:         { label: 'MISE À JOUR', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  SUPPRESSION: { label: 'SUPPRESSION', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};


function mapDbNotif(n: any): Notif {
  return {
    id: n.id,
    type: (n.type ?? 'ACTION_AUTRE') as NotifType,
    title: n.title ?? '—',
    message: n.message ?? '',
    createdAt: n.createdAt,
    read: n.read ?? false,
  };
}

/**
 * Retourne le message formaté avec l'employé et l'entité en gras.
 * Formats gérés (depuis notify-activity.ts) :
 *  A) "ACTEUR — TYPE de CLIENT → STATUT"
 *  B) "ACTEUR a VERB TYPE : ENTITE"
 *  C) "ACTEUR a VERB ... pour ENTITE (REF)"
 *  D) "ACTEUR a VERB ... de ENTITE (suffix)"
 *  E) "CLIENT — detail" (site sans acteur)
 */
function renderMsg(msg: string): React.ReactNode {
  // A) "ACTEUR — TYPE de CLIENT → STATUT"
  {
    const m = msg.match(/^(.+?) — (.+? de )(.+?)( →.+)?$/);
    if (m) return <><strong>{m[1]}</strong>{` — ${m[2]}`}<strong>{m[3]}</strong>{m[4] ?? ''}</>;
  }
  // B) "ACTEUR a ... : ENTITE"
  {
    const m = msg.match(/^(.+?) (a .+? : )(.+)$/);
    if (m) return <><strong>{m[1]}</strong>{` ${m[2]}`}<strong>{m[3]}</strong></>;
  }
  // C) "ACTEUR a ... pour ENTITE (REF)"
  {
    const m = msg.match(/^(.+?) (a .+? pour )(.+?)( \([^)]+\).*)?$/);
    if (m) return <><strong>{m[1]}</strong>{` ${m[2]}`}<strong>{m[3]}</strong>{m[4] ?? ''}</>;
  }
  // D) "ACTEUR a ... de ENTITE (suffix)"
  {
    const m = msg.match(/^(.+?) (a .+? de )(.+?)( \([^)]+\).*| en .+)?$/);
    if (m) return <><strong>{m[1]}</strong>{` ${m[2]}`}<strong>{m[3]}</strong>{m[4] ?? ''}</>;
  }
  // E) "CLIENT — detail" (notif site, pas de verbe)
  {
    const m = msg.match(/^(.+?) — (.+)$/);
    if (m) return <><strong>{m[1]}</strong>{' — '}{m[2]}</>;
  }
  return <>{msg}</>;
}

/* ── Toast individuel ── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 7000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-2xl shadow-2xl border px-5 py-4 cursor-pointer"
      style={{ background: '#fff', borderColor: '#E2E8F0', minWidth: 360, maxWidth: 440 }}
      onClick={() => onDismiss(toast.id)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#0F172A] leading-snug">{toast.title}</p>
        <p className="text-[13px] text-[#374151] mt-1 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="text-[#ABBED1] hover:text-[#64748B] text-[20px] leading-none flex-shrink-0 mt-0.5"
      >×</button>
    </div>
  );
}

function IconBell() {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke="#717171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Carte notification ── */
function NotifCard({ n, onRead }: { n: Notif; onRead: (id: string) => void }) {
  const cat = getCategory(n);
  const cfg = CAT_CONFIG[cat];
  return (
    <div
      className="mx-3 my-2 px-4 py-3.5 rounded-xl border cursor-pointer transition-all"
      style={{
        borderColor:     n.read ? '#E2E8F0' : '#93C5FD',
        backgroundColor: n.read ? '#ffffff'  : '#EFF6FF',
      }}
      onClick={() => !n.read && onRead(n.id)}
    >
      {/* Titre + point non-lu */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[12px] font-bold text-[#0F172A] leading-snug truncate flex-1">{n.title}</p>
        {!n.read && <span className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />}
      </div>

      {/* Message avec gras */}
      <p className="text-[12px] text-[#475569] leading-snug">
        {renderMsg(n.message)}
      </p>

      {/* Badge action + horodatage */}
      <div className="flex items-center gap-2 mt-2">
        <span
          className="text-[9px] font-bold tracking-wider px-1.5 py-px rounded"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
        <span className="text-[11px] text-[#ABBED1]">{relativeTime(n.createdAt)}</span>
      </div>
    </div>
  );
}

export function TopBar() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [open, setOpen]       = useState(false);
  const [toasts, setToasts]   = useState<Toast[]>([]);
  const notifIds = useRef(new Set<string>());

  const { subscribe } = useSSEContext();
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
      notifIds.current.add(notif.id);
      const mapped = mapDbNotif({ ...notif, read: false });
      setNotifs((prev) => [mapped, ...prev]);
      setToasts((prev) => [...prev, {
        id: notif.id,
        type: notif.type as NotifType,
        title: notif.title,
        message: notif.message,
      }]);
    });
  }, [subscribe]);

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
      {/* ── Toasts (haut droite, sous le bouton cloche) ── */}
      <div className="fixed top-20 right-5 z-[200] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* ── Bouton cloche flottant ── */}
      <div className="fixed top-4 right-5 z-[100]">
        <button
          onClick={() => { setOpen((v) => !v); if (!open) fetchNotifs(); }}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors shadow-md"
        >
          <IconBell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#EF4444] border-2 border-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-white leading-none px-0.5">
                {unread > 99 ? '99+' : unread}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* ── Backdrop ── */}
      {open && (
        <div className="fixed inset-0 z-[90] bg-black/10" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className="fixed top-0 right-0 h-full z-[100] flex flex-col bg-white border-l border-[#E4EBF5] shadow-2xl"
        style={{
          width: 360,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[17px] font-bold text-[#0F172A]">Notifications</span>
            {unread > 0 && (
              <span className="min-w-[22px] h-[22px] rounded-full bg-[#EF4444] flex items-center justify-center">
                <span className="text-[11px] font-bold text-white leading-none px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-[12px] font-semibold text-[#4CAF4F] hover:text-[#388E3C] transition-colors"
              >
                Tout marquer lu
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#F2F4F7] transition-colors text-[#ABBED1] hover:text-[#374151]"
            >
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Liste chronologique (pas de groupes) */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
        >
          {notifs.length === 0 ? (
            <p className="text-center text-[13px] text-[#ABBED1] py-16">Aucune notification</p>
          ) : (
            notifs.map((n) => <NotifCard key={n.id} n={n} onRead={markRead} />)
          )}
        </div>

        {/* Footer */}
        {notifs.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F2F4F7] text-center flex-shrink-0">
            <p className="text-[11px] text-[#ABBED1]">
              {notifs.length} notification{notifs.length > 1 ? 's' : ''} au total
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
