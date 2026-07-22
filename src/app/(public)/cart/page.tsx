'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';

export default function CartPage() {
  const { t } = useTranslation();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const totalPrice = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-full bg-white shadow-[0_4px_24px_rgba(171,190,209,0.35)] flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 10a4 4 0 01-8 0" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-[#263238] mb-2">{t('cart.empty_title')}</h1>
            <p className="text-[15px] text-[#717171]">{t('cart.empty_sub')}</p>
          </div>
          <Link
            href="/products"
            className="bg-[#4CAF4F] text-white text-[15px] font-semibold px-8 py-3.5 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all"
          >
            {t('cart.empty_btn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <div className="max-w-[900px] mx-auto">

        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-[#717171] text-[14px] hover:text-[#263238] transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('cart.back')}
        </Link>

        <h1 className="text-[40px] md:text-[48px] font-bold text-[#263238] mb-8">{t('cart.title')}</h1>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Liste produits */}
          <div className="flex-1 flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(171,190,209,0.25)] p-3 md:p-5 flex items-center gap-3 md:gap-5"
              >
                <div className="hidden md:flex w-14 h-14 bg-[#F5F7FA] rounded-xl items-center justify-center shrink-0">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
                    <div className="absolute inset-[18%] rounded-full bg-[#C8E6C9] border border-[#4CAF4F]" />
                    <div className="absolute inset-[35%] rounded-full bg-[#4CAF4F]" />
                    <div className="absolute inset-[48%] rounded-full bg-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] md:text-[16px] font-semibold text-[#263238] truncate">{t('common.ref')} {item.reference}</p>
                  <p className="text-[11px] md:text-[13px] text-[#89939E] mt-0.5">{item.unitPrice} DA / u.</p>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg border border-[#ABBED1] flex items-center justify-center text-[#4D4D4D] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors text-[16px] leading-none"
                  >−</button>
                  <span className="w-6 text-center text-[13px] md:text-[15px] font-semibold text-[#263238]">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg border border-[#ABBED1] flex items-center justify-center text-[#4D4D4D] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors text-[16px] leading-none"
                  >+</button>
                </div>

                <div className="text-right shrink-0 min-w-[60px] md:min-w-[80px]">
                  <p className="text-[12px] md:text-[16px] font-bold text-[#263238]">{item.unitPrice * item.quantity} DA</p>
                </div>

                <button
                  onClick={() => removeItem(item.productId)}
                  className="w-7 h-7 md:w-8 md:h-8 rounded-lg hover:bg-[#FFF0F0] flex items-center justify-center transition-colors group shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="stroke-[#ABBED1] group-hover:stroke-[#EF5350] transition-colors">
                    <path d="M18 6L6 18M6 6l12 12" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Résumé + Actions */}
          <div className="lg:w-[300px] flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#263238]">{t('cart.summary')}</h2>

              <div className="flex flex-col gap-3 text-[14px]">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-[#717171]">
                    <span>{item.quantity}× {t('common.ref')} {item.reference}</span>
                    <span className="font-medium text-[#4D4D4D]">{item.unitPrice * item.quantity} DA</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#F0F4F8] flex justify-between items-center">
                <span className="text-[16px] font-semibold text-[#263238]">{t('cart.total')}</span>
                <span className="text-[22px] font-bold text-[#4CAF4F]">{totalPrice} DA</span>
              </div>

              <Link
                href="/checkout"
                className="w-full bg-[#4CAF4F] text-white text-[15px] font-semibold py-3.5 rounded-xl text-center shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all"
              >
                {t('cart.checkout_btn')}
              </Link>

              <Link
                href="/quote"
                className="w-full border border-[#ABBED1] text-[#4D4D4D] text-[14px] font-medium py-3 rounded-xl text-center hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors"
              >
                {t('cart.quote_link')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
