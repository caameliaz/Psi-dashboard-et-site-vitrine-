'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';

interface ProductPhoto {
  id: string;
  photo?: string | null;
  category?: { photo?: string | null } | null;
}

// Icône panier + badge, avec un mini-aperçu qui s'ouvre au hover
// et clic qui mène directement vers la page panier.
export function CartDropdown({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const totalItems = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const totalPrice = useCartStore((s) => s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));

  const [open, setOpen] = useState(false);
  const [photosById, setPhotosById] = useState<Record<string, string | null>>({});
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open || Object.keys(photosById).length > 0) return;
    fetch('/api/products').then(r => r.ok ? r.json() : []).then((data: ProductPhoto[]) => {
      const map: Record<string, string | null> = {};
      data.forEach((p) => { map[p.id] = p.photo ?? p.category?.photo ?? null; });
      setPhotosById(map);
    }).catch(() => {});
  }, [open, photosById]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  const handleClick = () => {
    router.push('/cart');
  };

  const iconColor = '#4D4D4D';

  return (
    <div 
      ref={ref} 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className={variant === 'desktop' ? 'relative p-2 rounded-lg transition-colors hover:bg-[#F5F7FA]' : 'relative p-2'}
        aria-label={t('cart.title')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="3" y1="6" x2="21" y2="6" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16 10a4 4 0 01-8 0" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {totalItems > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#4CAF4F] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
            {totalItems}
          </span>
        )}
      </button>

      {open && (
        // Mobile : panneau pleine largeur (320px fixes débordaient sur petits écrans).
        // Ordinateur : inchangé.
        <div 
          className="fixed md:absolute left-3 right-3 md:left-auto md:right-0 top-16 md:top-full md:mt-2 md:w-[320px] bg-white rounded-2xl border border-[#E4EBF5] shadow-[0_12px_40px_rgba(38,50,56,0.18)] z-50 overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {items.length === 0 ? (
            <div className="p-6 flex flex-col items-center gap-3 text-center">
              <p className="text-[13px] text-[#8A9BB5]">{t('cart.empty_title')}</p>
              <Link
                href="/products"
                onClick={() => setOpen(false)}
                className="text-[13px] font-semibold text-[#4CAF4F] hover:underline"
              >
                {t('cart.empty_btn')}
              </Link>
            </div>
          ) : (
            <>
              <div className="max-h-[320px] overflow-y-auto flex flex-col divide-y divide-[#F0F4F8]">
                {items.map((item) => {
                  const photo = photosById[item.productId];
                  return (
                    <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-14 h-14 rounded-lg bg-[#F5F7FA] border border-[#E0E0E0] flex items-center justify-center shrink-0 overflow-hidden">
                        {photo ? (
                          <img src={photo} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <div className="relative w-6 h-6">
                            <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border border-[#4CAF4F]" />
                            <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-[13px] font-semibold text-[#263238] truncate">{t('common.ref')} {item.reference}</p>
                        <p className="text-[11px] text-[#8A9BB5]">{item.quantity} × {item.unitPrice} DA</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label="Retirer"
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-[#ABBED1] hover:text-[#EF5350] hover:bg-[#FFF0F0] transition-colors shrink-0"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-[#F0F4F8] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#263238]">{t('cart.total')}</span>
                  <span className="text-[16px] font-bold text-[#4CAF4F]">{totalPrice} DA</span>
                </div>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="w-full bg-[#4CAF4F] text-white text-[13px] font-semibold py-2.5 rounded-xl text-center hover:bg-[#43A047] transition-all"
                >
                  {t('cart.title')}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
