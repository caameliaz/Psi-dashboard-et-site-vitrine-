'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRole } from '@/lib/role-context';

// Icônes en dur (pas de dépendance externe) — un composant par icône pour rester
// lisible dans la config NAV_ITEMS ci-dessous.
function DashboardIcon() {
  return (
    <Image src="/icons8-statistique-96.png" alt="" width={24} height={24} className="brightness-0 invert" />
  );
}
function CreateIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ClientsIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function StockIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 8v8l9 5 9-5V8M12 13v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Config des items : `perm: null` = toujours visible (Dashboard, Créer — actions de
// base indépendantes des permissions). Un item avec `perm` n'apparaît que si
// l'utilisateur a cette permission (cf. useRole().can) — un admin les a toutes,
// donc les voit toutes ; un employé ne voit que ce pour quoi il a le droit.
const NAV_ITEMS = [
  { key: 'dashboard', href: '/admin/dashboard', label: 'Dashboard', perm: null, Icon: DashboardIcon, exact: true },
  { key: 'create',    href: '/admin/quick-order', label: 'Créer',   perm: null, Icon: CreateIcon,    exact: false },
  { key: 'orders',    href: '/admin/requests',   label: 'Commandes', perm: 'voir_commandes' as const, Icon: OrdersIcon, exact: false },
  { key: 'clients',   href: '/admin/clients',    label: 'Clients',   perm: 'voir_clients' as const,   Icon: ClientsIcon, exact: false },
  // Stock : visible dès voir_stock OU voir_listes_stock (l'un ou l'autre suffit —
  // cf. StockMobilePage qui affiche ensuite seulement ce que la permission précise autorise).
  { key: 'stock',     href: '/admin/stock/mobile', label: 'Stock',   perm: 'voir_stock' as const,     Icon: StockIcon,   exact: false },
] as const;

export function MobileNavbar() {
  const pathname = usePathname();
  const { can } = useRole();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  // Stock : visible avec voir_stock OU voir_listes_stock (l'un ou l'autre suffit —
  // la vue mobile n'affiche ensuite que ce que la permission précise du user autorise).
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.perm === null || can(item.perm) || (item.key === 'stock' && can('voir_listes_stock'))
  );

  return (
    <>
      {/* Mobile Bottom Navbar — items pilotés par permission (cf. NAV_ITEMS) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-[#4CAF4F] rounded-3xl shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center justify-around px-2 py-3">
          {visibleItems.map(({ key, href, label, Icon, exact }) => (
            <Link key={key} href={href} className="flex flex-col items-center gap-1 relative">
              {isActive(href, exact) && (
                <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-b-full" />
              )}
              <Icon />
              <span className="text-[10px] font-bold text-white">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Spacer pour éviter que le contenu ne soit caché par la navbar sur mobile */}
      <div className="md:hidden h-20" />
    </>
  );
}
