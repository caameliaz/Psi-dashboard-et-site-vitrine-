'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { AdminSelect } from '@/components/ui/AdminSelect';
import { WilayaSelect } from '@/components/ui/WilayaSelect';
import { CommuneSelect } from '@/components/ui/CommuneSelect';
import { ClientAutocomplete } from '@/components/ui/ClientAutocomplete';
import { RefSelect } from '@/components/ui/RefSelect';
import { exportTableauExcel } from '@/lib/export-tableau';
import { exportVentesExcel } from '@/lib/export-ventes';
import { useSSE } from '@/lib/use-sse';
import { useSession } from 'next-auth/react';

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

const PERIODE_LABEL: Record<string, string> = {
  '7j': '7 derniers jours', '2sem': '2 dernières semaines', '3sem': '3 dernières semaines',
  mois: 'Ce mois', '3mois': '3 derniers mois', '6mois': '6 derniers mois', annee: 'Cette année', tout: 'Tout afficher',
};

// Date de début d'une période → Date. null = tout charger.
function periodeStartDate(periode: string): Date | null {
  const now = new Date();
  if (periode === '7j')    { const d = new Date(now); d.setDate(d.getDate() - 7);  return d; }
  if (periode === '2sem')  { const d = new Date(now); d.setDate(d.getDate() - 14); return d; }
  if (periode === '3sem')  { const d = new Date(now); d.setDate(d.getDate() - 21); return d; }
  if (periode === 'mois')  { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  if (periode === '3mois') { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (periode === '6mois') { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
  if (periode === 'annee') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  return null; // 'tout'
}

// … → ISO pour le paramètre ?from de l'API.
function periodeToFrom(periode: string): string | null {
  const d = periodeStartDate(periode);
  return d ? d.toISOString() : null;
}

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
  const items = rawItems.map((i: any) => {
    const baseName = i.product?.reference ?? i.product?.ref ?? i.description ?? '?';
    return {
      designation: i.metrage != null ? `${baseName} · ${i.metrage} m` : baseName,
      categorie: i.product?.category?.name ?? '',
      quantite: i.quantity ?? 0,
      prixUnitaire: i.unitPrice ?? 0,
      metrage: i.metrage ?? null,
    };
  });
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
    commune: o.client?.commune ?? '',
    adresse: o.client?.address ?? '',
    email: o.client?.email ?? '',
    produits,
    items,
    montant: total > 0 ? `${total.toLocaleString('fr-FR')} DA` : '—',
    statut: DB_TO_UI[o.status] ?? o.status,
    assignedToId: o.assignedTo?.id ?? o.assignedToId ?? null,
    assignedToName: o.assignedTo?.name ?? null,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function quoteToDetail(q: any): RequestDetail {
  const phone = q.client?.phones?.find((p: any) => p.primary)?.number ?? q.client?.phones?.[0]?.number ?? '';
  const rawItems = q.items ?? [];
  const items = rawItems.map((i: any) => {
    const baseName = i.product?.reference ?? i.product?.ref ?? i.description ?? '?';
    return {
      designation: i.metrage != null ? `${baseName} · ${i.metrage} m` : baseName,
      categorie: i.product?.category?.name ?? '',
      quantite: i.quantity ?? 0,
      prixUnitaire: i.unitPrice ?? 0,
      metrage: i.metrage ?? null,
    };
  });
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
    commune: q.client?.commune ?? '',
    adresse: q.client?.address ?? '',
    email: q.client?.email ?? '',
    produits,
    items,
    montant: q.proposedPrice ? `${Number(q.proposedPrice).toLocaleString('fr-FR')} DA` : 'Sur devis',
    statut: DB_TO_UI[q.status] ?? q.status,
    assignedToId: q.assignedTo?.id ?? q.assignedToId ?? null,
    assignedToName: q.assignedTo?.name ?? null,
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
const ALL_STATUTS_DEVIS    = ['En attente', 'Confirmé', 'Livré', 'Annulé'];

interface Ligne { ref: string; productId: string | null; qte: number; pu: number; metrage: string; }
const emptyLigne = (): Ligne => ({ ref: '', productId: null, qte: 1, pu: 0, metrage: '' });

// Construit le payload + poste la commande/devis. Réutilisable (page requests + quick-order mobile).
export async function submitNewRequest(
  item: any
): Promise<{ ok: boolean; type: 'Commande' | 'Devis'; error?: string }> {
  const isCmd = item.type === 'Commande';
  const endpoint = isCmd ? '/api/orders' : '/api/quotes';
  const lignes = item._lignes ?? [];
  const body = isCmd
    ? {
        client: {
          name: item.client, company: item._entreprise || undefined, phone: item._telephone || undefined,
          email: item._email || undefined, wilaya: item._wilaya || 'Non spécifié', commune: item._commune || undefined,
        },
        items: lignes.filter((l: any) => l.ref).map((l: any) => ({ productId: l.productId ?? undefined, description: l.productId ? undefined : l.ref, quantity: l.qte, unitPrice: l.pu, metrage: l.metrage ? Number(l.metrage) : undefined })),
        assignedToId: item._assignedToId ?? undefined, source: 'AUTRE',
      }
    : {
        name: item.client, company: item._entreprise || undefined, phone: item._telephone || undefined,
        email: item._email || undefined, wilaya: item._wilaya || 'Non spécifié', commune: item._commune || undefined, message: '',
        items: lignes.filter((l: any) => l.ref).map((l: any) => ({ productId: l.productId ?? undefined, description: l.productId ? undefined : l.ref, quantity: l.qte, metrage: l.metrage ? Number(l.metrage) : undefined })),
        assignedToId: item._assignedToId ?? undefined, source: 'AUTRE',
      };
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    let errBody: any = {}; try { errBody = JSON.parse(text); } catch { /* not json */ }
    return { ok: false, type: isCmd ? 'Commande' : 'Devis', error: errBody.detail ?? errBody.error ?? text.slice(0, 200) };
  }
  return { ok: true, type: isCmd ? 'Commande' : 'Devis' };
}

export function CreateForm({ defaultType, onClose, onSave, users, currentUserId, inline = false }: {
  defaultType: 'Commande' | 'Devis';
  onClose: () => void;
  onSave: (item: any) => Promise<void>;
  users: { id: string; name: string }[];
  currentUserId?: string;
  inline?: boolean;
}) {
  const ic = "w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-[13px] text-[#263238] focus:outline-none focus:border-[#4CAF4F] focus:ring-[2px] focus:ring-[#4CAF4F]/15 transition-all bg-white";
  const lc = "block text-[11px] font-bold text-[#8A9BB5] uppercase tracking-wide mb-1";

  const [type, setType] = useState<'Commande' | 'Devis'>(defaultType);
  const [client, setClient] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([emptyLigne()]);
  const [tva, setTva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignedToId, setAssignedToId] = useState<string>(currentUserId ?? '');
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
    if (!client.trim() || !telephone.trim() || lignes.every(l => !l.ref)) return;
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
      _commune: commune.trim(),
      _email: email.trim(),
      _telephone: telephone.trim(),
      _entreprise: entreprise.trim(),
      _assignedToId: assignedToId || undefined,
    } as any);
    setSaving(false);
    onClose();
  };

  // inline = pleine page (quick-order mobile) ; sinon modal overlay (bouton dans la liste).
  // ⚠️ Le contenu (formBody) doit être défini SANS composant dynamique, sinon React
  // remonte tout à chaque frappe et le clavier mobile se ferme.
  const formBody = (
    <>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <h3 className="text-[15px] font-bold text-[#0F172A]">{type === 'Commande' ? 'Nouvelle commande' : 'Nouvelle demande de devis'}</h3>
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
            <div>
              <label className={lc}>Nom *</label>
              <ClientAutocomplete
                value={client}
                onChange={setClient}
                inputClass={ic}
                onPick={(c) => {
                  setClient(c.name);
                  setEntreprise(c.company ?? '');
                  setTelephone(c.phone ?? '');
                  setEmail(c.email ?? '');
                  setWilaya(c.wilaya ?? '');
                  setCommune(c.commune ?? '');
                }}
              />
            </div>
            <div><label className={lc}>Entreprise</label><input value={entreprise} onChange={e => setEntreprise(e.target.value)} placeholder="Nom entreprise" className={ic} /></div>
            <div><label className={lc}>Téléphone *</label><input type="tel" inputMode="tel" value={telephone} onChange={e => setTelephone(e.target.value.replace(/[^\d+ ]/g, ''))} placeholder="+213 5XX XXX XXX" className={ic} /></div>
            <div><label className={lc}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com" className={ic} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Wilaya</label><WilayaSelect value={wilaya} onChange={(v) => { setWilaya(v); setCommune(''); }} /></div>
            <div><label className={lc}>Commune</label><CommuneSelect wilaya={wilaya} value={commune} onChange={setCommune} /></div>
          </div>
          <div>
            <label className={lc}>Commercial</label>
            <AdminSelect
              className="w-full"
              value={assignedToId}
              onChange={setAssignedToId}
              options={[{ value: '', label: '— Non assigné —' }, ...users.map(u => ({ value: u.id, label: u.name }))]}
            />
          </div>

          {/* Lignes produits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lc}>Produits</label>
            </div>

            {/* En-têtes colonnes */}
            <div className="grid gap-2 mb-1" style={{ gridTemplateColumns: '1fr 72px 64px 96px 24px' }}>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Référence</span>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Métrage (m)</span>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Qté</span>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Prix unit. DA</span>
              <span />
            </div>

            <div className="flex flex-col gap-2">
              {lignes.map((ligne, i) => (
                <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 72px 64px 96px 24px' }}>
                  {/* Ref : dropdown des réfs existantes + option "Référence libre" (commande ET devis) */}
                  <RefSelect
                    value={ligne.ref}
                    products={products}
                    allowFree
                    onChange={(ref, isFree) => {
                      if (isFree) {
                        setLigne(i, { ref, productId: null });
                      } else {
                        selectRef(i, ref);
                      }
                    }}
                  />

                  {/* Métrage (facultatif) */}
                  <input type="number" inputMode="decimal" min={0} step="any" value={ligne.metrage}
                    onChange={e => setLigne(i, { metrage: e.target.value })}
                    placeholder="—"
                    className={ic + ' text-center'} />

                  {/* Quantité */}
                  <input type="number" inputMode="numeric" min={1} value={ligne.qte}
                    onChange={e => setLigne(i, { qte: Math.max(1, Number(e.target.value)) })}
                    className={ic + ' text-center'} />

                  {/* Prix unitaire — toujours modifiable */}
                  <input type="number" inputMode="numeric" min={0} value={ligne.pu || ''}
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
          <button onClick={handleSave} disabled={saving || !client.trim() || !telephone.trim() || lignes.every(l => !l.ref)}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: '#4CAF4F' }}>
            {saving ? 'Création…' : `Créer ${type === 'Commande' ? 'la commande' : 'le devis'}`}
          </button>
        </div>
    </>
  );

  if (inline) {
    return <div className="w-full max-w-[560px] mx-auto bg-white rounded-2xl border border-[#E2E8F0] flex flex-col overflow-hidden">{formBody}</div>;
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-w-[96vw] z-10 flex flex-col overflow-hidden" style={{ maxHeight: '94vh' }}>{formBody}</div>
    </div>
  );
}

export default function RequestsPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [activeTab, setActiveTab] = useState<'tous' | 'commandes' | 'devis'>('tous');
  const [orders, setOrders]       = useState<RequestDetail[]>([]);
  const [quotes, setQuotes]       = useState<RequestDetail[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterPeriode, setFilterPeriode] = useState('mois');
  const [filterAssigne, setFilterAssigne] = useState('all');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected]   = useState<RequestDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // silent = refetch en arrière-plan (SSE temps réel) → pas de spinner, pas de clignotement
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Perf : on ne charge que la période sélectionnée (le serveur filtre par ?from)
      const from = periodeToFrom(filterPeriode);
      const qs = from ? `?from=${encodeURIComponent(from)}` : '';
      const [ordRes, quoRes] = await Promise.all([
        fetch(`/api/orders${qs}`),
        fetch(`/api/quotes${qs}`),
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
      if (!silent) setLoading(false);
    }
  }, [filterPeriode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useSSE(useCallback(() => { fetchAll(true); }, [fetchAll]));

  // Ouverture directe d'un détail via ?open=<id> (depuis l'historique / une notif)
  useEffect(() => {
    const openId = new URLSearchParams(window.location.search).get('open');
    if (!openId) return;
    const found = [...orders, ...quotes].find((r) => r.id === openId);
    if (found) setSelected(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, quotes]);

  // Liste des utilisateurs actifs (pour l'assignation "pris en charge par")
  useEffect(() => {
    fetch('/api/users?assignable=true').then(r => r.ok ? r.json() : []).then(setUsers).catch(() => {});
  }, []);

  const isDevis = activeTab === 'devis';
  const rawItems = activeTab === 'tous' ? [...orders, ...quotes] : isDevis ? quotes : orders;
  const allStatuts = activeTab === 'tous' ? ALL_STATUTS_COMMANDE : isDevis ? ALL_STATUTS_DEVIS : ALL_STATUTS_COMMANDE;

  const sorted = sortItems(rawItems);

  const periodeStart = periodeStartDate(filterPeriode);

  const filtered = sorted.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.client.toLowerCase().includes(q) || r.entreprise.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q);
    const matchStatut = filterStatut === 'all' || r.statut === filterStatut;
    const matchAssigne = filterAssigne === 'all'
      || (filterAssigne === 'none' ? !r.assignedToId : r.assignedToId === filterAssigne);
    const matchPeriode = !periodeStart || (() => {
      const [d, m, y] = r.date.split('/').map(Number);
      return new Date(y, m - 1, d) >= periodeStart;
    })();
    return matchSearch && matchStatut && matchAssigne && matchPeriode;
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
    await fetchAll(true);
    // Statut final (Livré/Annulé) → on ferme le détail. Sinon on le garde ouvert
    // en mettant à jour son statut (l'utilisateur peut enchaîner les actions).
    if (newStatut === 'Livré' || newStatut === 'Annulé') {
      setSelected(null);
    } else {
      setSelected((prev) => (prev ? { ...prev, statut: newStatut } : prev));
    }
  };

  // Change l'assignation ("pris en charge par") d'une commande/devis
  const handleAssign = async (id: string, type: string, assignedToId: string | null) => {
    const endpoint = type === 'Devis' ? `/api/quotes/${id}` : `/api/orders/${id}`;
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId }),
    });
    if (!res.ok) { console.error('Assign failed', await res.text()); return; }
    await fetchAll(true);
    // Met à jour le panneau ouvert avec le nouvel assigné
    setSelected(prev => prev ? { ...prev, assignedToId, assignedToName: users.find(u => u.id === assignedToId)?.name ?? null } : prev);
  };

  // Confirme un devis en fixant son prix (proposedPrice). Le prix est saisi
  // dans le popup au moment du passage "En attente → Confirmé".
  const handleConfirmQuoteWithPrice = async (
    item: RequestDetail & { _prix?: { totalOverride?: number; itemPrices?: { designation: string; unitPrice: number }[] } }
  ) => {
    if (!item.id) return;
    // Calcule le montant total du devis à partir du popup (total direct OU somme des lignes)
    const prix = item._prix;
    let proposedPrice = 0;
    if (prix?.totalOverride !== undefined) {
      proposedPrice = prix.totalOverride;
    } else if (prix?.itemPrices) {
      proposedPrice = (item.items ?? []).reduce((acc, it) => {
        const p = prix.itemPrices!.find((x) => x.designation === it.designation);
        return acc + it.quantite * (p?.unitPrice ?? 0);
      }, 0);
    }
    await fetch(`/api/quotes/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VALIDE', proposedPrice }),
    });
    await fetchAll(true);
    setSelected(null);
  };

  const handleSaveNew = async (item: any) => {
    const result = await submitNewRequest(item);
    if (!result.ok) {
      alert(result.error ?? 'Erreur lors de la création');
      return;
    }
    await fetchAll(true);
    setActiveTab(result.type === 'Commande' ? 'commandes' : 'devis');
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

  // ── Résumé des filtres actifs, affiché à côté du titre ──────────────────────
  const assigneLabel = filterAssigne === 'all' ? 'Tous les responsables'
    : filterAssigne === 'none' ? 'Non assigné'
    : users.find((u) => u.id === filterAssigne)?.name ?? 'Responsable';
  const activeFilters = [
    filterStatut === 'all' ? 'Tous les statuts' : filterStatut,
    PERIODE_LABEL[filterPeriode] ?? filterPeriode,
    assigneLabel,
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Titre + boutons export/création en haut à droite */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[22px] font-bold text-[#0F172A]">Commandes</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">
            {loading ? 'Chargement…' : `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportVentesExcel(activeFilters.join(' | '))}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors"
            title="Rapport de ventes — commandes livrées">
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M12 18v-6M9 15l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Rapport
          </button>
          <button
            onClick={() => {
              const label = activeTab === 'devis' ? 'Devis' : activeTab === 'commandes' ? 'Commandes' : 'Demandes';
              exportTableauExcel(filtered, `PSI_${label}`, label, activeFilters.join(' | '));
            }}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC] transition-colors"
            title="Exporter le tableau filtré en Excel">
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Exporter
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl text-[13px] font-bold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors whitespace-nowrap">
            + Nouveau
          </button>
        </div>
      </div>

      {/* Tabs — pleine largeur sur MOBILE, compact (auto) sur web */}
      <div className="flex gap-1 p-1 rounded-2xl mb-3 w-full md:w-fit" style={{ background: '#EEF2F7' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const pendingCount = tab.key === 'commandes' ? attente.commandes : tab.key === 'devis' ? attente.devis : attente.commandes + attente.devis;
          const pendingColor = tab.key === 'commandes' ? '#4CAF4F' : tab.key === 'devis' ? '#3B82F6' : '#F97316';
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key as typeof activeTab); setFilterStatut('all'); setSearch(''); setFilterPeriode('mois'); }}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-2 md:px-5 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: isActive ? '#fff' : 'transparent', color: isActive ? '#0F172A' : '#94A3B8', boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
              {tab.label}
              {/* Zone compteur+point à largeur fixe → tous les onglets restent identiques */}
              <span className="inline-flex items-center gap-1 min-w-[22px] justify-center">
                <span className="text-[11px] font-bold tabular-nums" style={{ color: pendingCount > 0 ? pendingColor : (isActive ? '#4CAF4F' : '#CBD5E1') }}>
                  {pendingCount > 0 ? pendingCount : tab.count}
                </span>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pendingCount > 0 ? pendingColor : 'transparent' }} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Recherche seule sur sa ligne, puis les 3 filtres sur la ligne d'en dessous */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
        {/* Recherche — pleine largeur sur sa propre ligne (mobile) */}
        <div className="relative w-full md:w-[220px] md:flex-shrink-0">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width={13} height={13} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="px-2 py-2 pl-7 w-full rounded-lg border border-[#E2E8F0] text-[13px] text-[#0F172A] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors" />
        </div>
        {/* Les 3 filtres — sur une même ligne */}
        <div className="flex items-center gap-2 min-w-0">
          <AdminSelect
            className="flex-1 min-w-0"
            value={filterStatut}
            onChange={setFilterStatut}
            options={[{ value: 'all', label: 'Statut' }, ...allStatuts.map((s) => ({ value: s, label: s }))]}
          />
          <AdminSelect
            className="flex-1 min-w-0"
            value={filterPeriode}
            onChange={setFilterPeriode}
            options={[
              { value: '7j',    label: '7 derniers jours' },
              { value: '2sem',  label: '2 dernières semaines' },
              { value: '3sem',  label: '3 dernières semaines' },
              { value: 'mois',  label: 'Ce mois' },
              { value: '3mois', label: '3 derniers mois' },
              { value: '6mois', label: '6 derniers mois' },
              { value: 'annee', label: 'Cette année' },
              { value: 'tout',  label: 'Tout afficher' },
            ]}
          />
          <AdminSelect
            className="flex-1 min-w-0"
            value={filterAssigne}
            onChange={setFilterAssigne}
            options={[
              { value: 'all',  label: 'Responsable' },
              { value: 'none', label: 'Non assigné' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
        {(search || filterStatut !== 'all' || filterPeriode !== 'mois' || filterAssigne !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterStatut('all'); setFilterPeriode('mois'); setFilterAssigne('all'); }} className="text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151] self-start md:self-auto">Effacer</button>
        )}
      </div>

      <div className="rounded-2xl border-2 border-[#E2E8F0] overflow-x-auto shadow-sm bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full min-w-[720px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['N°', 'Type', 'Source', 'Entreprise', 'Client', 'Responsable', 'Date', 'Statut'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Aucune demande trouvée</td></tr>
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
                    <span className="whitespace-nowrap" style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `2px solid ${isCommande ? '#4CAF4F' : '#8B5CF6'}`, background: isCommande ? '#F0FDF4' : '#F5F3FF', color: isCommande ? '#166534' : '#5B21B6' }}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap"
                      style={{ background: srcCfg.bg, color: srcCfg.color, borderColor: srcCfg.border }}>
                      {getSourceLabel(src)}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-[13px] font-semibold ${isArchived ? 'text-[#ABBED1]' : 'text-[#0F172A]'}`}>{row.entreprise}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[#8A9BB5]">{row.client}</td>
                  <td className="px-5 py-3.5 text-[13px]">
                    {row.assignedToName
                      ? <span className="text-[#374151] font-medium">{row.assignedToName}</span>
                      : <span className="text-[#CBD5E1] italic">—</span>}
                  </td>
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
          onConfirmQuoteWithPrice={selected.type === 'Devis' ? handleConfirmQuoteWithPrice : undefined}
          users={users}
          onAssign={handleAssign}
        />
      )}
      {showCreate && (
        <CreateForm
          defaultType={isDevis ? 'Devis' : 'Commande'}
          onClose={() => setShowCreate(false)}
          onSave={handleSaveNew}
          users={users}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
