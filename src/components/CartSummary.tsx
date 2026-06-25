'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';

export function CartSummary() {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-[#263238] text-white px-5 py-4 rounded-[10px] shadow-[0px_8px_16px_rgba(38,50,56,0.4)] flex items-center gap-4 z-50">
      <div>
        <p className="text-xs text-[#89939E] leading-none mb-1">
          {totalItems} article{totalItems !== 1 ? 's' : ''}
        </p>
        <p className="text-sm font-semibold leading-none">
          {totalPrice.toFixed(2)} DA
        </p>
      </div>
      <Link
        href="/cart"
        className="bg-[#4CAF4F] text-white text-sm font-medium px-4 py-2 rounded hover:bg-[#45a049] transition-colors whitespace-nowrap"
      >
        Voir le panier
      </Link>
    </div>
  );
}
