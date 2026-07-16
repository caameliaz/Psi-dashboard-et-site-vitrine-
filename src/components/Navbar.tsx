'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/store/cartStore';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

const NAV_LINKS = [
  { key: 'nav.home',         href: '/',        sectionId: 'hero' },
  { key: 'nav.products',     href: '/products', sectionId: 'products' },
  { key: 'nav.quote',        href: '/quote',    sectionId: 'devis', center: true },
  { key: 'nav.presentation', href: '/',        sectionId: 'about' },
  { key: 'nav.contact',      href: '/contact',  sectionId: 'site-footer' },
];

export function Navbar() {
  const { t, lang, setLang } = useTranslation();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const isHome = pathname === '/';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
    const start = window.scrollY;
    if (start === 0) return;
    const duration = 400;
    let startTime: number | null = null;
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      window.scrollTo(0, start * (1 - ease(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [pathname]);

  useEffect(() => {
    if (!isHome) { setActiveSection(null); return; }

    const sections = ['hero', 'products', 'devis', 'about', 'site-footer'];
    const visible = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.intersectionRatio));
        let topId: string | null = null;
        let topRatio = 0;
        visible.forEach((ratio, id) => { if (ratio > topRatio) { topRatio = ratio; topId = id; } });
        if (topId) setActiveSection(topId);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [isHome]);

  const scrollTo = (sectionId: string, center = false) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const navHeight = navRef.current?.offsetHeight ?? 0;
    const rect = el.getBoundingClientRect();
    const top = center
      ? rect.top + window.scrollY - (window.innerHeight - rect.height) / 2
      : rect.top + window.scrollY - navHeight;
    const start = window.scrollY;
    const dist = top - start;
    const duration = 600;
    let startTime: number | null = null;
    const ease = (tv: number) => tv < 0.5 ? 2 * tv * tv : -1 + (4 - 2 * tv) * tv;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start + dist * ease(progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const handleNavClick = (l: typeof NAV_LINKS[0], closeMenu = false) => {
    if (closeMenu) setOpen(false);
    if (isHome && l.sectionId) {
      scrollTo(l.sectionId, 'center' in l && l.center);
    } else if (!isHome && l.sectionId) {
      router.push('/');
      setTimeout(() => scrollTo(l.sectionId!, 'center' in l && l.center), 400);
    } else {
      router.push(l.href);
    }
  };

  const isActive = (l: typeof NAV_LINKS[0]) => {
    if (isHome) {
      if (l.sectionId === 'hero') return activeSection === 'hero' || activeSection === null;
      return activeSection === l.sectionId;
    }
    return l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
  };

  return (
    <nav ref={navRef} className="bg-white shadow-[0_2px_20px_rgba(171,190,209,0.35)] sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 h-[65px] md:h-[90px] flex items-center justify-between gap-8">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center shrink-0">
          <img src="/Logo PSI-new.jpeg" alt="PSI" className="h-10 md:h-16 w-auto object-contain" style={{ maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 55%, transparent 100%)' }} />
        </Link>

        {/* ── Desktop nav ── */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
          <div className="flex items-center gap-8">
            {NAV_LINKS.map((l) => {
              const active = isActive(l);
              return (
                <button
                  key={l.key}
                  onClick={() => handleNavClick(l)}
                  className={`text-[15px] font-medium transition-colors relative group ${active ? 'text-[#4CAF4F]' : 'text-[#4D4D4D] hover:text-[#4CAF4F]'}`}
                >
                  {t(l.key)}
                  <span className={`absolute -bottom-0.5 left-0 h-0.5 bg-[#4CAF4F] transition-all duration-200 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </button>
              );
            })}
          </div>

          {/* Panier */}
          <Link href="/cart" className={`relative p-2 rounded-lg transition-colors ${pathname === '/cart' ? 'bg-[#F0FDF4]' : 'hover:bg-[#F5F7FA]'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={pathname === '/cart' ? '#4CAF4F' : '#4D4D4D'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke={pathname === '/cart' ? '#4CAF4F' : '#4D4D4D'} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 10a4 4 0 01-8 0" stroke={pathname === '/cart' ? '#4CAF4F' : '#4D4D4D'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#4CAF4F] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>

          {/* CTA */}
          <Link href="/quote" className="bg-[#4CAF4F] text-white text-[15px] font-semibold px-7 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#43A047] shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:shadow-[0_6px_20px_rgba(76,175,79,0.5)] transition-all shrink-0">
            {t('nav.order')}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* ── Mobile icons ── */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/cart" className="relative p-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#4D4D4D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="#4D4D4D" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 10a4 4 0 01-8 0" stroke="#4D4D4D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#4CAF4F] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
                {totalItems}
              </span>
            )}
          </Link>
          <button onClick={() => setOpen(!open)} className="p-3 hover:bg-[#F5F7FA] rounded-lg transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              {open
                ? <path d="M18 6L6 18M6 6l12 12" stroke="#263238" strokeWidth="2" strokeLinecap="round"/>
                : <path d="M4 6h16M4 12h16M4 18h16" stroke="#263238" strokeWidth="2" strokeLinecap="round"/>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── Toggle langue flottant (bas droite) ── */}
      <div
        className="fixed bottom-6 left-4 z-50 flex items-center gap-0.5 bg-white rounded-full px-1 py-1 border border-[#E2E8F0]"
        style={{ boxShadow: '0 2px 8px rgba(76,175,79,0.18)' }}
      >
        <button
          onClick={() => setLang('fr')}
          className={`px-3 py-1.5 text-[12px] font-bold rounded-full transition-all ${lang === 'fr' ? 'bg-[#4CAF4F] text-white' : 'text-[#717171] hover:text-[#263238]'}`}
        >
          FR
        </button>
        <button
          onClick={() => setLang('ar')}
          className={`px-3 py-1.5 text-[12px] font-bold rounded-full transition-all ${lang === 'ar' ? 'bg-[#4CAF4F] text-white' : 'text-[#717171] hover:text-[#263238]'}`}
        >
          AR
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {open && (
        <div className="md:hidden bg-white border-t border-[#F0F4F8] px-6 py-6 flex flex-col gap-5 shadow-lg">
          {NAV_LINKS.map((l) => (
            <button
              key={l.key}
              onClick={() => handleNavClick(l, true)}
              className={`text-left text-[17px] font-medium transition-colors ${isActive(l) ? 'text-[#4CAF4F]' : 'text-[#4D4D4D] hover:text-[#4CAF4F]'}`}
            >
              {t(l.key)}
            </button>
          ))}
          <Link href="/quote" onClick={() => setOpen(false)} className="mt-2 w-full bg-[#4CAF4F] text-white text-[16px] font-semibold px-6 py-3.5 rounded-xl text-center shadow-[0_4px_14px_rgba(76,175,79,0.4)]">
            {t('nav.order')} →
          </Link>
        </div>
      )}
    </nav>
  );
}
