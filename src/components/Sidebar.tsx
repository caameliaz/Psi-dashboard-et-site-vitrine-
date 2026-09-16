'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/role-context';
import type { PermKey } from '@/lib/permissions';
import { useSession, signOut } from 'next-auth/react';

function IconHome({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><path d="M0.75 9.44C0.75 8.21 1.31 7.06 2.27 6.3L7.77 1.96C9.22 0.81 11.28 0.81 12.73 1.96L18.23 6.3C19.19 7.06 19.75 8.21 19.75 9.44V16C19.75 18.21 17.96 20 15.75 20H14.25C13.7 20 13.25 19.55 13.25 19V16C13.25 14.9 12.35 14 11.25 14H9.25C8.15 14 7.25 14.9 7.25 16V19C7.25 19.55 6.8 20 6.25 20H4.75C2.54 20 0.75 18.21 0.75 16V9.44Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg>
  );
}
function IconDocument({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><rect x="2.75" y="0.75" width="14" height="18" rx="3.5" stroke={color} strokeWidth="1.5"/><path d="M6 5.5H13.5M6 9.5H13.5M6 13.5H10" stroke={color} strokeLinecap="round" strokeWidth="1.5"/></svg>
  );
}
function IconLayers({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><path d="M1.5 6.5L9 2L16.5 6.5L9 11L1.5 6.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M1.5 11L9 15.5L16.5 11M1.5 8.75L9 13.25L16.5 8.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
}
function IconUsers({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><circle cx="7" cy="5.5" r="3.25" stroke={color} strokeWidth="1.5"/><path d="M0.75 15.5C0.75 12.6 3.52 10.25 7 10.25C10.48 10.25 13.25 12.6 13.25 15.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/><circle cx="14.5" cy="5" r="2.75" stroke={color} strokeWidth="1.5"/><path d="M16.75 13.5C17.7 14.1 18.25 14.97 18.25 16" stroke={color} strokeLinecap="round" strokeWidth="1.5"/></svg>
  );
}
function IconEdit({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><path d="M14.5 1.5L16.5 3.5L10 10L7.5 10.5L8 8L14.5 1.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M0.75 17.25H17.25" stroke={color} strokeLinecap="round" strokeWidth="1.5"/><path d="M12.75 2.75L15.25 5.25" stroke={color} strokeLinecap="round" strokeWidth="1.5"/></svg>
  );
}
function IconUserPlus({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><circle cx="7" cy="5.5" r="3.25" stroke={color} strokeWidth="1.5"/><path d="M0.75 15.5C0.75 12.6 3.52 10.25 7 10.25C10.48 10.25 13.25 12.6 13.25 15.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/><path d="M15.5 9V15M12.5 12H18.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/></svg>
  );
}
function IconChat({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" viewBox="0 0 20 20"><path d="M2 4.5A1.5 1.5 0 013.5 3h13A1.5 1.5 0 0118 4.5v8a1.5 1.5 0 01-1.5 1.5H7l-4 3.5V14H3.5A1.5 1.5 0 012 12.5v-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 7.5h8M6 10.5h5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>
  );
}
function IconHistory({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><circle cx="9" cy="9" r="7.25" stroke={color} strokeWidth="1.5"/><path d="M9 5.5V9.5L11.5 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3L1 1M3 9H1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>
  );
}
function IconLogout({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><path d="M11.5 13V15C11.5 16.66 10.16 18 8.5 18H4.5C2.84 18 1.5 16.66 1.5 15V5C1.5 3.34 2.84 2 4.5 2H8.5C10.16 2 11.5 3.34 11.5 5V7" stroke={color} strokeLinecap="round" strokeWidth="1.5"/><path d="M14.5 12.5L16.79 10.21C17.18 9.82 17.18 9.18 16.79 8.79L14.5 6.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/><path d="M16.5 10H6.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/></svg>
  );
}
function IconBox({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><path d="M9 1.5L16.5 5.5V12.5L9 16.5L1.5 12.5V5.5L9 1.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M1.5 5.5L9 9.5L16.5 5.5M9 9.5V16.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg>
  );
}
function IconSettings({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><path d="M9 11.5A2.5 2.5 0 109 6.5a2.5 2.5 0 000 5Z" stroke={color} strokeWidth="1.5"/><path d="M14.9 11.15c-.14.32-.18.68-.1 1.02l.04.16c.16.68-.06 1.4-.58 1.87l-.4.36c-.52.47-1.26.6-1.9.34l-.15-.06a1.66 1.66 0 00-1.02-.03 1.66 1.66 0 00-.75.66l-.09.14c-.38.6-1.06.94-1.77.88l-.54-.04a1.86 1.86 0 01-1.6-1.18l-.06-.16a1.66 1.66 0 00-.66-.79 1.66 1.66 0 00-1.02-.16l-.16.03c-.7.11-1.4-.19-1.79-.78l-.3-.45a1.86 1.86 0 01-.05-1.92l.08-.15c.17-.3.23-.66.16-1a1.66 1.66 0 00-.5-.9l-.12-.11a1.86 1.86 0 01-.5-1.85l.13-.52c.17-.68.71-1.2 1.4-1.35l.16-.03c.34-.08.64-.28.85-.56.2-.28.3-.63.27-.98l-.02-.16a1.86 1.86 0 01.85-1.75l.46-.3c.6-.38 1.36-.4 1.98-.05l.14.08c.3.17.66.23 1 .16.34-.07.64-.26.85-.53l.1-.13c.44-.55 1.14-.82 1.83-.7l.53.09c.69.12 1.25.62 1.46 1.29l.05.16c.11.33.34.6.64.77.3.16.65.21.98.14l.16-.03c.69-.15 1.4.1 1.85.64l.34.42c.44.54.55 1.28.28 1.93l-.06.15c-.13.32-.14.68-.02 1.01.11.33.34.6.64.77Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/></svg>
  );
}
function IconFlask({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none"><path d="M7 1.5H11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M7.75 1.5V6.5L2.9 14.3C2.35 15.2 3 16.5 4.05 16.5H13.95C15 16.5 15.65 15.2 15.1 14.3L10.25 6.5V1.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M4.5 11.5H13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>
  );
}
function IconChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M15 18l-6-6 6-6" stroke="#ABBED1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const navItems: { href: string; label: string; Icon: typeof IconHome; perm: PermKey | PermKey[] | null }[] = [
  { href: '/admin/dashboard', label: 'Dashboard',    Icon: IconHome,     perm: null },
  { href: '/admin/requests',  label: 'Commandes',    Icon: IconDocument, perm: 'voir_commandes' },
  { href: '/admin/products',  label: 'Produits',     Icon: IconLayers,   perm: 'voir_produits' },
  { href: '/admin/stock',     label: 'Stock',        Icon: IconBox,      perm: 'voir_stock' },
  { href: '/admin/recipes',   label: 'Recettes',     Icon: IconFlask,    perm: 'voir_stock' },
  { href: '/admin/clients',   label: 'Clients',      Icon: IconUsers,    perm: 'voir_clients' },
  { href: '/admin/settings',  label: 'Réglages',     Icon: IconSettings, perm: ['voir_historique', 'modifier_contenu', 'gerer_utilisateurs'] },
];

export function Sidebar({ mobileOpen = false, onCloseMobile }: { mobileOpen?: boolean; onCloseMobile?: () => void } = {}) {
  const pathname = usePathname();
  const { role, can, loading } = useRole();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const userName  = session?.user?.name ?? '—';
  const userRole  = role === 'ADMIN' ? 'Admin' : 'Employé';
  const userInitials = userName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Overlay sombre sur mobile quand le drawer est ouvert */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={onCloseMobile} />
      )}

      <aside
        className={`flex flex-col h-screen bg-white border-r border-[#E4EBF5] transition-all duration-200
          md:relative md:sticky md:top-0 md:translate-x-0
          fixed top-0 left-0 z-50 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:!translate-x-0`}
        style={{ width: collapsed ? 64 : 220, minWidth: collapsed ? 64 : 220 }}
      >
      {/* Bouton collapse — rond flottant, desktop uniquement */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-3 z-20 w-6 h-6 items-center justify-center rounded-full border border-[#E4EBF5] bg-white hover:bg-[#F2F4F7] shadow-md transition-colors"
        title={collapsed ? 'Ouvrir' : 'Fermer'}
      >
        <IconChevron collapsed={collapsed} />
      </button>

      {/* Logo */}
      {collapsed ? (
        <div className="flex flex-col items-center py-4 border-b border-[#E4EBF5]">
          <Image src="/Logo PSI-new.jpeg" alt="PSI Logo" width={32} height={32} className="w-8 h-8 object-contain rounded-full"/>
        </div>
      ) : (
        <div className="flex items-center px-4 py-5 border-b border-[#E4EBF5]" style={{ minHeight: 80 }}>
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/Logo PSI-new.jpeg" alt="PSI Logo" width={36} height={36} className="w-9 h-9 object-contain rounded-full flex-shrink-0"/>
            <div className="leading-tight min-w-0">
              <p className="text-[13px] font-bold text-[#0F172A]">Paper Solutions</p>
              <p className="text-[13px] font-bold text-[#0F172A]">Industry</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {/* Tant que la session charge, on affiche des placeholders neutres au lieu
            de montrer TOUS les liens puis de les filtrer (= flash disgracieux). */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-[18px] h-[18px] rounded bg-[#EEF2F7] animate-pulse flex-shrink-0" />
              {!collapsed && <div className="h-3 w-24 rounded bg-[#EEF2F7] animate-pulse" />}
            </div>
          ))
        ) : (
        navItems.filter(({ perm }) => perm === null || (Array.isArray(perm) ? perm.some((p) => can(p)) : can(perm))).map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              onClick={onCloseMobile}
              className="relative flex items-center gap-3 px-4 py-3 transition-colors"
              style={{ background: isActive ? '#F0FDF4' : 'transparent', justifyContent: collapsed ? 'center' : undefined }}
            >
              <Icon color={isActive ? '#101828' : '#717171'} />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap" style={{ color: isActive ? '#101828' : '#8A9BB5' }}>
                  {label}
                </span>
              )}
              {isActive && (
                <span className="absolute right-0 top-1 bottom-1 w-1 rounded-l-full" style={{ background: '#4CAF4F' }}/>
              )}
            </Link>
          );
        })
        )}
      </nav>

      {/* User + Logout */}
      {!collapsed && (
        <div className="border-t border-[#E4EBF5] px-4 py-4">
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg" style={{ background: role === 'ADMIN' ? '#F0FDF4' : '#EFF6FF' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: role === 'ADMIN' ? '#4CAF4F' : '#3B82F6' }} />
            <span className="text-[11px] font-bold" style={{ color: role === 'ADMIN' ? '#166534' : '#1E40AF' }}>{userRole}</span>
          </div>
          <Link href="/admin/profile" className="flex items-center gap-3 mb-3 rounded-lg p-2 -mx-2 hover:bg-[#F5F8FC] transition-colors">
            <div className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold text-[#166634] flex-shrink-0" style={{ background: '#D1FAE5' }}>{userInitials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#101828] truncate">{userName}</p>
              <p className="text-xs text-[#8A9BB5]">{userRole}</p>
            </div>
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[#8A9BB5] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-colors">
            <IconLogout color="currentColor"/>
            <span>Déconnexion</span>
          </button>
        </div>
      )}
      {collapsed && (
        <div className="border-t border-[#E4EBF5] py-4 flex flex-col items-center gap-3">
          <Link href="/admin/profile" title="Profil">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-[#166634]" style={{ background: '#D1FAE5' }}>{userInitials}</div>
          </Link>
        </div>
      )}
      </aside>
    </>
  );
}
