'use client';

import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import { useTranslation } from '@/lib/i18n';

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)] transition-shadow flex flex-col overflow-hidden">
      {/* Image */}
      <div className="bg-[#F5F7FA] h-28 md:h-52 flex items-center justify-center overflow-hidden">
        {product.photo ? (
          <img src={product.photo} alt={`Produit ${product.reference}`} className="w-full h-full object-cover" />
        ) : (
          <div className="relative w-12 h-12 md:w-24 md:h-24">
            <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
            <div className="absolute inset-[15%] rounded-full bg-[#C8E6C9] border-[1.5px] border-[#4CAF4F]" />
            <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
            <div className="absolute inset-[43%] rounded-full bg-white" />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-3 md:p-4 flex flex-col gap-2 md:gap-3 flex-1">
        <div className="flex flex-col gap-0.5 md:gap-1">
          <h3 className="text-[13px] md:text-[20px] font-semibold text-[#263238] leading-5 md:leading-7">
            Réf. {product.reference}
          </h3>
          <p className="text-[11px] md:text-[14px] font-medium text-[#4D4D4D] leading-4 md:leading-5">
            {product.width}mm × {product.length}m
          </p>
          <p className="text-[11px] md:text-[14px] text-[#717171] leading-4 md:leading-5">
            {product.usage}
          </p>
        </div>

        <button
          onClick={() => addItem({ productId: product.id, quantity: 1, reference: product.reference, unitPrice: product.price })}
          className="w-full h-9 md:h-11 bg-[#4CAF4F] text-white rounded-lg md:rounded-xl flex items-center justify-center gap-1.5 md:gap-2 hover:bg-[#43A047] transition-colors mt-auto"
        >
          <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 2.71v7.58M2.71 6.5h7.58" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span className="text-[11px] md:text-[13px] font-semibold">{t('common.add_to_cart')}</span>
        </button>
      </div>
    </div>
  );
}
