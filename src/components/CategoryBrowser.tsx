'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';

interface Cat { id: string; name: string; photo: string | null; count?: number }
interface Prod { id: string; reference: string; width: number; length: number; usage: string; price: number; photo?: string; category?: { id: string; name: string } | null }

// Navigateur par catégories : cards catégorie (photo + nom) → sélection → produits
// de cette catégorie affichés sur la MÊME page (filtre in-place, pas de navigation).
export function CategoryBrowser({ limit }: { limit?: number }) {
  const { t } = useTranslation();
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [selected, setSelected] = useState<string>('all'); // 'all' = tout

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then((data: any[]) =>
      setCats(data.map(c => ({ id: c.id, name: c.name, photo: c.photo ?? null, count: c._count?.products ?? 0 })))
    ).catch(() => {});
    fetch('/api/products').then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const list = selected === 'all' ? products : products.filter(p => p.category?.id === selected);
    return limit ? list.slice(0, limit) : list;
  }, [products, selected, limit]);

  return (
    <div className="flex flex-col gap-8">
      {/* Cards catégories (photo + nom) */}
      <div className="flex flex-wrap justify-center gap-4">
        <CatCard
          label={t('common.all')}
          photo={null}
          active={selected === 'all'}
          onClick={() => setSelected('all')}
        />
        {cats.map((c) => (
          <CatCard
            key={c.id}
            label={c.name}
            photo={c.photo}
            active={selected === c.id}
            onClick={() => setSelected(c.id)}
          />
        ))}
      </div>

      {/* Produits de la catégorie sélectionnée */}
      {filtered.length === 0 ? (
        <p className="text-center text-[#717171] py-10">{t('common.no_products')}</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
          {filtered.map((p) => <ProductCard key={p.id} product={p as any} />)}
        </div>
      )}
    </div>
  );
}

function CatCard({ label, photo, active, onClick }: { label: string; photo: string | null; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-[150px] md:w-[180px] rounded-2xl overflow-hidden border-2 transition-all ${
        active ? 'border-[#4CAF4F] shadow-[0_8px_24px_rgba(76,175,79,0.25)]' : 'border-transparent shadow-[0_4px_16px_rgba(171,190,209,0.3)] hover:border-[#BBF7D0]'
      }`}
    >
      <div className="h-24 md:h-28 bg-[#F5F7FA] flex items-center justify-center overflow-hidden">
        {photo ? (
          <img src={photo} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
            <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
          </div>
        )}
      </div>
      <div className={`py-2.5 px-2 text-center text-[13px] font-bold ${active ? 'bg-[#4CAF4F] text-white' : 'bg-white text-[#263238]'}`}>
        {label}
      </div>
    </button>
  );
}
