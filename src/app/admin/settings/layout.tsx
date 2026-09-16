'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/role-context';
import type { PermKey } from '@/lib/permissions';

const SETTINGS_NAV: { href: string; label: string; perm: PermKey }[] = [
  { href: '/admin/settings/users',   label: 'Users',         perm: 'gerer_utilisateurs' },
  { href: '/admin/settings/messages', label: 'Messages',     perm: 'modifier_contenu' },
  { href: '/admin/settings/history', label: 'Historique',    perm: 'voir_historique' },
  { href: '/admin/settings/content', label: 'Contenu du site', perm: 'modifier_contenu' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useRole();
  const items = SETTINGS_NAV.filter((i) => can(i.perm));

  return (
    <div className="flex gap-5 items-start">
      <aside className="w-[200px] flex-shrink-0 rounded-2xl border border-[#E2E8F0] bg-white p-3">
        <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest px-2 mb-2">Réglages</p>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors border ${
                  active
                    ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                    : 'text-[#374151] border-transparent hover:bg-[#F8FAFC] hover:border-[#E2E8F0]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">{children}</div>
    </div>
  );
}
