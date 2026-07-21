'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import { inputClass, labelClass } from '@/lib/utils';
import { WilayaSelect } from '@/components/ui/WilayaSelect';
import { CommuneSelect } from '@/components/ui/CommuneSelect';
import { useTranslation } from '@/lib/i18n';
import { validateEmail, validatePhone, firstError } from '@/lib/validation';

export default function CheckoutPage() {
  const { t } = useTranslation();
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
    email: '',
    wilaya: '',
    commune: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Vérifie le format des coordonnées avant d'envoyer
    const vErr = firstError([
      validatePhone(formData.phone, true),
      validateEmail(formData.email),
    ]);
    if (vErr) { setSubmitError(vErr); return; }

    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: {
            name: formData.name,
            company: formData.company || undefined,
            phone: formData.phone,
            email: formData.email || undefined,
            wilaya: formData.wilaya,
            commune: formData.commune || undefined,
            address: formData.address || undefined,
          },
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
          source: 'SITE',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.error ?? t('checkout.error'));
        return;
      }
      clearCart();
      setSubmitted(true);
    } catch {
      // Erreur réseau (serveur injoignable) → message propre au lieu d'un crash
      setSubmitError(t('checkout.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-10 max-w-[480px] w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#E0F4F4] flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-[#263238] mb-3">{t('checkout.success_title')}</h2>
          <p className="text-[15px] text-[#717171] mb-8">{t('checkout.success_body')}</p>
          <Link
            href="/"
            className="inline-block bg-[#0D9488] text-white text-[15px] font-semibold px-8 py-3 rounded-xl hover:bg-[#0F766E] transition-all"
          >
            {t('checkout.success_btn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <div className="max-w-[1100px] mx-auto">

        <Link href="/cart" className="inline-flex items-center gap-2 text-[#717171] text-[14px] hover:text-[#263238] transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('checkout.back')}
        </Link>

        <h1 className="text-[36px] md:text-[42px] font-bold text-[#263238] mb-2">{t('checkout.title')}</h1>
        <p className="text-[16px] text-[#717171] mb-10">{t('checkout.subtitle')}</p>

        <div className="flex flex-col lg:flex-row gap-8">

          <form onSubmit={handleSubmit} className="flex-1">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-8 flex flex-col gap-6">
              <h2 className="text-[18px] font-bold text-[#263238]">{t('checkout.section_coords')}</h2>

              <div>
                <label className={labelClass}>{t('checkout.name_label')}</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('checkout.name_ph')} required className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>{t('checkout.company_label')}</label>
                <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder={t('checkout.company_ph')} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>{t('checkout.email_label')}</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder={t('checkout.email_ph')} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>{t('checkout.phone_label')}</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder={t('checkout.phone_ph')} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('checkout.wilaya_label')}</label>
                  <WilayaSelect
                    name="wilaya"
                    value={formData.wilaya}
                    onChange={(v) => setFormData({ ...formData, wilaya: v, commune: '' })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('checkout.commune_label')}</label>
                  <CommuneSelect
                    name="commune"
                    wilaya={formData.wilaya}
                    value={formData.commune}
                    onChange={(v) => setFormData({ ...formData, commune: v })}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>{t('checkout.address_label')}</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder={t('checkout.address_ph')} className={inputClass} />
              </div>

              {submitError && (
                <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4CAF4F] text-white text-[16px] font-semibold py-4 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? t('checkout.submitting') : t('checkout.submit')}</span>
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
              <h2 className="text-[17px] font-bold text-[#263238] mb-5">{t('checkout.summary_title')}</h2>

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
                      <p className="text-[14px] font-semibold text-[#263238]">{t('checkout.ref')} {item.reference}</p>
                      <p className="text-[12px] text-[#89939E]">× {item.quantity}</p>
                    </div>
                    <p className="text-[14px] font-bold text-[#263238]">{item.unitPrice * item.quantity} DA</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-[#F0F4F8] flex justify-between items-center">
                <span className="text-[16px] font-semibold text-[#263238]">{t('checkout.total')}</span>
                <span className="text-[24px] font-bold text-[#4CAF4F]">{totalPrice} DA</span>
              </div>

              <div className="mt-5 pt-5 border-t border-[#F0F4F8] flex flex-col gap-3">
                {[
                  t('checkout.guarantee_1'),
                  t('checkout.guarantee_2'),
                  t('checkout.guarantee_3'),
                ].map((g) => (
                  <div key={g} className="flex items-center gap-2.5 text-[13px] text-[#717171]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF4F] shrink-0" />
                    <span>{g}</span>
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
