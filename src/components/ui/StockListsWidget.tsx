'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

// `product` : uniquement pour une matière partagée par plusieurs produits (cf.
// stock-traceability.ts::materialPurchaseLinks) — précise quel produit fabriqué est à
// l'origine de ce besoin de matière, et `quantity` est alors déjà converti en unités de
// matière (ratio de recette × manquant produit), jamais le manquant produit brut.
interface LinkedRef { quantity: number; order?: LinkedParent; quote?: LinkedParent; blocked?: boolean; product?: { reference: string; name: string | null } }
interface LinkedParent { ref: string | null; clientName: string | null; clientCompany: string | null; client: { name: string; company: string | null } | null }
// Part du besoin d'une matière qui vient du buffer d'un produit fabriqué en aval (pas d'une
// commande client) — cf. stock-traceability.ts::materialPurchaseLinks.
interface BufferSource { productId: string; reference: string; name: string | null; quantity: number }

interface PurchaseItem {
  id: string; neededQuantity: number; bufferQuantity: number; manualQuantity: number; orderedQuantity: number | null; receivedQuantity: number | null;
  status: 'A_COMMANDER' | 'COMMANDE' | 'RECU'; auto: boolean;
  product: { id: string; reference: string; name: string | null; available: number; purchaseThreshold: number } | null;
  rawMaterial: { id: string; reference: string; name: string; unit: string; available: number; purchaseThreshold: number } | null;
  orderItems: LinkedRef[]; quoteItems: LinkedRef[]; bufferSources?: BufferSource[];
}
interface ProductionItem {
  id: string; neededQuantity: number; bufferQuantity: number; manualQuantity: number; producedQuantity: number | null;
  status: 'A_PRODUIRE' | 'BLOQUE' | 'EN_COURS' | 'PRODUIT'; auto: boolean;
  product: { id: string; reference: string; name: string | null; mode: string; available: number; productionThreshold: number };
  orderItems: LinkedRef[]; quoteItems: LinkedRef[];
}
interface UrgentNeed { productId: string; reference: string; name: string | null; quantity: number }

// Sous-titre de la carte : gravité décroissante — stock à 0 (urgent), puis simple passage
// sous le seuil de réassort, puis ajout manuel, sinon commande client (besoin réel, ni
// urgent ni sous le seuil). Le blocage matière première ne s'affiche plus qu'au niveau de
// chaque commande (cf. "Commandes concernées"), jamais ici.
// "Ajouté manuellement" ne doit être décidé QUE par manualQuantity > 0 (la vraie trace d'un
// ajout à la main, cf. POST /api/purchase-list|production-list) — jamais par élimination
// (ni urgent, ni sous le seuil, ni buffer) : une ligne 100% générée par une vraie commande
// client, dont le stock reste au-dessus du seuil, tombait à tort dans ce cas par défaut.
// `isMaterial` : une matière première n'a jamais de commande client directe — son besoin
// vient TOUJOURS d'un ou plusieurs produits (besoin réel cascadé et/ou leur buffer, cf.
// resyncMaterialPurchaseNeed) — jamais "Commande client" (qui n'a de sens que pour un
// produit acheté, directement commandé par un client).
function severitySubtitle(opts: { urgent: boolean; belowThreshold: boolean; auto: boolean; manual: boolean; isMaterial?: boolean }) {
  if (opts.urgent) return 'Stock insuffisant';
  if (opts.belowThreshold || opts.auto) return 'Stock sous le seuil de réassort';
  if (opts.manual) return 'Ajouté manuellement';
  return opts.isMaterial ? 'Réassort préventif produits' : 'Commande client';
}

// Total affiché/à traiter pour une ligne : besoin réel + rattrapage préventif éventuel.
function totalQty(item: { neededQuantity: number; bufferQuantity: number }) {
  return item.neededQuantity + item.bufferQuantity;
}

// Une commande/devis lié à une ligne de liste → réf à gauche, client + quantité à droite.
function linkedParts(link: LinkedRef) {
  const parent = link.order ?? link.quote;
  const ref = parent?.ref ?? '—';
  // Snapshot (société POUR QUI la commande a été passée) prioritaire sur le client lié
  // actuel — même règle que partout ailleurs dans l'app (cf. request-detail.ts) : le client
  // lié (`clientId`) peut être réassigné/corrigé après coup, ça ne doit jamais faire
  // apparaître une autre société que celle de la commande d'origine.
  const client = parent?.clientCompany || parent?.client?.company || parent?.clientName || parent?.client?.name || 'Client';
  // `product` n'est présent que pour une matière partagée par plusieurs produits (cf.
  // materialPurchaseLinks) — précise quel produit fabriqué motive ce besoin de matière.
  const product = link.product ? `${link.product.reference}${link.product.name ? ` — ${link.product.name}` : ''}` : null;
  return { ref, client, qty: link.quantity, product };
}

// "Commandes concernées" : les vraies commandes/devis liés, PLUS des lignes à part pour ce qui
// n'appartient à aucune commande précise — le rattrapage préventif PROPRE (buffer), ce qui a
// été ajouté à la main (manualQuantity, persistant, cf. order-stock.ts), et — pour une matière
// première seulement — la part qui vient du rattrapage préventif d'un produit fabriqué en aval
// (bufferSources, cf. resyncMaterialPurchaseNeed/stock-traceability.ts) — pour que le total
// affiché sur la carte (needed+buffer) soit entièrement traçable, pas seulement sa part "commandes".
function LinkedOrdersList({ linked, unit, bufferQuantity, manualQuantity, bufferSources }: { linked: LinkedRef[]; unit?: string; bufferQuantity?: number; manualQuantity?: number; bufferSources?: BufferSource[] }) {
  const hasBuffer = (bufferQuantity ?? 0) > 0;
  const hasManual = (manualQuantity ?? 0) > 0;
  const sources = bufferSources ?? [];
  if (linked.length === 0 && !hasBuffer && !hasManual && sources.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-[#F0F4F8]">
      <p className="text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide mb-1.5">Commandes concernées</p>
      <div className="flex flex-col gap-1.5">
        {linked.map((lk, i) => {
          const { ref, client, qty, product } = linkedParts(lk);
          return (
            <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC]">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[12px] font-bold text-[#0F172A]">{ref}</span>
                {/* Produit affiché seulement pour une matière partagée par plusieurs produits
                    — sinon on sait déjà de quel produit il s'agit (la carte elle-même). */}
                {product && <span className="text-[11px] text-[#8A9BB5]">({product})</span>}
                {lk.blocked && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#92400E] uppercase tracking-wide">Bloqué</span>}
              </span>
              <span className="text-[12px] text-[#4F46E5]">
                {client} · <span className="font-bold text-[#0F172A]">{qty}{unit ? ` ${unit}` : ''}</span>
              </span>
            </div>
          );
        })}
        {hasManual && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC]">
            <span className="text-[12px] font-bold text-[#0F172A]">Ajouté manuellement</span>
            <span className="text-[12px] font-bold text-[#0F172A]">{manualQuantity}{unit ? ` ${unit}` : ''}</span>
          </div>
        )}
        {sources.map((s) => (
          <div key={s.productId} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC]">
            <span className="text-[12px] font-bold text-[#0F172A]">Réassort préventif ({s.reference}{s.name ? ` — ${s.name}` : ''})</span>
            <span className="text-[12px] font-bold text-[#0F172A]">{s.quantity}{unit ? ` ${unit}` : ''}</span>
          </div>
        ))}
        {hasBuffer && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC]">
            <span className="text-[12px] font-bold text-[#0F172A]">Réassort préventif (buffer)</span>
            <span className="text-[12px] font-bold text-[#0F172A]">{bufferQuantity}{unit ? ` ${unit}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
interface PickableProduct { id: string; reference: string; name: string | null; mode: string; }
interface PickableMaterial { id: string; reference: string; name: string; unit: string; }

function itemLabel(item: PurchaseItem) {
  return item.product ? { ref: item.product.reference, name: item.product.name ?? item.product.reference, unit: '' } : { ref: item.rawMaterial!.reference, name: item.rawMaterial!.name, unit: item.rawMaterial!.unit };
}

// ── Overlay : ajouter une ligne manuelle ────────────────────────────────────
function AddLineModal({ mode, products, materials, onClose, onSave }: {
  mode: 'achat' | 'production'; products: PickableProduct[]; materials: PickableMaterial[];
  onClose: () => void; onSave: (target: { productId?: string; rawMaterialId?: string }, qty: number) => Promise<void>;
}) {
  const [targetType, setTargetType] = useState<'product' | 'material'>('product');
  const [targetId, setTargetId] = useState('');
  const [qty, setQty] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = Number(qty);
    if (!targetId || !n || n <= 0 || saving) return;
    setSaving(true);
    try {
      await onSave(targetType === 'product' ? { productId: targetId } : { rawMaterialId: targetId }, n);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal title={mode === 'achat' ? "Ajouter à la liste d'achat" : 'Ajouter à la liste de production'} onClose={onClose}>
      <div className="space-y-4">
        {mode === 'achat' && (
          <div className="flex gap-2 p-1 rounded-lg bg-[#F1F5F9]">
            <button onClick={() => { setTargetType('product'); setTargetId(''); }} className={`flex-1 py-1.5 rounded-md text-[12px] font-bold ${targetType === 'product' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Produit fini</button>
            <button onClick={() => { setTargetType('material'); setTargetId(''); }} className={`flex-1 py-1.5 rounded-md text-[12px] font-bold ${targetType === 'material' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Matière première</button>
          </div>
        )}
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Référence</label>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
            <option value="">Choisir une référence</option>
            {targetType === 'product'
              ? products.map((p) => <option key={p.id} value={p.id}>{p.reference} — {p.name ?? p.reference}</option>)
              : materials.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Quantité</label>
          <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="ex: 50" className={inputClass} />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={submit} disabled={saving || !targetId || !qty.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Overlay : action groupée (Commander / Valider réception / Produire) ────
function BulkActionModal({ title, candidates, onClose, onConfirm }: {
  title: string; candidates: { id: string; label: string; suggested: number; unit: string; max?: number }[];
  onClose: () => void; onConfirm: (selections: { id: string; quantity: number }[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const maxById = new Map(candidates.map((c) => [c.id, c.max]));

  const toggle = (id: string, suggested: number) =>
    setSelected((s) => { const n = { ...s }; if (id in n) delete n[id]; else n[id] = String(suggested); return n; });
  // Bloque la saisie au-delà du max autorisé pour cette ligne (ex: restant à recevoir) — le
  // serveur revalide de toute façon, mais autant ne pas laisser taper une valeur refusée.
  const setQty = (id: string, v: string) => {
    const max = maxById.get(id);
    const n = Number(v);
    const clamped = max !== undefined && v !== '' && !Number.isNaN(n) && n > max ? String(max) : v;
    setSelected((s) => ({ ...s, [id]: clamped }));
  };

  const submit = async () => {
    const selections = Object.entries(selected).filter(([, v]) => Number(v) > 0).map(([id, v]) => ({ id, quantity: Number(v) }));
    if (selections.length === 0 || saving) return;
    setSaving(true);
    try { await onConfirm(selections); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {candidates.length === 0 && <p className="text-[13px] text-[#8A9BB5] text-center py-6">Aucune ligne disponible pour cette action.</p>}
        {candidates.map((c) => {
          const isSelected = c.id in selected;
          return (
            <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isSelected ? 'border-[#4CAF4F] bg-[#F0FDF4]' : 'border-[#E2E8F0]'}`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(c.id, c.suggested)} className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-[13px] font-semibold text-[#0F172A]">{c.label}</span>
              {isSelected && (
                <input value={selected[c.id]} onChange={(e) => setQty(c.id, e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" style={{ width: 80 }} className={inputClass} />
              )}
              <span className="text-[11px] text-[#8A9BB5] w-10 flex-shrink-0">{c.unit}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 pt-4">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
        <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
          {saving ? 'Enregistrement…' : 'Valider'}
        </button>
      </div>
    </Modal>
  );
}

export function StockListsWidget() {
  const [mode, setMode] = useState<'achat' | 'production'>('achat');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [urgentNeeds, setUrgentNeeds] = useState<UrgentNeed[]>([]);
  const [products, setProducts] = useState<PickableProduct[]>([]);
  const [materials, setMaterials] = useState<PickableMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [bulkAction, setBulkAction] = useState<'order' | 'receive' | 'produce' | null>(null);

  // `silent` évite le flash "Chargement…" pour les rafraîchissements en arrière-plan
  // (polling, retour sur l'onglet) — seul le premier chargement doit bloquer l'affichage.
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [purRes, prodListRes, urgentRes, prodRes, matRes] = await Promise.all([
        fetch('/api/purchase-list'), fetch('/api/production-list'), fetch('/api/production-list/urgent'), fetch('/api/stock/products'), fetch('/api/raw-materials'),
      ]);
      if (purRes.ok) setPurchaseItems(await purRes.json());
      if (prodListRes.ok) setProductionItems(await prodListRes.json());
      if (urgentRes.ok) setUrgentNeeds(await urgentRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (matRes.ok) setMaterials(await matRes.json());
    } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Le besoin peut changer AILLEURS pendant que ce widget reste ouvert (une commande
  // confirmée/annulée sur un autre écran, par un autre utilisateur...) — sans ça, le total
  // affiché reste figé jusqu'au prochain rechargement complet de la page. On rafraîchit donc
  // en arrière-plan à intervalle régulier, et immédiatement quand l'onglet redevient actif.
  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), 20000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll(true); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [fetchAll]);

  const purchasableProducts = products.filter((p) => p.mode === 'ACHETE' || p.mode === 'LES_DEUX');
  const producibleProducts = products.filter((p) => p.mode === 'FABRIQUE' || p.mode === 'LES_DEUX');

  const addLine = async (target: { productId?: string; rawMaterialId?: string }, qty: number) => {
    const url = mode === 'achat' ? '/api/purchase-list' : '/api/production-list';
    const body = mode === 'achat' ? { ...target, neededQuantity: qty } : { productId: target.productId, neededQuantity: qty };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? "Échec de l'ajout"); return; }
    await fetchAll();
  };

  const runBulk = async (selections: { id: string; quantity: number }[]) => {
    // On garde une trace de chaque échec (ex: matière première insuffisante — disponible +
    // réservé ne suffisent pas — cf. PATCH /api/production-list/[id]) pour l'afficher : sans
    // ça, une ligne qui échoue silencieusement donne l'impression que rien ne s'est passé,
    // alors que l'API renvoie déjà le détail de ce qui manque.
    const failures: string[] = [];
    const labelFor = (id: string) => {
      const item = productionItems.find((i) => i.id === id) ?? purchaseItems.find((i) => i.id === id);
      if (!item) return id;
      return 'product' in item && item.product ? (item.product.name ?? item.product.reference) : itemLabel(item as PurchaseItem).name;
    };

    if (bulkAction === 'order' || bulkAction === 'receive') {
      await Promise.all(selections.map(async (s) => {
        const res = await fetch(`/api/purchase-list/${s.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: bulkAction, quantity: s.quantity }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failures.push(`${labelFor(s.id)} : ${err.error ?? 'échec'}`);
        }
      }));
    } else if (bulkAction === 'produce') {
      await Promise.all(selections.map(async (s) => {
        const res = await fetch(`/api/production-list/${s.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: s.quantity }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failures.push(`${labelFor(s.id)} : ${err.error ?? 'échec'}`);
        }
      }));
    }
    await fetchAll();
    if (failures.length > 0) alert(failures.join('\n\n'));
  };

  const bulkCandidates = bulkAction === 'order'
    // Inclut aussi les lignes déjà "Commandé" tant qu'il leur reste un manquant (nouveau
    // besoin apparu depuis, ou commande fournisseur fractionnée) — pas seulement "À commander".
    ? purchaseItems.filter((i) => (i.status === 'A_COMMANDER' || i.status === 'COMMANDE') && totalQty(i) > 0).map((i) => { const l = itemLabel(i); return { id: i.id, label: `${l.ref} — ${l.name} (${totalQty(i)} manquant${i.status === 'COMMANDE' ? ', déjà commandé en partie' : ''})`, suggested: totalQty(i), max: totalQty(i), unit: l.unit }; })
    : bulkAction === 'receive'
    // Exclut les lignes déjà entièrement reçues (rien de plus à réceptionner dessus), et la
    // quantité suggérée/max est le restant RÉELLEMENT commandé non encore reçu — jamais tout
    // l'`orderedQuantity` d'un coup si une réception partielle a déjà eu lieu avant (cf. la
    // même contrainte, appliquée côté serveur, dans PATCH /api/purchase-list/[id]).
    ? purchaseItems.filter((i) => i.status === 'COMMANDE' && (i.orderedQuantity ?? 0) - (i.receivedQuantity ?? 0) > 0)
        .map((i) => {
          const l = itemLabel(i);
          const remaining = (i.orderedQuantity ?? 0) - (i.receivedQuantity ?? 0);
          return { id: i.id, label: `${l.ref} — ${l.name} (${remaining} restant sur ${i.orderedQuantity} commandé)`, suggested: remaining, max: remaining, unit: l.unit };
        })
    : bulkAction === 'produce'
    ? productionItems.filter((i) => i.status !== 'PRODUIT').map((i) => ({ id: i.id, label: `${i.product.reference} — ${i.product.name ?? i.product.reference} (${totalQty(i)} à produire)`, suggested: totalQty(i), unit: '' }))
    : [];

  const bulkTitle = bulkAction === 'order' ? 'Commander' : bulkAction === 'receive' ? 'Valider réception' : 'Marquer fabriquée';

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-[14px] font-bold text-[#0F172A]">{mode === 'achat' ? "Liste d'achat" : 'Liste de production'}</h3>
        <div className="flex gap-2 p-1 rounded-lg bg-[#F1F5F9]">
          <button onClick={() => setMode('achat')} className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${mode === 'achat' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Liste d&apos;achat</button>
          <button onClick={() => setMode('production')} className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${mode === 'production' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Liste de production</button>
        </div>
      </div>

      <button onClick={() => setShowAdd(true)} className="mb-4 self-start px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-bold text-[#374151] hover:bg-[#F8FAFC] transition-colors">
        + Ajouter ligne
      </button>

      <div className="flex-1 overflow-y-auto max-h-[360px] flex flex-col gap-3 pr-1">
        {/* Placée en haut de la liste de production — carte neutre comme les autres, seuls
            les statuts ("Prioritaire", la quantité) restent en rouge. Une ombre portée la
            distingue légèrement du reste de la liste sans recolorer toute la carte. */}
        {!loading && mode === 'production' && urgentNeeds.length > 0 && (
          <div className="rounded-xl border border-[#E2E8F0] shadow-md p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#DC2626] text-white uppercase tracking-wide">Prioritaire</span>
              <p className="text-[13px] font-bold text-[#0F172A]">Production urgente</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {urgentNeeds.map((n) => (
                <div key={n.productId} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC]">
                  <span className="text-[12px] font-bold text-[#0F172A] truncate">{n.name ?? n.reference}</span>
                  <span className="text-[13px] font-bold text-[#DC2626] tabular-nums flex-shrink-0">{n.quantity} à produire</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <p className="text-[12px] text-[#8A9BB5] text-center py-8">Chargement…</p>
        ) : mode === 'achat' ? (
          purchaseItems.length === 0 ? (
            <p className="text-[13px] text-[#8A9BB5] text-center py-8">Rien à acheter pour l&apos;instant.</p>
          ) : purchaseItems.map((item) => {
            const l = itemLabel(item);
            const total = totalQty(item); // ce qui manque ENCORE (diminue à chaque réception)
            const received = item.receivedQuantity ?? 0;
            const ordered = item.orderedQuantity ?? 0;
            const target = received + total; // objectif d'origine reconstitué (reçu + encore manquant)
            // La barre avance dès la commande (pas seulement à la réception) : elle reflète
            // le plus avancé des deux (commandé = sécurisé, reçu = physiquement en stock).
            const pct = target > 0 ? Math.min(100, (Math.max(ordered, received) / target) * 100) : 0;
            const available = item.product?.available ?? item.rawMaterial?.available ?? 0;
            // "Urgent" ne veut rien dire s'il ne manque plus rien du tout (ex: une carte
            // "Commandé" qui attend juste sa réception, besoin+buffer déjà à 0) — sinon le
            // badge reste affiché à tort indéfiniment tant que la matière n'est pas livrée.
            const urgent = total > 0 && available <= 0;
            const linked = [...item.orderItems, ...item.quoteItems];
            const threshold = item.product?.purchaseThreshold ?? item.rawMaterial?.purchaseThreshold ?? 0;
            const subtitle = total <= 0
              ? 'En attente de réception'
              : severitySubtitle({ urgent, belowThreshold: available < threshold, auto: item.auto, manual: item.manualQuantity > 0, isMaterial: !!item.rawMaterial });
            return (
              <div key={item.id} className="rounded-xl border border-[#E2E8F0] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] font-bold text-[#4F46E5]">{l.ref}</p>
                      {urgent && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#DC2626] uppercase tracking-wide">Urgent</span>}
                    </div>
                    <p className="text-[13px] font-bold text-[#0F172A] truncate">{l.name}</p>
                    <p className="text-[11px] text-[#8A9BB5] italic mt-0.5">{subtitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-bold text-[#EF4444] tabular-nums">{total}</p>
                    <p className="text-[10px] text-[#8A9BB5]">{l.unit || 'unité'} manquant{total !== 1 ? 's' : ''}</p>
                    {received > 0 && (
                      <p className="text-[12px] font-bold text-[#166534] tabular-nums mt-1">{received} reçu{received !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[#F0F4F8] mt-2 overflow-hidden">
                  <div className="h-full bg-[#4CAF4F] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[13px] font-semibold text-[#374151] mt-1.5">
                  {item.status === 'A_COMMANDER' && `0 commandé · 0 reçu / ${target} au total`}
                  {item.status === 'COMMANDE' && `${item.orderedQuantity} commandé · ${received} reçu / ${target} au total`}
                </p>
                <LinkedOrdersList linked={linked} unit={l.unit} bufferQuantity={item.bufferQuantity} manualQuantity={item.manualQuantity} bufferSources={item.bufferSources} />
              </div>
            );
          })
        ) : (
          productionItems.length === 0 ? (
            <p className="text-[13px] text-[#8A9BB5] text-center py-8">Rien à produire pour l&apos;instant.</p>
          ) : productionItems.map((item) => {
            const total = totalQty(item); // ce qui reste ENCORE à produire (diminue à chaque fabrication)
            const produced = item.producedQuantity ?? 0;
            const target = produced + total; // objectif d'origine reconstitué (produit + encore à produire)
            const pct = target > 0 ? Math.min(100, (produced / target) * 100) : 0;
            const urgent = total > 0 && item.product.available <= 0;
            const linked = [...item.orderItems, ...item.quoteItems];
            // Le statut "Bloqué" ne s'affiche plus au niveau de la carte (badge, sous-titre,
            // ligne de statut) — il ne reste visible que par commande, dans "Commandes
            // concernées" (badge précis calculé par simulation FIFO, cf. stock-traceability.ts).
            const subtitle = severitySubtitle({
              urgent,
              belowThreshold: item.product.available < item.product.productionThreshold,
              auto: item.auto,
              manual: item.manualQuantity > 0,
            });
            return (
              <div key={item.id} className="rounded-xl border border-[#E2E8F0] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] font-bold text-[#4F46E5]">{item.product.reference}</p>
                      {urgent && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#DC2626] uppercase tracking-wide">Urgent</span>}
                    </div>
                    <p className="text-[13px] font-bold text-[#0F172A] truncate">{item.product.name ?? item.product.reference}</p>
                    <p className="text-[11px] text-[#8A9BB5] italic mt-0.5">{subtitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-bold text-[#EF4444] tabular-nums">{total}</p>
                    <p className="text-[10px] text-[#8A9BB5]">à produire</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[#F0F4F8] mt-2 overflow-hidden">
                  <div className="h-full bg-[#4CAF4F] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[13px] font-semibold text-[#374151] mt-1.5">
                  {produced} produit / {target} au total
                </p>
                <LinkedOrdersList linked={linked} bufferQuantity={item.bufferQuantity} manualQuantity={item.manualQuantity} />
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 pt-4 mt-2 border-t border-[#F0F4F8]">
        {mode === 'achat' ? (
          <>
            <button onClick={() => setBulkAction('order')} className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>Commander</button>
            <button onClick={() => setBulkAction('receive')} className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold border border-[#4CAF4F] text-[#166534] hover:bg-[#F0FDF4] transition-colors">Valider réception</button>
          </>
        ) : (
          <button onClick={() => setBulkAction('produce')} className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>Produire</button>
        )}
      </div>

      {showAdd && (
        <AddLineModal mode={mode} products={mode === 'achat' ? purchasableProducts : producibleProducts} materials={materials}
          onClose={() => setShowAdd(false)} onSave={addLine} />
      )}
      {bulkAction && (
        <BulkActionModal title={bulkTitle} candidates={bulkCandidates} onClose={() => setBulkAction(null)} onConfirm={runBulk} />
      )}
    </div>
  );
}
