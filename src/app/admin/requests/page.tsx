'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { AdminSelect } from '@/components/ui/AdminSelect';
import { WilayaSelect } from '@/components/ui/WilayaSelect';
import { RefSelect } from '@/components/ui/RefSelect';
import { exportTableauExcel } from '@/lib/export-tableau';
import { exportVentesExcel } from '@/lib/export-ventes';
import { useSSE } from '@/lib/use-sse';

const ARCHIVED = ['Livré', 'Annulé'];

function getSourceLabel(src: string) { return src === 'SITE' ? 'Site web' : 'Manuel'; }
const SOURCE_COLOR: Record<'SITE' | 'OTHER', { bg: string; color: string; border: string }> = {
  SITE:  { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  OTHER: { bg: '#FFF7ED', color: '#92400E', border: '#FDE68A' },
};

// DB status → UI label
const DB_TO_UI: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE:   'En attente',
  VALIDE:     'Confirmé',
  LIVRE:      'Livré',
  ANNULE:     'Annulé',
};

// UI label → DB status
const UI_TO_DB: Record<string, string> = {
  'En attente': 'EN_ATTENTE',
  'Confirmé':   'VALIDE',
  'Livré':      'LIVRE',
  'Annulé':     'ANNULE',
};

function orderToDetail(o: any): RequestDetail {
  const phone = o.client?.phones?.find((p: any) => p.primary)?.number ?? o.client?.phones?.[0]?.number ?? '';
  const rawItems = o.items ?? [];
  const items = rawItems.map((i: any) => ({
    designation: i.product?.reference ?? i.product?.ref ?? '?',
    quantite: i.quantity ?? 0,
    prixUnitaire: i.unitPrice ?? 0,
  }));
  const produits = items.map((i: any) => `${i.designation} × ${i.quantite}`).join(', ') || '—';
  const total = items.reduce((acc: number, i: any) => acc + i.quantite * i.prixUnitaire, 0);
  return {
    id: o.id,
    ref: o.ref ?? o.id.slice(0, 8).toUpperCase(),
    type: 'Commande',
    source: o.source ?? 'SITE',
    client: o.client?.name ?? '—',
    entreprise: o.client?.company ?? '—',
    telephone: phone,
    wilaya: o.client?.wilaya ?? '',
    adresse: o.client?.address ?? '',
    email: o.client?.email ?? '',
    produits,
    items,
    montant: total > 0 ? `${total.toLocaleString('fr-FR')} DA` : '—',
    statut: DB_TO_UI[o.status] ?? o.status,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function quoteToDetail(q: any): RequestDetail {
  const phone = q.client?.phones?.find((p: any) => p.primary)?.number ?? q.client?.phones?.[0]?.number ?? '';
  const rawItems = q.items ?? [];
  const items = rawItems.map((i: any) => ({
    designation: i.product?.reference ?? i.product?.ref ?? i.description ?? '?',
    quantite: i.quantity ?? 0,
    prixUnitaire: i.unitPrice ?? 0,
  }));
  const produits = items.map((i: any) => `${i.designation} × ${i.quantite}`).join(', ') || '—';
  return {
    id: q.id,
    ref: q.ref ?? q.id.slice(0, 8).toUpperCase(),
    type: 'Devis',
    source: q.source ?? 'SITE',
    client: q.client?.name ?? '—',
    entreprise: q.client?.company ?? '—',
    telephone: phone,
    wilaya: q.client?.wilaya ?? '',
    adresse: q.client?.address ?? '',
    email: q.client?.email ?? '',
    produits,
    items,
    montant: q.proposedPrice ? `${Number(q.proposedPrice).toLocaleString('fr-FR')} DA` : 'Sur devis',
    statut: DB_TO_UI[q.status] ?? q.status,
    date: new Date(q.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(q.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    message: q.message ?? '',
  };
}

function sortItems(items: RequestDetail[]): RequestDetail[] {
  return [...items].sort((a, b) => {
    const aA = ARCHIVED.includes(a.statut) ? 1 : 0;
    const bA = ARCHIVED.includes(b.statut) ? 1 : 0;
    return aA - bA;
  });
}

const ALL_STATUTS_COMMANDE = ['En attente', 'Confirmé', 'Livré', 'Annulé'];
const ALL_STATUTS_DEVIS    = ['En attente', 'Confirmé', 'Annulé'];

interface Ligne { ref: string; productId: string | null; qte: number; pu: number; }
const emptyLigne = (): Ligne => ({ ref: '', productId: null, qte: 1, pu: 0 });

function CreateForm({ defaultType, onClose, onSave }: {
  defaultType: 'Commande' | 'Devis';
  onClose: () => void;
  onSave: (item: any) => Promise<void>;
}) {
  const ic = "w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-[13px] text-[#263238] focus:outline-none focus:border-[#4CAF4F] focus:ring-[2px] focus:ring-[#4CAF4F]/15 transition-all bg-white";
  const lc = "block text-[11px] font-bold text-[#8A9BB5] uppercase tracking-wide mb-1";

  const [type, setType] = useState<'Commande' | 'Devis'>(defaultType);
  const [client, setClient] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([emptyLigne()]);
  const [tva, setTva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<{ id: string; reference: string; price: number }[]>([]);

  useEffect(() => {
    fetch('/api/products?all=true').then(r => r.json()).then((data: any[]) => {
      setProducts(data.map(p => ({ id: p.id, reference: p.reference, price: p.price ?? 0 })));
    }).catch(() => {});
  }, []);

  const setLigne = (i: number, patch: Partial<Ligne>) =>
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const selectRef = (i: number, reference: string) => {
    const p = products.find(p => p.reference === reference);
    setLigne(i, { ref: reference, productId: p?.id ?? null, pu: p?.price ?? 0 });
  };

  const ht = lignes.reduce((acc, l) => acc + l.qte * l.pu, 0);
  const total = tva ? Math.round(ht * 1.19) : ht;

  const handleSave = async () => {
    if (!client.trim() || lignes.every(l => !l.ref)) return;
    setSaving(true);
    const now = new Date();
    const produits = lignes.filter(l => l.ref).map(l => `${l.ref} × ${l.qte}`).join(', ');
    await onSave({
      ref: '',
      type,
      client: client.trim(),
      entreprise: entreprise.trim(),
      telephone: telephone.trim(),
      email: email.trim() || undefined,
      wilaya: wilaya.trim(),
      produits,
      montant: total > 0 ? `${total.toLocaleString('fr-FR')} DA${tva ? ' TTC' : ''}` : '—',
      statut: 'En attente',
      date: now.toLocaleDateString('fr-FR'),
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      // données brutes pour l'API
      _lignes: lignes,
      _wilaya: wilaya.trim(),
      _email: email.trim(),
      _telephone: telephone.trim(),
      _entreprise: entreprise.trim(),
    } as any);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-w-[96vw] z-10 flex flex-col overflow-hidden" style={{ maxHeight: '94vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <h3 className="text-[15px] font-bold text-[#0F172A]">Nouvelle demande</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1]">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Type toggle */}
          <div className="flex gap-2">
            {(['Commande', 'Devis'] as const).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors border-2"
                style={type === t
                  ? { background: t === 'Commande' ? '#F0FDF4' : '#F5F3FF', color: t === 'Commande' ? '#166534' : '#5B21B6', borderColor: t === 'Commande' ? '#4CAF4F' : '#8B5CF6' }
                  : { background: '#F8FAFC', color: '#8A9BB5', borderColor: '#E2E8F0' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Coordonnées */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Nom *</label><input value={client} onChange={e => setClient(e.target.value)} placeholder="Prénom Nom" className={ic} /></div>
            <div><label className={lc}>Entreprise</label><input value={entreprise} onChange={e => setEntreprise(e.target.value)} placeholder="Nom entreprise" className={ic} /></div>
            <div><label className={lc}>Téléphone</label><input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+213 5XX XXX XXX" className={ic} /></div>
            <div><label className={lc}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com" className={ic} /></div>
          </div>
          <div><label className={lc}>Wilaya</label><WilayaSelect value={wilaya} onChange={setWilaya} /></div>

          {/* Lignes produits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lc}>Produits</label>
            </div>

            {/* En-têtes colonnes */}
            <div className="grid gap-2 mb-1" style={{ gridTemplateColumns: '1fr 64px 96px 24px' }}>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Référence</span>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Qté</span>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Prix unit. DA</span>
              <span />
            </div>

            <div className="flex flex-col gap-2">
              {lignes.map((ligne, i) => (
                <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 64px 96px 24px' }}>
                  {/* Ref : dropdown stylisé pour Commande, input libre pour Devis */}
                  {type === 'Commande' ? (
                    <RefSelect
                      value={ligne.ref}
                      products={products}
                      onChange={(ref) => selectRef(i, ref)}
                    />
                  ) : (
                    <input value={ligne.ref} onChange={e => setLigne(i, { ref: e.target.value, productId: null })} placeholder="Réf libre" className={ic} />
                  )}

                  {/* Quantité */}
                  <input type="number" min={1} value={ligne.qte}
                    onChange={e => setLigne(i, { qte: Math.max(1, Number(e.target.value)) })}
                    className={ic + ' text-center'} />

                  {/* Prix unitaire — toujours modifiable */}
                  <input type="number" min={0} value={ligne.pu || ''}
                    onChange={e => setLigne(i, { pu: Number(e.target.value) })}
                    placeholder="0"
                    className={ic + ' text-right'} />

                  {/* Supprimer ligne */}
                  {lignes.length > 1 ? (
                    <button onClick={() => setLignes(prev => prev.filter((_, idx) => idx !== i))}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-[#ABBED1] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>

            <button onClick={() => setLignes(prev => [...prev, emptyLigne()])}
              className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C] transition-colors">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
              Ajouter une ligne
            </button>
          </div>

          {/* TVA + Total */}
          <div className="rounded-xl border border-[#F2F4F7] px-4 py-3 flex flex-col gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div onClick={() => setTva(v => !v)}
                className="w-9 h-5 rounded-full flex items-center transition-colors px-0.5 flex-shrink-0"
                style={{ background: tva ? '#4CAF4F' : '#E2E8F0' }}>
                <div className="w-4 h-4 bg-white rounded-full shadow transition-transform"
                  style={{ transform: tva ? 'translateX(16px)' : 'translateX(0)' }} />
              </div>
              <span className="text-[13px] font-semibold text-[#374151]">TVA 19%</span>
              {tva && <span className="text-[11px] text-[#8A9BB5]">HT → TTC</span>}
            </label>
            <div className="flex items-end justify-between pt-1 border-t border-[#F2F4F7]">
              {tva && (
                <div className="text-[12px] text-[#8A9BB5]">
                  HT : {ht.toLocaleString('fr-FR')} DA
                </div>
              )}
              <div className="ml-auto text-right">
                <p className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">{tva ? 'Total TTC' : 'Total HT'}</p>
                <p className="text-[22px] font-extrabold" style={{ color: type === 'Commande' ? '#4CAF4F' : '#8B5CF6' }}>
                  {total.toLocaleString('fr-FR')} <span className="text-[14px]">DA</span>
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#F2F4F7]">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={handleSave} disabled={saving || !client.trim() || lignes.every(l => !l.ref)}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: '#4CAF4F' }}>
            {saving ? 'Création…' : 'Créer la demande'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'tous' | 'commandes' | 'devis'>('tous');
  const [orders, setOrders]       = useState<RequestDetail[]>([]);
  const [quotes, setQuotes]       = useState<RequestDetail[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterPeriode, setFilterPeriode] = useState('mois');
  const [selected, setSelected]   = useState<RequestDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, quoRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/quotes'),
      ]);
      if (ordRes.ok) {
        const data = await ordRes.json();
        setOrders(data.map(orderToDetail));
      }
      if (quoRes.ok) {
        const data = await quoRes.json();
        setQuotes(data.map(quoteToDetail));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useSSE(useCallback(() => { fetchAll(); }, [fetchAll]));

  const isDevis = activeTab === 'devis';
  const rawItems = activeTab === 'tous' ? [...orders, ...quotes] : isDevis ? quotes : orders;
  const allStatuts = activeTab === 'tous' ? ALL_STATUTS_COMMANDE : isDevis ? ALL_STATUTS_DEVIS : ALL_STATUTS_COMMANDE;

  const sorted = sortItems(rawItems);

  const periodeStart = (() => {
    const now = new Date();
    if (filterPeriode === 'mois')   { const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0); return d; }
    if (filterPeriode === '3mois')  { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    if (filterPeriode === '6mois')  { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    if (filterPeriode === 'annee')  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    return null;
  })();

  const filtered = sorted.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.client.toLowerCase().includes(q) || r.entreprise.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q);
    const matchStatut = filterStatut === 'all' || r.statut === filterStatut;
    const matchPeriode = !periodeStart || (() => {
      const [d, m, y] = r.date.split('/').map(Number);
      return new Date(y, m - 1, d) >= periodeStart;
    })();
    return matchSearch && matchStatut && matchPeriode;
  });

  const handleStatusChange = async (ref: string, newStatut: string) => {
    const item = selected ?? rawItems.find((r) => r.ref === ref || r.id === ref);
    if (!item?.id) return;
    const dbStatus = UI_TO_DB[newStatut] ?? newStatut;
    const isItemDevis = item.type === 'Devis';
    const endpoint = isItemDevis ? `/api/quotes/${item.id}` : `/api/orders/${item.id}`;
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: dbStatus }),
    });
    if (!res.ok) console.error('PATCH failed', await res.text());
    await fetchAll();
    setSelected(null);
  };

  const handleConvertToOrder = async (item: RequestDetail & { _prix?: { totalOverride?: number; itemPrices?: { designation: string; unitPrice: number }[] } }) => {
    if (!item.id) {
      // fallback local
      const newOrder: RequestDetail = { ...item, ref: item.ref.replace('DEV-', 'CMD-'), type: 'Commande', statut: 'En attente', date: new Date().toLocaleDateString('fr-FR'), heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
      setQuotes((p) => p.map((q) => q.ref === item.ref ? { ...q, statut: 'Confirmé' } : q));
      setOrders((p) => [newOrder, ...p]);
      setSelected(null);
      setActiveTab('commandes');
      return;
    }
    const res = await fetch(`/api/quotes/${item.id}/convert`, { method: 'PATCH' });
    // Applique les prix saisis (unitaires ou total) sur la commande créée
    if (res.ok && item._prix) {
      const { order } = await res.json();
      if (order?.id) {
        await fetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item._prix),
        });
      }
    }
    await fetchAll();
    setSelected(null);
    setActiveTab('commandes');
  };

  const handleSaveNew = async (item: RequestDetail & { _lignes?: { productId: string | null; ref: string; qte: number; pu: number }[]; _wilaya?: string; _email?: string; _telephone?: string; _entreprise?: string }) => {
    const isCmd = item.type === 'Commande';
    const endpoint = isCmd ? '/api/orders' : '/api/quotes';

    const lignes = item._lignes ?? [];
    const body = isCmd
      ? {
          client: {
            name: item.client,
            company: item._entreprise || undefined,
            phone: item._telephone || undefined,
            email: item._email || undefined,
            wilaya: item._wilaya || 'Non spécifié',
          },
          items: lignes.filter(l => l.ref).map(l => ({
            productId: l.productId ?? undefined,
            quantity: l.qte,
            unitPrice: l.pu,
          })),
          source: 'AUTRE',
        }
      : {
          name: item.client,
          company: item._entreprise || undefined,
          phone: item._telephone || undefined,
          email: item._email || undefined,
          wilaya: item._wilaya || 'Non spécifié',
          message: '',
          items: lignes.filter(l => l.ref).map(l => ({
            productId: l.productId ?? undefined,
            description: l.productId ? undefined : l.ref,
            quantity: l.qte,
          })),
          source: 'AUTRE',
        };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      let errBody: any = {};
      try { errBody = JSON.parse(text); } catch { /* not json */ }
      alert(`[${res.status}] ${errBody.detail ?? errBody.error ?? text.slice(0, 200)}`);
      console.error('Erreur création raw:', text);
      return;
    }

    await fetchAll();
    setActiveTab(isCmd ? 'commandes' : 'devis');
  };

  const counts = {
    tous: orders.length + quotes.length,
    commandes: orders.length,
    devis: quotes.length,
  };

  const attente = {
    commandes: orders.filter((o) => o.statut === 'En attente').length,
    devis: quotes.filter((q) => q.statut === 'En attente').length,
  };

  const TABS = [
    { key: 'tous', label: 'Tous', count: counts.tous },
    { key: 'commandes', label: 'Commandes', count: counts.commandes },
    { key: 'devis', label: 'Devis', count: counts.devis },
  ] as const;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Demandes</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">
            {loading ? 'Chargement…' : `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => exportVentesExcel()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors"
          title="Exporter toutes les commandes livrées (rapport de ventes)">
          <svg width={14} height={14} fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M12 18v-6M9 15l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Rapport de ventes
        </button>
      </div>

      {/* Tabs + bouton Nouvelle demande */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: '#EEF2F7' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const pendingCount = tab.key === 'commandes' ? attente.commandes : tab.key === 'devis' ? attente.devis : attente.commandes + attente.devis;
            return (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key as typeof activeTab); setFilterStatut('all'); setSearch(''); setFilterPeriode('mois'); }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: isActive ? '#fff' : 'transparent', color: isActive ? '#0F172A' : '#94A3B8', boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                {tab.label}
                {pendingCount > 0 ? (
                  <>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: '#F97316' }}>
                      {pendingCount}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F97316' }} />
                  </>
                ) : (
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: isActive ? '#4CAF4F' : '#CBD5E1' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const label = activeTab === 'devis' ? 'Devis' : activeTab === 'commandes' ? 'Commandes' : 'Demandes';
              exportTableauExcel(filtered, `PSI_${label}`, label);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC] transition-colors"
            title="Exporter le tableau filtré en Excel">
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Exporter
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl text-[13px] font-bold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
            + Nouvelle demande
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={14} height={14} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher client, entreprise..." className="px-3 py-2 pl-8 w-[240px] rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors" />
        </div>
        <AdminSelect
          value={filterStatut}
          onChange={setFilterStatut}
          options={[{ value: 'all', label: 'Tous les statuts' }, ...allStatuts.map((s) => ({ value: s, label: s }))]}
        />
        <AdminSelect
          value={filterPeriode}
          onChange={setFilterPeriode}
          options={[
            { value: 'mois',  label: 'Ce mois' },
            { value: '3mois', label: '3 derniers mois' },
            { value: '6mois', label: '6 derniers mois' },
            { value: 'annee', label: 'Cette année' },
            { value: 'tout',  label: 'Tout afficher' },
          ]}
        />
        {(search || filterStatut !== 'all' || filterPeriode !== 'mois') && (
          <button onClick={() => { setSearch(''); setFilterStatut('all'); setFilterPeriode('mois'); }} className="text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151]">Effacer</button>
        )}
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm bg-white">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['N°', 'Type', 'Source', 'Entreprise', 'Client', 'Date', 'Statut'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Aucune demande trouvée</td></tr>
            ) : filtered.map((row, i) => {
              const isEnAttente = row.statut === 'En attente';
              const isArchived  = ARCHIVED.includes(row.statut);
              const isCommande  = row.type === 'Commande';
              const rowBg       = isEnAttente ? '#FFF7ED' : '#fff';
              const rowBgHover  = isEnAttente ? '#FEF3C7' : '#F8FAFC';
              const src         = row.source ?? 'SITE';
              const srcCfg      = src === 'SITE' ? SOURCE_COLOR.SITE : SOURCE_COLOR.OTHER;
              return (
                <tr key={i} onClick={() => setSelected(row)} className="cursor-pointer transition-colors"
                  style={{ background: rowBg, borderTop: '1px solid #F2F4F7' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = rowBgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                  <td className="px-5 py-3.5 text-[12px] font-mono font-bold" style={{ color: isCommande ? '#4CAF4F' : '#8B5CF6' }}>{row.ref}</td>
                  <td className="px-5 py-3.5">
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `2px solid ${isCommande ? '#4CAF4F' : '#8B5CF6'}`, background: isCommande ? '#F0FDF4' : '#F5F3FF', color: isCommande ? '#166534' : '#5B21B6' }}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg border"
                      style={{ background: srcCfg.bg, color: srcCfg.color, borderColor: srcCfg.border }}>
                      {getSourceLabel(src)}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-[13px] font-semibold ${isArchived ? 'text-[#ABBED1]' : 'text-[#0F172A]'}`}>{row.entreprise}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#8A9BB5]">{row.client}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#8A9BB5] tabular-nums">{row.date}</td>
                  <td className="px-5 py-3.5"><StatusPill status={row.statut} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <RequestPanel
          item={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onConvertToOrder={selected.type === 'Devis' ? handleConvertToOrder : undefined}
        />
      )}
      {showCreate && (
        <CreateForm
          defaultType={isDevis ? 'Devis' : 'Commande'}
          onClose={() => setShowCreate(false)}
          onSave={handleSaveNew}
        />
      )}
    </div>
  );
}
