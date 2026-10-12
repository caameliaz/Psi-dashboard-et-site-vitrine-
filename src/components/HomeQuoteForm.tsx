'use client';

import { useState } from 'react';
import { Reveal } from '@/components/Reveal';
import { ArrowButton } from '@/components/ArrowButton';
import { WilayaSelect } from '@/components/ui/WilayaSelect';
import { CommuneSelect } from '@/components/ui/CommuneSelect';
import { useTranslation } from '@/lib/i18n';

const MAX_LINES = 5;

const INPUT = 'w-full rounded-xl border border-[#E4EBF5] bg-[#F8FAFC] px-4 py-3 text-[15px] text-[#263238] placeholder:text-[#263238]/40 outline-none transition-all focus:border-[#4CAF4F] focus:bg-white focus:ring-4 focus:ring-[#4CAF4F]/15';

interface CatOption { id: string; name: string }
interface ProdOption { id: string; reference: string; width: number; length: number; category?: CatOption | null }
interface Line { categoryId: string; dimChoice: string; quantity: string }
const emptyLine = (): Line => ({ categoryId: '', dimChoice: '', quantity: '' });

// Bloc final de l'accueil: photo de fond, carte divisée en deux (arguments à gauche, formulaire de devis à droite).
// Le formulaire détaillé (produits, wilaya...) s'ouvre sur place, sans changer de page.
export function HomeQuoteForm({ phone: CONTACT_PHONE, content = {} }: { phone: string; content?: Record<string, string> }) {
  const { t, lang } = useTranslation();
  // Textes modifiables depuis le dashboard (français uniquement).
  const pick = (key: string, fallback: string) => (lang === 'fr' && content[key]) || fallback;
  const [form, setForm] = useState({ name: '', phone: '', company: '', message: '', email: '', wilaya: '', commune: '' });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [categories, setCategories] = useState<CatOption[]>([]);
  const [products, setProducts] = useState<ProdOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [settled, setSettled] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const toggleMore = () => {
    setSettled(false);
    setMore((m) => !m);
    // Catalogue chargé au premier déploiement seulement
    if (!loaded) {
      setLoaded(true);
      fetch('/api/categories').then((r) => (r.ok ? r.json() : [])).then((d: CatOption[]) => setCategories(d.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
      fetch('/api/products').then((r) => (r.ok ? r.json() : [])).then((d: ProdOption[]) => setProducts(d)).catch(() => {});
    }
  };

  const hasProducts = more && lines.some((l) => l.categoryId || l.dimChoice);

  const buildItems = () =>
    !more
      ? []
      : lines
          .map((l) => {
            const qty = l.quantity ? Number(l.quantity) : 1;
            if (l.dimChoice === 'autre') return { description: t('common.custom_dim'), quantity: qty };
            if (l.dimChoice) {
              const prod = products.find((p) => p.id === l.dimChoice);
              if (prod) return { productId: prod.id, width: prod.width, length: prod.length, quantity: qty };
            }
            if (l.categoryId) {
              const cat = categories.find((c) => c.id === l.categoryId);
              if (cat) return { description: cat.name, quantity: qty };
            }
            return null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('sending');
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          company: form.company || undefined,
          email: more && form.email ? form.email : undefined,
          wilaya: more && form.wilaya ? form.wilaya : undefined,
          commune: more && form.commune ? form.commune : undefined,
          message: form.message,
          items: buildItems(),
          source: 'SITE',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? t('home_quote.error'));
        setStatus('idle');
        return;
      }
      setStatus('done');
      setForm({ name: '', phone: '', company: '', message: '', email: '', wilaya: '', commune: '' });
      setLines([emptyLine()]);
      setMore(false);
    } catch {
      setError(t('home_quote.error'));
      setStatus('idle');
    }
  };

  return (
    <section
      id="devis"
      className="relative bg-cover bg-center py-16 md:py-24 px-6 md:px-12"
      style={{ backgroundImage: 'url(/images/devis-fond.jpg)' }}
    >
      <div className="absolute inset-0 bg-[#263238]/75" />

      <Reveal className="relative max-w-[1100px] mx-auto">
        <div className="grid md:grid-cols-2 rounded-[28px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
          {/* Colonne gauche: arguments + contact direct */}
          <div className="relative flex flex-col gap-6 overflow-hidden rounded-t-[28px] md:rounded-s-[28px] md:rounded-te-none bg-gradient-to-br from-[#263238] to-[#1b2529] p-8 md:p-10 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -end-20 w-64 h-64 rounded-full bg-[#4CAF4F]/25 blur-3xl" />
            <h2 className="relative text-[30px] md:text-[40px] font-medium tracking-tight leading-[1.1]">{pick('devis_titre', t('home_quote.title'))}</h2>
            <p className="relative text-[15px] md:text-[16px] text-white/75 leading-relaxed">{pick('devis_sous_titre', t('home_quote.subtitle'))}</p>

            <ul className="relative flex flex-col gap-3">
              {(['point1', 'point2', 'point3'] as const).map((k, i) => (
                <li key={k} className="flex items-center gap-3 text-[15px] text-white/90">
                  <span className="w-6 h-6 rounded-full bg-[#4CAF4F] flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  {pick(`devis_point_${i + 1}`, t(`home_quote.${k}`))}
                </li>
              ))}
            </ul>

            <div className="relative mt-auto flex flex-wrap gap-3 pt-2">
              <a href={`tel:+${CONTACT_PHONE}`} className="px-5 py-2.5 rounded-full border border-white/40 text-[14px] font-semibold hover:bg-white hover:text-[#263238] active:scale-95 transition-all">
                {t('hero.call')}
              </a>
              <a href={`https://wa.me/${CONTACT_PHONE}`} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-full border border-white/40 text-[14px] font-semibold hover:bg-[#25D366] hover:border-[#25D366] active:scale-95 transition-all">
                {t('hero.whatsapp')}
              </a>
            </div>
          </div>

          {/* Colonne droite: formulaire */}
          <div className="p-8 md:p-10">
            {status === 'done' ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-4 text-center">
                <span className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" stroke="#4CAF4F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <h3 className="text-[24px] font-semibold text-[#263238]">{t('home_quote.success_title')}</h3>
                <p className="text-[15px] text-[#263238]/70 max-w-[300px]">{t('home_quote.success_body')}</p>
                <button type="button" onClick={() => setStatus('idle')} className="text-[14px] font-semibold text-[#4CAF4F] hover:underline">
                  {t('home_quote.again')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <input className={INPUT} required minLength={2} maxLength={200} placeholder={t('home_quote.name')} aria-label={t('home_quote.name')} value={form.name} onChange={set('name')} autoComplete="name" />
                <input className={INPUT} required type="tel" placeholder={t('home_quote.phone')} aria-label={t('home_quote.phone')} value={form.phone} onChange={set('phone')} autoComplete="tel" />
                <input className={INPUT} maxLength={200} placeholder={t('home_quote.company')} aria-label={t('home_quote.company')} value={form.company} onChange={set('company')} autoComplete="organization" />

                {/* Volet détaillé: s'ouvre sur place */}
                <div
                  className={`grid transition-all duration-500 ease-out ${more ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  onTransitionEnd={(e) => { if (e.target === e.currentTarget) setSettled(more); }}
                >
                  <div className={`min-h-0 ${more && settled ? 'overflow-visible' : 'overflow-hidden'}`}>
                    <div className="flex flex-col gap-4 pb-1">
                      <input className={INPUT} type="email" maxLength={200} placeholder={t('quote.email_ph')} aria-label="Email" value={form.email} onChange={set('email')} autoComplete="email" />
                      <WilayaSelect name="wilaya" value={form.wilaya} onChange={(v) => setForm((f) => ({ ...f, wilaya: v, commune: '' }))} />
                      <CommuneSelect name="commune" wilaya={form.wilaya} value={form.commune} onChange={(v) => setForm((f) => ({ ...f, commune: v }))} />

                      <p className="text-[14px] font-semibold text-[#263238] mt-1">{t('home_quote.products_title')}</p>
                      {lines.map((line, i) => {
                        const lineProducts = line.categoryId ? products.filter((p) => p.category?.id === line.categoryId) : products;
                        return (
                          <div key={i} className="slide-in-x rounded-xl border border-[#E4EBF5] bg-[#F8FAFC] p-3 flex flex-col gap-3">
                            <select value={line.categoryId} onChange={(e) => setLine(i, { categoryId: e.target.value, dimChoice: '' })} className={INPUT} aria-label={t('quote.category_label')}>
                              <option value="">{t('quote.category_default')}</option>
                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="grid grid-cols-[1fr_96px_auto] gap-2 items-center">
                              <select value={line.dimChoice} onChange={(e) => setLine(i, { dimChoice: e.target.value })} className={INPUT} aria-label={t('quote.dim_label')}>
                                <option value="">{t('quote.dim_default')}</option>
                                {lineProducts.map((p) => <option key={p.id} value={p.id}>{p.reference}</option>)}
                                <option value="autre">{t('quote.dim_other')}</option>
                              </select>
                              <input type="number" min="1" className={INPUT} placeholder={t('quote.qty_ph')} aria-label={t('quote.qty_label')} value={line.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                              {lines.length > 1 ? (
                                <button type="button" title={t('quote.remove_title')} aria-label={t('quote.remove_title')} onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} className="w-9 h-9 rounded-full text-[#263238]/50 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                </button>
                              ) : <span className="w-9" />}
                            </div>
                          </div>
                        );
                      })}
                      {lines.length < MAX_LINES && (
                        <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className="self-start text-[13px] font-semibold text-[#4CAF4F] hover:underline">
                          + {t('quote.add_product')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <textarea className={`${INPUT} min-h-[110px] resize-y`} required={!hasProducts} maxLength={3000} placeholder={t('home_quote.message_ph')} aria-label={t('home_quote.message')} value={form.message} onChange={set('message')} />

                {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

                <ArrowButton type="submit" disabled={status === 'sending'} variant="green-white" className="w-full">
                  {status === 'sending' ? t('home_quote.submitting') : t('home_quote.submit')}
                </ArrowButton>

                <button type="button" onClick={toggleMore} aria-expanded={more} className="self-center flex items-center gap-1.5 text-[13px] text-[#263238]/60 hover:text-[#4CAF4F] transition-colors">
                  {more ? t('home_quote.details_close') : t('home_quote.details_open')}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className={`transition-transform duration-300 ${more ? 'rotate-180' : ''}`}>
                    <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
