'use client';

// Page Stock mobile — accessible depuis l'icône "Stock" de la navbar mobile.
// Contrairement à /admin/stock (tableaux desktop, cf. STOCK-MOBILE.md), cette page
// est pensée pour l'usage terrain : carte "Stock actuel" repliée par défaut (gatée
// par une permission dédiée) + listes d'achat/production (StockListsWidget, déjà
// responsive) via un toggle.

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/lib/role-context';
import { StockListsWidget } from '@/components/ui/StockListsWidget';
import { MobileNavbar } from '@/components/MobileNavbar';

interface StockProduct {
  id: string; reference: string; name: string | null;
  mode: 'ACHETE' | 'FABRIQUE' | 'LES_DEUX';
  available: number; reserved: number; inDelivery: number; returned: number; assignedToCommercials: number;
  purchaseThreshold: number; productionThreshold: number;
}

function statusBadge(available: number, threshold: number) {
  if (available <= 0) return <span className="px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#EF4444] text-[10px] font-bold">Rupture</span>;
  if (threshold > 0 && available <= threshold) return <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] text-[10px] font-bold">Stock faible</span>;
  return <span className="px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#166534] text-[10px] font-bold">En stock</span>;
}

// Carte produit repliée par défaut — un tap révèle En livraison/En retour, moins
// utiles au quotidien terrain (cf. décision actée dans STOCK-MOBILE.md).
function ProductCard({ p }: { p: StockProduct }) {
  const [expanded, setExpanded] = useState(false);
  const threshold = p.mode === 'ACHETE' ? p.purchaseThreshold : p.productionThreshold;
  const horsCommerciaux = Math.max(0, p.available + p.reserved - p.assignedToCommercials);

  return (
    <div onClick={() => setExpanded((v) => !v)}
      className="rounded-xl border border-[#E2E8F0] bg-white p-4 cursor-pointer transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#0F172A]">{p.reference}</p>
          {p.name && <p className="text-[11px] text-[#8A9BB5] truncate">{p.name}</p>}
        </div>
        {statusBadge(p.available, threshold)}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <p className="text-[10px] font-bold text-[#ABBED1] uppercase">Disponible</p>
          <p className="text-[14px] font-bold text-[#0F172A] tabular-nums">{p.available}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#ABBED1] uppercase">Réservé</p>
          <p className="text-[14px] text-[#374151] tabular-nums">{p.reserved}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#ABBED1] uppercase">Hors com.</p>
          <p className="text-[14px] text-[#374151] tabular-nums">{horsCommerciaux}</p>
        </div>
      </div>
      {expanded && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#F0F4F8]">
          <div>
            <p className="text-[10px] font-bold text-[#ABBED1] uppercase">En livraison</p>
            <p className="text-[14px] text-[#374151] tabular-nums">{p.inDelivery}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#ABBED1] uppercase">En retour</p>
            <p className="text-[14px] text-[#374151] tabular-nums">{p.returned}</p>
          </div>
        </div>
      )}
      <p className="text-[10px] text-[#CBD5E1] text-center mt-2">{expanded ? 'Toucher pour réduire' : 'Toucher pour plus de détails'}</p>
    </div>
  );
}

// Repliée : reste dans le flux fixe de la page (pas de scroll global). Dépliée : la
// carte a besoin de plus de place qu'un simple flex-1 ne peut lui donner sans devenir
// minuscule — on repasse alors la PAGE en scroll normal (cf. `open`/`onToggle` remontés
// au parent, qui bascule le conteneur racine entre hauteur fixe et hauteur libre).
function CurrentStockCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock/products');
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) fetchProducts(); }, [open, fetchProducts]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.reference.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q);
  });

  return (
    <div className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex-shrink-0 flex flex-col ${open ? 'flex-1 min-h-0' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5 flex-shrink-0">
        <span className="text-[14px] font-bold text-[#0F172A]">Stock actuel</span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" stroke="#8A9BB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 flex-1 min-h-0">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une référence..."
            className="w-full mb-3 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] sticky top-0 bg-white" />
          {loading ? (
            <p className="text-[13px] text-[#8A9BB5] text-center py-6">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] text-[#8A9BB5] text-center py-6">Aucun produit.</p>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Garde d'accès à la page : voir_stock OU voir_listes_stock suffit (l'un ou l'autre
// donne accès à AU MOINS une des deux sections ci-dessous) — RequirePerm ne gère
// qu'une seule permission à la fois, donc la garde est faite ici à la main.
function AccessGate({ children }: { children: React.ReactNode }) {
  const { can, loading } = useRole();
  if (loading) return null;
  if (!can('voir_stock') && !can('voir_listes_stock')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-4">
          <svg width={26} height={26} fill="none" viewBox="0 0 24 24">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="#EF4444" strokeWidth="1.7" />
            <path d="M8 10V7a4 4 0 118 0v3" stroke="#EF4444" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-[#0F172A]">Accès refusé</p>
        <p className="text-[13px] text-[#8A9BB5] mt-1.5 max-w-xs leading-relaxed">
          Vous n&apos;avez pas l&apos;autorisation de consulter cette page.
          Contactez un administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function StockMobilePageInner() {
  const { can } = useRole();
  const [stockOpen, setStockOpen] = useState(false);

  return (
    // Repliée (par défaut) : page FIXE, pas de scroll global — hauteur = écran moins
    // le header mobile (h-14) et le padding de <main> (p-4, cf. AdminShell). Le spacer
    // de MobileNavbar (h-20, rendu par le composant lui-même) réserve déjà sa place
    // dans le flux normal — pas besoin d'un padding-bottom manuel ici. Chaque section
    // scrolle en interne (flex-1 min-h-0).
    // Dépliée ("Stock actuel" ouverte) : la carte a besoin de plus de place qu'un
    // simple flex-1 ne peut lui donner sans devenir minuscule — on repasse alors la
    // PAGE ENTIÈRE en scroll normal (hauteur libre, pas de overflow interne forcé).
    <div className="w-full flex flex-col gap-4"
      style={stockOpen ? undefined : { height: 'calc(100dvh - 56px - 32px - 80px)' }}>
      <div className="flex-shrink-0">
        <h1 className="text-[20px] font-bold text-[#0F172A]">Stock</h1>
      </div>

      {/* Carte "Stock actuel" — gatée par voir_stock, indépendante de voir_listes_stock
          (cf. STOCK-MOBILE.md : un employé "production" peut avoir accès aux listes
          sans voir les chiffres de stock global). */}
      {can('voir_stock') && <CurrentStockCard open={stockOpen} onToggle={() => setStockOpen((v) => !v)} />}

      {/* Listes d'achat / production — gatées par voir_listes_stock, indépendante de
          voir_stock (même logique inverse). En page fixe (Stock actuel repliée), sa
          propre zone scrolle en interne ; en page libre (Stock actuel dépliée), elle
          suit le scroll normal de la page (pas de hauteur contrainte en plus). */}
      {can('voir_listes_stock') && (
        stockOpen ? (
          <StockListsWidget />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <StockListsWidget />
          </div>
        )
      )}
    </div>
  );
}

export default function StockMobilePage() {
  return (
    <AccessGate>
      <StockMobilePageInner />
      <MobileNavbar />
    </AccessGate>
  );
}
