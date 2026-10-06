'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { CartDropdown } from './CartDropdown';
import { ArrowButton } from './ArrowButton';

const NAV_LINKS = [
  { key: 'nav.home',         href: '/',        sectionId: 'hero' },
  { key: 'nav.products',     href: '/products', sectionId: 'products' },
  { key: 'nav.quote',        href: '/quote',    sectionId: 'devis', center: true },
  { key: 'nav.presentation', href: '/',        sectionId: 'about' },
  { key: 'nav.contact',      href: '/contact',  sectionId: 'site-footer' },
];

export function Navbar() {
  const { t, lang, setLang } = useTranslation();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Accueil: header transparent par-dessus le hero plein écran, il devient blanc dès qu'on défile.
  const transparent = isHome && !scrolled;
  // Au défilement: seuls les liens suivent, dans une pilule blanche flottante à droite; le logo reste en haut de page.
  const pill = scrolled || !isHome;

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
    <nav
      ref={navRef}
      className={`${isHome ? 'absolute inset-x-0' : 'relative'} top-0 z-50 h-[65px] md:h-[90px]`}
    >
      {/* ── Logo (défile avec la page) ── */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-full flex items-center">
        <Link href="/" className="flex items-center shrink-0">
          <img src="/logo-psi-transparent.png" alt="PSI" className="h-10 md:h-14 w-auto object-contain" />
        </Link>
      </div>

      {/* ── Liens: fixes, deviennent une pilule au défilement ── */}
      <div className={`fixed z-50 top-[4.5px] md:top-[11px] end-3 md:end-[max(2rem,calc((100vw-1440px)/2))] flex items-center gap-2 h-[56px] md:h-[68px] rounded-full transition-all duration-300 ${pill ? 'bg-white shadow-[0_8px_30px_rgba(38,50,56,0.18)] ps-4 pe-2 md:ps-8 md:pe-3' : 'bg-transparent shadow-none px-0 md:pe-0'}`}>

        {/* ── Desktop nav ── */}
        <div className="hidden md:flex items-center gap-6 justify-end">
          <div className="flex items-center gap-8">
            {NAV_LINKS.map((l) => {
              const active = isActive(l);
              return (
                <button
                  key={l.key}
                  onClick={() => handleNavClick(l)}
                  className={`text-[15px] font-medium transition-all duration-300 active:scale-95 relative group ${active ? (transparent ? 'text-white' : 'text-[#4CAF4F]') : (transparent ? 'text-white/85 hover:text-white' : 'text-[#4D4D4D] hover:text-[#4CAF4F]')}`}
                >
                  {t(l.key)}
                  <span className={`absolute -bottom-0.5 left-0 h-0.5 ${transparent ? 'bg-white' : 'bg-[#4CAF4F]'} transition-all duration-200 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </button>
              );
            })}
          </div>

          {/* Panier */}
          <CartDropdown variant="desktop" light={transparent} />

          {/* CTA */}
          <ArrowButton href="/products" variant="dark-white" className="shrink-0">{t('hero.cta_catalog')}</ArrowButton>
        </div>

        {/* ── Mobile icons ── */}
        <div className="flex md:hidden items-center gap-2">
          <CartDropdown variant="mobile" light={transparent} />
          <button onClick={() => setOpen(!open)} className={`p-3 rounded-lg transition-colors ${transparent ? 'hover:bg-white/15' : 'hover:bg-[#F5F7FA]'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              {open
                ? <path d="M18 6L6 18M6 6l12 12" stroke={transparent ? '#FFFFFF' : '#263238'} strokeWidth="2" strokeLinecap="round"/>
                : <path d="M4 6h16M4 12h16M4 18h16" stroke={transparent ? '#FFFFFF' : '#263238'} strokeWidth="2" strokeLinecap="round"/>
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
        <div className="md:hidden fixed top-[72px] inset-x-3 rounded-3xl border border-white/25 bg-[#263238]/55 backdrop-blur-xl px-6 py-6 flex flex-col gap-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          {NAV_LINKS.map((l) => (
            <button
              key={l.key}
              onClick={() => handleNavClick(l, true)}
              className={`text-start text-[17px] font-medium transition-colors ${isActive(l) ? 'text-[#7CD97F]' : 'text-white/90 hover:text-white'}`}
            >
              {t(l.key)}
            </button>
          ))}
          <Link href="/quote" onClick={() => setOpen(false)} className="mt-2 w-full bg-[#4CAF4F] text-white text-[16px] font-semibold px-6 py-3.5 rounded-full text-center active:scale-[0.98] transition-transform">
            {t('hero.cta_quote')} →
          </Link>
        </div>
      )}
    </nav>
  );
}
