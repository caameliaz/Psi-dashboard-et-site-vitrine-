'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { AdminSelect } from '@/components/ui/AdminSelect';

const ARCHIVED = ['Livré', 'Annulé'];

// DB status → UI label
const DB_TO_UI: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE:   'Contacté',
  VALIDE:     'Confirmé',
  LIVRE:      'Livré',
  ANNULE:     'Annulé',
};

// UI label → DB status
const UI_TO_DB: Record<string, string> = {
  'En attente': 'EN_ATTENTE',
  'Contacté':   'CONTACTE',
  'Confirmé':   'VALIDE',
  'Livré':      'LIVRE',
  'Annulé':     'ANNULE',
};

function orderToDetail(o: any): RequestDetail {
  const phone = o.client?.phones?.find((p: any) => p.primary)?.number ?? o.client?.phones?.[0]?.number ?? '';
  const produits = o.items?.map((i: any) => `${i.product?.ref ?? '?'} × ${i.quantity}`).join(', ') || '—';
  const total = o.items?.reduce((acc: number, i: any) => acc + i.quantity * (i.unitPrice ?? 0), 0) ?? 0;
  return {
    id: o.id,
    ref: o.ref ?? o.id.slice(0, 8).toUpperCase(),
    type: 'Commande',
    client: o.client?.name ?? '—',
    entreprise: o.client?.company ?? '—',
    telephone: phone,
    wilaya: o.client?.wilaya ?? '',
    adresse: o.client?.address ?? '',
    email: o.client?.email ?? '',
    produits,
    montant: total > 0 ? `${total.toLocaleString('fr-FR')} DA` : '—',
    statut: DB_TO_UI[o.status] ?? o.status,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function quoteToDetail(q: any): RequestDetail {
  const phone = q.client?.phones?.find((p: any) => p.primary)?.number ?? q.client?.phones?.[0]?.number ?? '';
  const produits = q.items?.map((i: any) => `${i.product?.ref ?? '?'} × ${i.quantity}`).join(', ') || '—';
  return {
    id: q.id,
    ref: q.ref ?? q.id.slice(0, 8).toUpperCase(),
    type: 'Devis',
    client: q.client?.name ?? '—',
    entreprise: q.client?.company ?? '—',
    telephone: phone,
    wilaya: q.client?.wilaya ?? '',
    adresse: q.client?.address ?? '',
    email: q.client?.email ?? '',
    produits,
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

const ALL_STATUTS_COMMANDE = ['En attente', 'Contacté', 'Confirmé', 'Livré', 'Annulé'];
const ALL_STATUTS_DEVIS    = ['En attente', 'Contacté', 'Confirmé', 'Annulé'];

function CreateForm({ defaultType, onClose, onSave }: {
  defaultType: 'Commande' | 'Devis';
  onClose: () => void;
  onSave: (item: RequestDetail) => void;
}) {
  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] text-[#263238] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";
  const labelClass = "block text-[12px] font-semibold text-[#374151] mb-1.5";
  const [type, setType] = useState<'Commande' | 'Devis'>(defaultType);
  const [client, setClient] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [telephone, setTelephone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [produits, setProduits] = useState('');
  const [montant, setMontant] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!client.trim() || !entreprise.trim() || !produits.trim()) return;
    setSaving(true);
    const now = new Date();
    // Pour la création manuelle, on reste en local (pas d'API POST structurée pour items libres)
    onSave({
      ref: '',
      type,
      client: client.trim(),
      entreprise: entreprise.trim(),
      telephone: telephone.trim(),
      wilaya: wilaya.trim(),
      produits: produits.trim(),
      montant: montant.trim() || (type === 'Devis' ? 'Sur devis' : '—'),
      statut: 'En attente',
      date: now.toLocaleDateString('fr-FR'),
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] max-w-[92vw] z-10 flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <h3 className="text-[16px] font-bold text-[#0F172A]">Nouvelle demande</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1] transition-colors">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
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
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Nom du contact *</label><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Prénom Nom" className={inputClass} /></div>
            <div><label className={labelClass}>Entreprise *</label><input value={entreprise} onChange={(e) => setEntreprise(e.target.value)} placeholder="Nom entreprise" className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Téléphone</label><input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+213 5XX XXX XXX" className={inputClass} /></div>
            <div><label className={labelClass}>Wilaya</label><input value={wilaya} onChange={(e) => setWilaya(e.target.value)} placeholder="Alger, Oran…" className={inputClass} /></div>
          </div>
          <div>
            <label className={labelClass}>Produits / Spécifications *</label>
            <textarea value={produits} onChange={(e) => setProduits(e.target.value)} placeholder="ex: 80/80 × 50 rouleaux" rows={3} className={inputClass + ' resize-none'} />
          </div>
          <div>
            <label className={labelClass}>Montant {type === 'Devis' ? '(optionnel)' : ''}</label>
            <input value={montant} onChange={(e) => setMontant(e.target.value)} placeholder={type === 'Devis' ? 'Sur devis' : 'ex: 45 000 DA'} className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-[#F2F4F7]">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Création…' : `Créer la ${type.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'commandes' | 'devis'>('commandes');
  const [orders, setOrders]       = useState<RequestDetail[]>([]);
  const [quotes, setQuotes]       = useState<RequestDetail[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
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

  const isDevis = activeTab === 'devis';
  const rawItems = isDevis ? quotes : orders;
  const allStatuts = isDevis ? ALL_STATUTS_DEVIS : ALL_STATUTS_COMMANDE;

  const sorted = sortItems(rawItems);
  const filtered = sorted.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.client.toLowerCase().includes(q) || r.entreprise.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q);
    const matchStatut = filterStatut === 'all' || r.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const handleStatusChange = async (ref: string, newStatut: string) => {
    const item = rawItems.find((r) => r.ref === ref);
    if (!item?.id) {
      // item local (créé manuellement sans API) — maj uniquement en mémoire
      if (isDevis) setQuotes((p) => p.map((q) => q.ref === ref ? { ...q, statut: newStatut } : q));
      else setOrders((p) => p.map((o) => o.ref === ref ? { ...o, statut: newStatut } : o));
      setSelected(null);
      return;
    }
    const dbStatus = UI_TO_DB[newStatut] ?? newStatut;
    const endpoint = isDevis ? `/api/quotes/${item.id}` : `/api/orders/${item.id}`;
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: dbStatus }),
    });
    await fetchAll();
    setSelected(null);
  };

  const handleConvertToOrder = async (item: RequestDetail) => {
    if (!item.id) {
      // fallback local
      const newOrder: RequestDetail = { ...item, ref: item.ref.replace('DEV-', 'CMD-'), type: 'Commande', statut: 'En attente', date: new Date().toLocaleDateString('fr-FR'), heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
      setQuotes((p) => p.map((q) => q.ref === item.ref ? { ...q, statut: 'Confirmé' } : q));
      setOrders((p) => [newOrder, ...p]);
      setSelected(null);
      setActiveTab('commandes');
      return;
    }
    await fetch(`/api/quotes/${item.id}/convert`, { method: 'PATCH' });
    await fetchAll();
    setSelected(null);
    setActiveTab('commandes');
  };

  const handleSaveNew = (item: RequestDetail) => {
    // Création manuelle locale (formulaire libre sans productId)
    const ts = Date.now().toString(36).toUpperCase();
    if (item.type === 'Commande') {
      setOrders((p) => [{ ...item, ref: `CMD-${ts}` }, ...p]);
    } else {
      setQuotes((p) => [{ ...item, ref: `DEV-${ts}` }, ...p]);
      setActiveTab('devis');
    }
  };

  const attenteCounts = {
    commandes: orders.filter((o) => o.statut === 'En attente').length,
    devis: quotes.filter((q) => q.statut === 'En attente').length,
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Demandes</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">
            {loading ? 'Chargement…' : `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
            Nouvelle demande
          </button>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#E4EBF5' }}>
            {(['commandes', 'devis'] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); setFilterStatut('all'); setSearch(''); }}
                className="relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ background: activeTab === tab ? '#fff' : 'transparent', color: activeTab === tab ? '#101828' : '#8A9BB5', boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {attenteCounts[tab] > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white" style={{ background: '#EF4444' }}>
                    {attenteCounts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
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
        {(search || filterStatut !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterStatut('all'); }} className="text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151]">Effacer</button>
        )}
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm bg-white">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['N°', 'Type', 'Entreprise', 'Client', 'Date', 'Statut'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Aucune demande trouvée</td></tr>
            ) : filtered.map((row, i) => {
              const isEnAttente = row.statut === 'En attente';
              const isArchived  = ARCHIVED.includes(row.statut);
              const isCommande  = row.type === 'Commande';
              const rowBg       = isEnAttente ? '#FFF7ED' : '#fff';
              const rowBgHover  = isEnAttente ? '#FEF3C7' : '#F8FAFC';
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
          onConvertToOrder={isDevis ? handleConvertToOrder : undefined}
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
