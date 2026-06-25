'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';

export function Navbar() {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white shadow-[0_2px_20px_rgba(171,190,209,0.35)] sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 h-[90px] flex items-center justify-between gap-8">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center shrink-0">
          <img src="/Logo PSI-new.jpeg" alt="PSI" className="h-16 w-auto object-contain" />
        </Link>

        {/* ── Desktop nav ── */}
        <div className="hidden md:flex items-center gap-10 flex-1 justify-end">
          <div className="flex items-center gap-8">
            {[
              { label: 'Accueil', href: '/#' },
              { label: 'Produits', href: '/#products' },
              { label: 'À propos', href: '/#about' },
              { label: 'Contact', href: '/#contact' },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[15px] font-medium text-[#4D4D4D] hover:text-[#4CAF4F] transition-colors relative group"
              >
                {l.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#4CAF4F] group-hover:w-full transition-all duration-200" />
              </Link>
            ))}
          </div>

          {/* Panier */}
          <Link href="/cart" className="relative p-2 hover:bg-[#F5F7FA] rounded-lg transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#4D4D4D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="#4D4D4D" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 10a4 4 0 01-8 0" stroke="#4D4D4D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#4CAF4F] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>

          {/* CTA */}
          <Link
            href="/quote"
            className="bg-[#4CAF4F] text-white text-[15px] font-semibold px-7 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#43A047] shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:shadow-[0_6px_20px_rgba(76,175,79,0.5)] transition-all"
          >
            Commander
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
          <button onClick={() => setOpen(!open)} className="p-2 hover:bg-[#F5F7FA] rounded-lg transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              {open
                ? <path d="M18 6L6 18M6 6l12 12" stroke="#263238" strokeWidth="2" strokeLinecap="round"/>
                : <path d="M4 6h16M4 12h16M4 18h16" stroke="#263238" strokeWidth="2" strokeLinecap="round"/>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {open && (
        <div className="md:hidden bg-white border-t border-[#F0F4F8] px-6 py-6 flex flex-col gap-5 shadow-lg">
          {[
            { label: 'Accueil', href: '/#' },
            { label: 'Produits', href: '/#products' },
            { label: 'À propos', href: '/#about' },
            { label: 'Contact', href: '/#contact' },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[17px] font-medium text-[#4D4D4D] hover:text-[#4CAF4F] transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/quote"
            onClick={() => setOpen(false)}
            className="mt-2 w-full bg-[#4CAF4F] text-white text-[16px] font-semibold px-6 py-3.5 rounded-xl text-center shadow-[0_4px_14px_rgba(76,175,79,0.4)]"
          >
            Commander →
          </Link>
        </div>
      )}
    </nav>
  );
}
