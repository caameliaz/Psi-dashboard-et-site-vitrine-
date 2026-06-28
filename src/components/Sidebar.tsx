'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/role-context';

function IconHome({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.75 9.44C0.75 8.21 1.31 7.06 2.27 6.3L7.77 1.96C9.22 0.81 11.28 0.81 12.73 1.96L18.23 6.3C19.19 7.06 19.75 8.21 19.75 9.44V16C19.75 18.21 17.96 20 15.75 20H14.25C13.7 20 13.25 19.55 13.25 19V16C13.25 14.9 12.35 14 11.25 14H9.25C8.15 14 7.25 14.9 7.25 16V19C7.25 19.55 6.8 20 6.25 20H4.75C2.54 20 0.75 18.21 0.75 16V9.44Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconDocument({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.75" y="0.75" width="14" height="18" rx="3.5" stroke={color} strokeWidth="1.5" />
      <path d="M6 5.5H13.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
      <path d="M6 9.5H13.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
      <path d="M6 13.5H10" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
function IconLayers({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 6.5L9 2L16.5 6.5L9 11L1.5 6.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M1.5 11L9 15.5L16.5 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 8.75L9 13.25L16.5 8.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUsers({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="5.5" r="3.25" stroke={color} strokeWidth="1.5" />
      <path d="M0.75 15.5C0.75 12.6 3.52 10.25 7 10.25C10.48 10.25 13.25 12.6 13.25 15.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
      <circle cx="14.5" cy="5" r="2.75" stroke={color} strokeWidth="1.5" />
      <path d="M16.75 13.5C17.7 14.1 18.25 14.97 18.25 16" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
function IconEdit({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.5 1.5L16.5 3.5L10 10L7.5 10.5L8 8L14.5 1.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M0.75 17.25H17.25" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
      <path d="M12.75 2.75L15.25 5.25" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
function IconUserPlus({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="5.5" r="3.25" stroke={color} strokeWidth="1.5" />
      <path d="M0.75 15.5C0.75 12.6 3.52 10.25 7 10.25C10.48 10.25 13.25 12.6 13.25 15.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
      <path d="M15.5 9V15M12.5 12H18.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
function IconLogout({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 13V15C11.5 16.66 10.16 18 8.5 18H4.5C2.84 18 1.5 16.66 1.5 15V5C1.5 3.34 2.84 2 4.5 2H8.5C10.16 2 11.5 3.34 11.5 5V7" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
      <path d="M14.5 12.5L16.79 10.21C17.18 9.82 17.18 9.18 16.79 8.79L14.5 6.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
      <path d="M16.5 10H6.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function LogoutButton() {
  const [hovered, setHovered] = React.useState(false);
  const c = hovered ? '#EF4444' : '#8A9BB5';
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
      style={{ background: hovered ? '#FEF2F2' : 'transparent', color: c }}
    >
      <IconLogout color={c} />
      <span>Déconnexion</span>
    </button>
  );
}

function IconHistory({ color = '#717171' }) {
  return (
    <svg width={18} height={18} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7.25" stroke={color} strokeWidth="1.5"/>
      <path d="M9 5.5V9.5L11.5 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 3L1 1M3 9H1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', Icon: IconHome },
  { href: '/admin/requests', label: 'Demandes', Icon: IconDocument },
  { href: '/admin/products', label: 'Produits', Icon: IconLayers },
  { href: '/admin/clients', label: 'Clients', Icon: IconUsers },
  { href: '/admin/history', label: 'Historique', Icon: IconHistory },
  { href: '/admin/content', label: 'Contenu', Icon: IconEdit },
  { href: '/admin/users', label: 'Utilisateurs', Icon: IconUserPlus },
];

const adminOnlyItems = ['/admin/content', '/admin/users'];

export function Sidebar() {
  const pathname = usePathname();
  const { role, setRole, isAdmin } = useRole();

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 bg-white border-r border-[#E4EBF5]"
      style={{ width: 220, minWidth: 220 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E4EBF5]">
        <Image
          src="/Logo PSI-new.jpeg"
          alt="PSI Logo"
          width={36}
          height={36}
          className="w-9 h-9 object-contain rounded-full flex-shrink-0"
        />
        <div className="leading-tight">
          <p className="text-[13px] font-bold text-[#0F172A]">Paper Solutions</p>
          <p className="text-[11px] font-medium text-[#8A9BB5]">Industrielles</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.filter(({ href }) => isAdmin || !adminOnlyItems.includes(href)).map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-3 px-5 py-3 transition-colors"
              style={{ background: isActive ? '#F0FDF4' : 'transparent' }}
            >
              <Icon color={isActive ? '#101828' : '#717171'} />
              <span
                className="text-sm font-medium"
                style={{ color: isActive ? '#101828' : '#8A9BB5' }}
              >
                {label}
              </span>
              {isActive && (
                <span
                  className="absolute right-0 top-1 bottom-1 w-1 rounded-l-full"
                  style={{ background: '#4CAF4F' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-[#E4EBF5] px-5 py-4">
        {/* Switcher temporaire pour tester les roles */}
        <div className="flex gap-1 p-1 rounded-lg mb-3" style={{ background: '#F0F4F8' }}>
          {(['Admin', 'Employe'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} className="flex-1 py-1 rounded-md text-[11px] font-bold transition-all" style={{ background: role === r ? (r === 'Admin' ? '#4CAF4F' : '#3B82F6') : 'transparent', color: role === r ? 'white' : '#8A9BB5' }}>
              {r === 'Admin' ? 'Admin' : 'Employé'}
            </button>
          ))}
        </div>
        <Link href="/admin/profile" className="flex items-center gap-3 mb-4 rounded-lg p-2 -mx-2 hover:bg-[#F5F8FC] transition-colors cursor-pointer">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold text-[#166534] flex-shrink-0"
            style={{ background: '#D1FAE5' }}
          >
            YR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#101828] truncate">Yacine Rahali</p>
            <p className="text-xs text-[#8A9BB5]">Admin</p>
          </div>
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
