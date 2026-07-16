'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';

const DISPLAY_DURATION = 4000;

export function CartSummary() {
  const { t, lang } = useTranslation();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevTotal = useRef(totalItems);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (totalItems > prevTotal.current) {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      setVisible(true);
      setProgress(0);

      const start = performance.now();
      const step = (ts: number) => {
        const elapsed = ts - start;
        setProgress(Math.min(elapsed / DISPLAY_DURATION, 1));
        if (elapsed < DISPLAY_DURATION) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);

      hideTimeout.current = setTimeout(() => setVisible(false), DISPLAY_DURATION);
    }
    prevTotal.current = totalItems;
  }, [totalItems]);

  useEffect(() => () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  if (!visible || totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-24 sm:w-auto bg-[#F5F7FA] text-[#263238] border border-[#E0E0E0] px-5 py-4 rounded-2xl shadow-[0px_8px_24px_rgba(171,190,209,0.4)] flex items-center gap-4 z-50 overflow-hidden">
      <div className="flex-1 sm:flex-none">
        <p className="text-xs text-[#717171] leading-none mb-1">
          {totalItems} {lang === 'ar' ? 'منتج' : `article${totalItems !== 1 ? 's' : ''}`}
        </p>
        <p className="text-sm font-semibold leading-none">
          {totalPrice.toFixed(2)} DA
        </p>
      </div>
      <Link
        href="/cart"
        className="bg-[#4CAF4F] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#45a049] transition-colors whitespace-nowrap min-h-[44px] flex items-center"
      >
        {t('common.view_cart')}
      </Link>

      <div className="absolute bottom-0 left-0 h-1 bg-[#4CAF4F]" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
