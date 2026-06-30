'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';

export function CartSummary() {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-24 sm:w-auto bg-[#263238] text-white px-5 py-4 rounded-2xl shadow-[0px_8px_24px_rgba(38,50,56,0.45)] flex items-center gap-4 z-50">
      <div className="flex-1 sm:flex-none">
        <p className="text-xs text-[#89939E] leading-none mb-1">
          {totalItems} article{totalItems !== 1 ? 's' : ''}
        </p>
        <p className="text-sm font-semibold leading-none">
          {totalPrice.toFixed(2)} DA
        </p>
      </div>
      <Link
        href="/cart"
        className="bg-[#4CAF4F] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#45a049] transition-colors whitespace-nowrap min-h-[44px] flex items-center"
      >
        Voir le panier →
      </Link>
    </div>
  );
}
