'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import { inputClass, labelClass } from '@/lib/utils';
import { WilayaSelect } from '@/components/ui/WilayaSelect';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const totalPrice = getTotalPrice();

  useEffect(() => {
    if (items.length === 0) router.replace('/cart');
  }, [items, router]);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    wilaya: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: {
            name: formData.name,
            company: formData.company || undefined,
            phone: formData.phone,
            wilaya: formData.wilaya,
            address: formData.address || undefined,
          },
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
          source: 'SITE',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? 'Erreur lors de l\'envoi. Veuillez réessayer.');
        return;
      }
      clearCart();
      alert('Commande envoyée ! Notre équipe vous contactera rapidement.');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <div className="max-w-[1100px] mx-auto">

        <Link href="/cart" className="inline-flex items-center gap-2 text-[#717171] text-[14px] hover:text-[#263238] transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Retour au panier
        </Link>

        <h1 className="text-[36px] md:text-[42px] font-bold text-[#263238] mb-2">Finaliser la commande</h1>
        <p className="text-[16px] text-[#717171] mb-10">
          Remplissez vos coordonnées et notre équipe vous recontactera pour confirmer la livraison.
        </p>

        <div className="flex flex-col lg:flex-row gap-8">

          <form onSubmit={handleSubmit} className="flex-1">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-8 flex flex-col gap-6">
              <h2 className="text-[18px] font-bold text-[#263238]">Vos coordonnées</h2>

              <div>
                <label className={labelClass}>Nom complet *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Votre nom et prénom" required className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Entreprise</label>
                <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Nom de votre entreprise" className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Téléphone *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+213 XXX XXX XXX" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Wilaya *</label>
                  <WilayaSelect
                    name="wilaya"
                    value={formData.wilaya}
                    onChange={(v) => setFormData({ ...formData, wilaya: v })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Adresse de livraison</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Adresse complète (optionnel)" className={inputClass} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4CAF4F] text-white text-[16px] font-semibold py-4 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Envoi en cours...' : 'Envoyer la commande'}</span>
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Récapitulatif */}
          <div className="lg:w-[320px] shrink-0">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 sticky top-24">
              <h2 className="text-[17px] font-bold text-[#263238] mb-5">Votre commande</h2>

              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F5F7FA] rounded-lg flex items-center justify-center shrink-0">
                      <div className="relative w-6 h-6">
                        <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border border-[#4CAF4F]" />
                        <div className="absolute inset-[22%] rounded-full bg-[#4CAF4F]" />
                        <div className="absolute inset-[42%] rounded-full bg-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#263238]">Réf. {item.reference}</p>
                      <p className="text-[12px] text-[#89939E]">× {item.quantity}</p>
                    </div>
                    <p className="text-[14px] font-bold text-[#263238]">{item.unitPrice * item.quantity} DA</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-[#F0F4F8] flex justify-between items-center">
                <span className="text-[16px] font-semibold text-[#263238]">Total</span>
                <span className="text-[24px] font-bold text-[#4CAF4F]">{totalPrice} DA</span>
              </div>

              <div className="mt-5 pt-5 border-t border-[#F0F4F8] flex flex-col gap-3">
                {[
                  { text: 'Livraison dans toute l\'Algérie' },
                  { text: 'Qualité garantie, origine Europe' },
                  { text: 'Réponse rapide sous 24h' },
                ].map((g) => (
                  <div key={g.text} className="flex items-center gap-2.5 text-[13px] text-[#717171]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF4F] shrink-0" />
                    <span>{g.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
