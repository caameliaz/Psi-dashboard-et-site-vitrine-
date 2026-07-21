'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSSEContext } from '@/lib/sse-context';
import { AdminSelect } from '@/components/ui/AdminSelect';
import { notifBell } from '@/lib/notif-bell-store';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_AUTRE' | 'ACTION_PERSO' | 'ANNULATION';
type Category  = 'COMMANDE' | 'DEVIS' | 'CLIENT' | 'UTILISATEUR' | 'ACTION';

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
function notifTarget(n: Notif): string | null {
  if (n.orderId) return `/admin/requests?open=${n.orderId}`;
  if (n.quoteId) return `/admin/requests?open=${n.quoteId}`;
  if (n.clientId) return `/admin/clients?open=${n.clientId}`;
  if (n.link) return n.link;
  return null;
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
  if (n.type === 'SITE_COMMANDE') return 'COMMANDE';
  if (n.type === 'SITE_DEVIS')    return 'DEVIS';
  const text = (n.title + ' ' + n.message).toLowerCase();
  if (text.includes('utilisateur') || text.includes('compte')) return 'UTILISATEUR';
  if (text.includes('client'))  return 'CLIENT';
  return 'ACTION';
}

const CAT_CONFIG: Record<Category, { label: string; bg: string; color: string; border: string }> = {
  COMMANDE:    { label: 'COMMANDE',    bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  DEVIS:       { label: 'DEVIS',       bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  CLIENT:      { label: 'CLIENT',      bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  UTILISATEUR: { label: 'UTILISATEUR', bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF' },
  ACTION:      { label: 'ACTION',      bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
};

function mapDbNotif(n: any): Notif {
  return {
    id: n.id,
    type: (n.type ?? 'ACTION_AUTRE') as NotifType,
    title: n.title ?? '—',
    message: n.message ?? '',
    createdAt: n.createdAt,
    read: n.read ?? false,
    orderId: n.orderId ?? null,
    quoteId: n.quoteId ?? null,
    clientId: n.clientId ?? null,
    link: n.link ?? null,
  };
}

/**
 * Retourne le message formaté avec l'employé et l'entité en gras.
 *  A) "ACTEUR — TYPE de CLIENT → STATUT"
 *  B) "ACTEUR a VERB TYPE : ENTITE"
 *  C) "ACTEUR a VERB ... pour ENTITE (REF)"
 *  D) "ACTEUR a VERB ... de ENTITE (suffix)"
 *  E) "ACTOR a VERB ..." (fallback — "X a lancé une commande (REF)")
 *  F) "CLIENT — detail"
 */
function renderMsg(msg: string): React.ReactNode {
  // A)
  { const m = msg.match(/^(.+?) — (.+? de )(.+?)( →.+)?$/);
    if (m) return <><strong>{m[1]}</strong>{` — ${m[2]}`}<strong>{m[3]}</strong>{m[4] ?? ''}</>; }
  // B)
  { const m = msg.match(/^(.+?) (a .+? : )(.+)$/);
    if (m) return <><strong>{m[1]}</strong>{` ${m[2]}`}<strong>{m[3]}</strong></>; }
  // C)
  { const m = msg.match(/^(.+?) (a .+? pour )(.+?)( \([^)]+\).*)?$/);
    if (m) return <><strong>{m[1]}</strong>{` ${m[2]}`}<strong>{m[3]}</strong>{m[4] ?? ''}</>; }
  // D)
  { const m = msg.match(/^(.+?) (a .+? de )(.+?)( \([^)]+\).*| en .+)?$/);
    if (m) return <><strong>{m[1]}</strong>{` ${m[2]}`}<strong>{m[3]}</strong>{m[4] ?? ''}</>; }
  // E) fallback "ACTOR a VERB ..."
  { const m = msg.match(/^(.+?) (a .+)$/);
    if (m) return <><strong>{m[1]}</strong>{` ${m[2]}`}</>; }
  // F)
  { const m = msg.match(/^(.+?) — (.+)$/);
    if (m) return <><strong>{m[1]}</strong>{' — '}{m[2]}</>; }
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

function extractActor(msg: string): string | null {
  const m = msg.match(/^(.+?) a /);
  return m ? m[1] : null;
}

/* ── Carte notification ── */
function NotifCard({ n, onRead, onOpen }: { n: Notif; onRead: (id: string) => void; onOpen: (n: Notif) => void }) {
  const cat = getCategory(n);
  const cfg = CAT_CONFIG[cat];
  return (
    <div
      className="mx-3 my-2 px-4 py-3.5 rounded-xl border cursor-pointer transition-all"
      style={{
        borderColor:     n.read ? '#E2E8F0' : '#93C5FD',
        backgroundColor: '#ffffff',
      }}
      onClick={() => { if (!n.read) onRead(n.id); onOpen(n); }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[12px] font-bold text-[#0F172A] leading-snug truncate flex-1">{n.title}</p>
      </div>

      <p className="text-[12px] text-[#475569] leading-snug">
        {renderMsg(n.message)}
      </p>

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
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [notifs, setNotifs]         = useState<Notif[]>([]);
  const [open, setOpen]             = useState(false);
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const notifIds = useRef(new Set<string>());

  const { subscribe } = useSSEContext();
  const router = useRouter();
  const unread = notifs.filter((n) => !n.read).length;

  // Clic sur une notif → navigue vers sa cible (commande/devis/fiche client/dashboard) + ferme le panneau
  const openNotif = (n: Notif) => {
    const target = notifTarget(n);
    if (target) { setOpen(false); router.push(target); }
  };

  const actors = useMemo(() => {
    const set = new Set<string>();
    notifs
      .filter((n) => n.type !== 'SITE_COMMANDE' && n.type !== 'SITE_DEVIS')
      .forEach((n) => { const a = extractActor(n.message); if (a) set.add(a); });
    return [...set].sort();
  }, [notifs]);

  const typeOptions = useMemo(() => {
    const base = [
      { value: 'all',      label: 'Tous les types' },
      { value: 'COMMANDE', label: 'Commandes' },
      { value: 'DEVIS',    label: 'Devis' },
    ];
    if (isAdmin) {
      base.push({ value: 'CLIENT',      label: 'Clients' });
      base.push({ value: 'UTILISATEUR', label: 'Utilisateurs' });
    }
    return base;
  }, [isAdmin]);

  const userOptions = useMemo(() => [
    { value: 'all', label: 'Utilisateurs' },
    ...actors.map((a) => ({ value: a, label: a })),
  ], [actors]);

  // Ne garder que les notifs des 2 derniers jours
  const filtered = useMemo(() => {
    const limite = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return notifs.filter((n) => {
      if (new Date(n.createdAt).getTime() < limite) return false;
      if (filterType !== 'all' && getCategory(n) !== filterType) return false;
      if (filterUser !== 'all') {
        const actor = extractActor(n.message);
        if (actor !== filterUser) return false;
      }
      return true;
    });
  }, [notifs, filterType, filterUser]);

  // Rafraîchit les notifs. Si showToast=true, affiche un toast pour chaque NOUVELLE notif.
  // firstLoad=true : premier chargement → on enregistre les ids sans toaster (évite un flood au démarrage).
  const refreshNotifs = useCallback(async (showToast: boolean, firstLoad = false) => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Notif[] = data.map(mapDbNotif);
      if (firstLoad) {
        mapped.forEach((n) => notifIds.current.add(n.id));
      } else if (showToast) {
        mapped
          .filter((n) => !notifIds.current.has(n.id))
          .forEach((n) => {
            notifIds.current.add(n.id);
            setToasts((prev) => [...prev, { id: n.id, type: n.type, title: n.title, message: n.message }]);
          });
      } else {
        mapped.forEach((n) => notifIds.current.add(n.id));
      }
      setNotifs(mapped);
    } catch { /* silently ignore */ }
  }, []);

  const fetchNotifs = useCallback(() => refreshNotifs(false), [refreshNotifs]);

  // Temps réel instantané via SSE (quand il fonctionne)
  useEffect(() => {
    return subscribe(async (payload) => {
      // Toast simple pour l'acteur lui-même : jamais persisté, pas de refetch.
      if (payload.event === 'self-toast') {
        const n = payload.notif;
        if (n) setToasts((prev) => [...prev, { id: n.id, type: n.type as NotifType, title: n.title, message: n.message }]);
        return;
      }
      refreshNotifs(true); // fetch + toast des nouvelles
    });
  }, [subscribe, refreshNotifs]);

  // Premier chargement (sans toaster l'existant)
  useEffect(() => { refreshNotifs(false, true); }, [refreshNotifs]);

  // Filet de sécurité : polling toutes les 15s → garantit la réception des notifs
  // (ex: nouvelle commande/devis depuis le SITE) même si le SSE ne pousse pas (prod serverless).
  useEffect(() => {
    const id = setInterval(() => refreshNotifs(true), 15000);
    return () => clearInterval(id);
  }, [refreshNotifs]);

  // Exposer le count et le toggle au store (pour Sidebar)
  useEffect(() => { notifBell.setCount(unread); }, [unread]);
  useEffect(() => { notifBell.setOpen(() => { setOpen(true); fetchNotifs(); }); }, [fetchNotifs]);

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
      {/* ── Toasts ── */}
      <div className="fixed top-20 right-5 z-[200] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* ── Backdrop ── */}
      {open && (
        <div className="fixed inset-0 z-[90] bg-black/10" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── (plein écran sur mobile, drawer 420px sur desktop) */}
      <aside
        className="fixed top-0 right-0 h-full z-[100] flex flex-col bg-white border-l border-[#E4EBF5] shadow-2xl w-full md:w-[420px]"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#0F172A]">Notifications</span>
            {unread > 0 && (
              <span className="text-[15px] font-bold text-[#3B82F6] leading-none">{unread > 99 ? '99+' : unread}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAll}
                title="Tout marquer lu"
                className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-[#F0FDF4] transition-colors text-[#4CAF4F] hover:text-[#388E3C]"
              >
                <svg width={16} height={16} fill="none" viewBox="0 0 24 24">
                  <path d="M2 12.5L7.5 18L18 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 12.5L13.5 18L24 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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

        {/* Filtres */}
        <div className="flex gap-2 px-4 py-3 border-b border-[#F2F4F7] flex-shrink-0">
          <AdminSelect
            value={filterType}
            onChange={setFilterType}
            options={typeOptions}
            className="flex-1"
          />
          <AdminSelect
            value={filterUser}
            onChange={setFilterUser}
            options={userOptions}
            className="flex-1"
          />
        </div>

        {/* Liste */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
        >
          {filtered.length === 0 ? (
            <p className="text-center text-[13px] text-[#ABBED1] py-16">Aucune notification</p>
          ) : (
            filtered.map((n) => <NotifCard key={n.id} n={n} onRead={markRead} onOpen={openNotif} />)
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
