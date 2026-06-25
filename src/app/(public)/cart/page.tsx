'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const totalPrice = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Icône panier vide */}
          <div className="w-20 h-20 rounded-full bg-white shadow-[0_4px_24px_rgba(171,190,209,0.35)] flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 10a4 4 0 01-8 0" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-[#263238] mb-2">Votre panier est vide</h1>
            <p className="text-[15px] text-[#717171]">Parcourez notre catalogue et ajoutez des produits.</p>
          </div>
          <Link
            href="/products"
            className="bg-[#4CAF4F] text-white text-[15px] font-semibold px-8 py-3.5 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all"
          >
            Voir nos produits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <div className="max-w-[900px] mx-auto">

        {/* Retour */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-[#717171] text-[14px] hover:text-[#263238] transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Continuer les achats
        </Link>

        <h1 className="text-[36px] md:text-[42px] font-bold text-[#263238] mb-8">Mon panier</h1>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Liste produits */}
          <div className="flex-1 flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(171,190,209,0.25)] p-5 flex items-center gap-5"
              >
                {/* Icône rouleau */}
                <div className="w-14 h-14 bg-[#F5F7FA] rounded-xl flex items-center justify-center shrink-0">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
                    <div className="absolute inset-[18%] rounded-full bg-[#C8E6C9] border border-[#4CAF4F]" />
                    <div className="absolute inset-[35%] rounded-full bg-[#4CAF4F]" />
                    <div className="absolute inset-[48%] rounded-full bg-white" />
                  </div>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-[#263238]">Réf. {item.reference}</p>
                  <p className="text-[13px] text-[#89939E] mt-0.5">{item.price} DA / rouleau</p>
                </div>

                {/* Quantité */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 rounded-lg border border-[#ABBED1] flex items-center justify-center text-[#4D4D4D] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors text-[18px] leading-none"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-[15px] font-semibold text-[#263238]">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg border border-[#ABBED1] flex items-center justify-center text-[#4D4D4D] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors text-[18px] leading-none"
                  >
                    +
                  </button>
                </div>

                {/* Sous-total */}
                <div className="text-right min-w-[80px]">
                  <p className="text-[16px] font-bold text-[#263238]">{item.price * item.quantity} DA</p>
                </div>

                {/* Supprimer */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="w-8 h-8 rounded-lg hover:bg-[#FFF0F0] flex items-center justify-center transition-colors group"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="#ABBED1" strokeWidth="1.8" strokeLinecap="round" className="group-hover:stroke-[#EF5350]"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Résumé + Actions */}
          <div className="lg:w-[300px] flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 flex flex-col gap-4">
              <h2 className="text-[17px] font-bold text-[#263238]">Récapitulatif</h2>

              <div className="flex flex-col gap-3 text-[14px]">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-[#717171]">
                    <span>{item.quantity}× Réf. {item.reference}</span>
                    <span className="font-medium text-[#4D4D4D]">{item.price * item.quantity} DA</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#F0F4F8] flex justify-between items-center">
                <span className="text-[16px] font-semibold text-[#263238]">Total</span>
                <span className="text-[22px] font-bold text-[#4CAF4F]">{totalPrice} DA</span>
              </div>

              <Link
                href="/checkout"
                className="w-full bg-[#4CAF4F] text-white text-[15px] font-semibold py-3.5 rounded-xl text-center shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all"
              >
                Confirmer la commande →
              </Link>

              <Link
                href="/quote"
                className="w-full border border-[#ABBED1] text-[#4D4D4D] text-[14px] font-medium py-3 rounded-xl text-center hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors"
              >
                Demander un devis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
