'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { inputClass, labelClass } from '@/lib/utils';
import { WilayaSelect } from '@/components/ui/WilayaSelect';
import { CommuneSelect } from '@/components/ui/CommuneSelect';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';

const WHATSAPP_NUMBER = '213770150656';
const PHONE = '+213770150656';
const EMAIL = 'Contact@psi.dz';

interface ProdOption { id: string; reference: string; width: number; length: number; }
interface QuoteLine { dimChoice: string; customDim: string; quantity: string; }
const emptyLine = (): QuoteLine => ({ dimChoice: '', customDim: '', quantity: '' });

export default function QuotePage() {
  const { t } = useTranslation();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    wilaya: '',
    commune: '',
    message: '',
  });
  const [products, setProducts] = useState<ProdOption[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const WHATSAPP_MSG = encodeURIComponent(t('common.whatsapp_msg'));

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then((data: ProdOption[]) => {
      setProducts(data);
      if (cartItems.length > 0) {
        const fromCart = cartItems.map((ci) => {
          const prod = data.find(p => p.reference === ci.reference);
          return { dimChoice: prod?.id ?? '', customDim: '', quantity: String(ci.quantity) };
        });
        setLines(fromCart.length > 0 ? fromCart : [emptyLine()]);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLine = (i: number, patch: Partial<QuoteLine>) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    try {
      const items = lines.map((l) => {
        const qty = l.quantity ? Number(l.quantity) : 1;
        if (l.dimChoice === 'autre') {
          return { description: l.customDim.trim() || t('common.custom_dim'), quantity: qty };
        }
        if (l.dimChoice) {
          const prod = products.find(p => p.id === l.dimChoice);
          if (prod) return { productId: prod.id, width: prod.width, length: prod.length, quantity: qty };
        }
        return null;
      }).filter((x): x is NonNullable<typeof x> => x !== null);

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company || undefined,
          phone: formData.phone,
          email: formData.email || undefined,
          wilaya: formData.wilaya,
          commune: formData.commune || undefined,
          message: formData.message,
          items,
          source: 'SITE',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.error ?? t('quote.error'));
        return;
      }
      clearCart();
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          <h2 className="text-[22px] font-bold text-[#263238] mb-3">{t('quote.success_title')}</h2>
          <p className="text-[15px] text-[#717171] mb-8">{t('quote.success_body')}</p>
          <Link
            href="/"
            className="inline-block bg-[#0D9488] text-white text-[15px] font-semibold px-8 py-3 rounded-xl hover:bg-[#0F766E] transition-all"
          >
            {t('quote.success_btn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <div className="max-w-[1100px] mx-auto">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#717171] text-[14px] hover:text-[#263238] transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('quote.back')}
        </Link>

        <h1 className="text-[24px] md:text-[42px] font-bold text-[#263238] mb-2">{t('quote.title')}</h1>
        <p className="text-[14px] md:text-[16px] text-[#717171] mb-6 md:mb-10">{t('quote.subtitle')}</p>

        <div className="flex flex-col lg:flex-row gap-8">

          <form onSubmit={handleSubmit} className="flex-1">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-8 flex flex-col gap-6">
              <h2 className="text-[18px] font-bold text-[#263238]">{t('quote.section_coords')}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>{t('quote.name_label')}</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('quote.name_ph')} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('quote.company_label')}</label>
                  <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder={t('quote.company_ph')} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>{t('quote.phone_label')}</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder={t('quote.phone_ph')} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('quote.wilaya_label')}</label>
                  <WilayaSelect
                    name="wilaya"
                    value={formData.wilaya}
                    onChange={(v) => setFormData({ ...formData, wilaya: v, commune: '' })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('quote.commune_label')}</label>
                  <CommuneSelect
                    name="commune"
                    wilaya={formData.wilaya}
                    value={formData.commune}
                    onChange={(v) => setFormData({ ...formData, commune: v })}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('quote.email_label')}</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder={t('quote.email_ph')} className={inputClass} />
                </div>
              </div>

              <div className="border-t border-[#F0F4F8] pt-6">
                <h2 className="text-[18px] font-bold text-[#263238] mb-5">{t('quote.section_products')}</h2>

                <div className="flex flex-col gap-4">
                  {lines.map((line, i) => (
                    <div key={i} className="rounded-xl border border-[#F0F4F8] p-4 bg-[#FAFCFF]">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 items-end">
                        <div>
                          <label className={labelClass}>{t('quote.dim_label')}</label>
                          <select value={line.dimChoice} onChange={(e) => setLine(i, { dimChoice: e.target.value })} className={inputClass}>
                            <option value="">{t('quote.dim_default')}</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.reference}</option>
                            ))}
                            <option value="autre">{t('quote.dim_other')}</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>{t('quote.qty_label')}</label>
                          <input type="number" min="1" value={line.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} placeholder={t('quote.qty_ph')} className={inputClass} />
                        </div>
                        {lines.length > 1 && (
                          <button type="button" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                            className="h-[50px] w-11 flex items-center justify-center rounded-xl border border-[#ABBED1] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors" title={t('quote.remove_title')}>
                            <svg width={16} height={16} fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                        )}
                      </div>
                      {line.dimChoice === 'autre' && (
                        <div className="mt-3">
                          <label className={labelClass}>{t('quote.custom_dim_label')}</label>
                          <input type="text" value={line.customDim} onChange={(e) => setLine(i, { customDim: e.target.value })} placeholder={t('quote.custom_dim_ph')} className={inputClass} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setLines(prev => [...prev, emptyLine()])}
                  className="mt-4 flex items-center gap-2 text-[14px] font-bold text-[#4CAF4F] hover:text-[#43A047] transition-colors">
                  <svg width={18} height={18} fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  {t('quote.add_product')}
                </button>
              </div>

              <div>
                <label className={labelClass}>{t('quote.message_label')}</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('quote.message_ph')}
                  rows={4}
                  required
                  className={inputClass + ' resize-none'}
                />
              </div>

              {submitError && (
                <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4CAF4F] text-white text-[16px] font-semibold py-4 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? t('quote.submitting') : t('quote.submit')}</span>
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Sidebar contact */}
          <div className="lg:w-[300px] shrink-0 flex flex-col gap-4">

            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 flex flex-col gap-3">
              <p className="text-[15px] font-bold text-[#263238] mb-1">{t('quote.sidebar_title')}</p>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl border border-[#F0F4F8] hover:border-[#25D366] hover:bg-[#F0FDF4] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#25D366' }}>
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                    <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.663 4.61 1.816 6.51L4 29l7.697-1.794A12.94 12.94 0 0016 28c6.627 0 12-5.373 12-12S22.627 3 16 3z" fill="white"/>
                    <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.06 3.15 5 4.42.7.3 1.24.48 1.67.62.7.22 1.34.19 1.84.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="#25D366"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#263238]">{t('contact.whatsapp')}</p>
                  <p className="text-[12px] text-[#89939E]">+213 770 150 656</p>
                </div>
              </a>

              {/* Téléphone */}
              <a
                href={`tel:${PHONE}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#F0F4F8] hover:border-[#3B82F6] hover:bg-[#EFF6FF] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 6a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#263238]">{t('contact.call')}</p>
                  <p className="text-[12px] text-[#89939E]">+213 770 150 656</p>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#F0F4F8] hover:border-[#F97316] hover:bg-[#FFF7ED] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6l-10 7L2 6" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#263238]">{t('contact.email_label')}</p>
                  <p className="text-[12px] text-[#89939E]">{EMAIL}</p>
                </div>
              </a>

              <p className="text-[12px] text-[#ABBED1] pt-1">{t('quote.sidebar_hours')}</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
