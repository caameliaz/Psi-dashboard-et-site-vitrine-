'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { RecipeEntryModal, NoRecipeChoiceModal } from './NoRecipeModal';

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
  // `product` null pour une ligne LIBRE (texte tapé à la main sur une commande/devis, sans
  // fiche produit) — `description` porte alors son libellé (cf. schema.prisma ProductionListItem).
  product: { id: string; reference: string; name: string | null; mode: string; available: number; productionThreshold: number } | null;
  description: string | null;
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
  const [open, setOpen] = useState(false);
  const hasBuffer = (bufferQuantity ?? 0) > 0;
  const hasManual = (manualQuantity ?? 0) > 0;
  const sources = bufferSources ?? [];
  const count = linked.length + (hasManual ? 1 : 0) + sources.length + (hasBuffer ? 1 : 0);
  if (count === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-[#F0F4F8]">
      {/* Repliée par défaut — prend trop de place dépliée d'office sur mobile,
          surtout avec plusieurs lignes liées. */}
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-full flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide">Commandes concernées ({count})</span>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" stroke="#8A9BB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
      <div className="flex flex-col gap-1.5 mt-1.5">
        {linked.map((lk, i) => {
          const { ref, client, qty, product } = linkedParts(lk);
          return (
            <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC]">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[12px] font-bold text-[#0F172A]">{ref}</span>
                {/* Produit affiché seulement pour une matière partagée par plusieurs produits
                    — sinon on sait déjà de quel produit il s'agit (la carte elle-même). */}
                {product && <span className="text-[11px] text-[#8A9BB5]">({product})</span>}
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
            <span className="text-[12px] font-bold text-[#0F172A]">Réassort préventif</span>
            <span className="text-[12px] font-bold text-[#0F172A]">{bufferQuantity}{unit ? ` ${unit}` : ''}</span>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
interface PickableProduct { id: string; reference: string; name: string | null; mode: string; }
interface PickableMaterial { id: string; reference: string; name: string; unit: string; }

// `name` reste `null` si le produit n'a pas de nom personnalisé (juste une référence) —
// affiché seul ensuite (jamais "REF — REF", qui n'apporte aucune info en plus).
// ProductionItem n'a jamais de rawMaterial (que des produits finis) — 'rawMaterial' in item
// sert de garde de type pour le distinguer de PurchaseItem, qui peut avoir l'un ou l'autre.
// Une ligne de PRODUCTION sans produit (`description` non nul) est une ligne LIBRE (texte tapé
// à la main sur une commande/devis, sans fiche produit) — son "libellé" est ce texte.
function itemLabel(item: PurchaseItem | ProductionItem) {
  if (item.product) return { ref: item.product.reference, name: item.product.name, unit: '' };
  if ('description' in item && item.description) return { ref: item.description, name: null, unit: '' };
  const rm = ('rawMaterial' in item ? item.rawMaterial : null)!;
  return { ref: rm.reference, name: rm.name, unit: rm.unit };
}

// Combine réf + nom en un seul libellé, sans répéter la référence si aucun nom n'est défini.
function refAndName(l: { ref: string; name: string | null }) {
  return l.name ? `${l.ref} — ${l.name}` : l.ref;
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
              ? products.map((p) => <option key={p.id} value={p.id}>{p.name || p.reference} ({p.reference})</option>)
              : materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.reference})</option>)}
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
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
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
  // Plein écran (mobile surtout — la carte est normalement contrainte en hauteur sur
  // la page Stock mobile, cf. src/app/admin/stock/mobile/page.tsx) : un bouton expand
  // la fait passer en overlay fixe qui couvre tout l'écran, un autre bouton la réduit.
  const [fullscreen, setFullscreen] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [urgentNeeds, setUrgentNeeds] = useState<UrgentNeed[]>([]);
  const [products, setProducts] = useState<PickableProduct[]>([]);
  const [materials, setMaterials] = useState<PickableMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [bulkAction, setBulkAction] = useState<'order' | 'receive' | 'produce' | null>(null);
  // Popup de confirmation affichée après une action groupée entièrement réussie (Commander /
  // Valider réception / Produire) — une ligne par sélection, avec sa quantité exacte.
  const [successResult, setSuccessResult] = useState<{ title: string; lines: string[] } | null>(null);
  // Ouvert quand "Produire" tombe sur un produit sans recette (409 "NO_RECIPE") et que
  // l'utilisateur a choisi de la saisir plutôt que de continuer sans elle — porte aussi la
  // file d'attente des sélections encore à traiter (traitées séquentiellement, pas en
  // parallèle, pour pouvoir s'arrêter sur chaque produit sans recette) et les listes de
  // résultats déjà accumulées, pour afficher un seul récapitulatif à la toute fin.
  type NoRecipeTarget = {
    // `productId` null pour une ligne LIBRE (sans fiche produit) — jamais de sauvegarde possible
    // dans ce cas (cf. RecipeEntryModal `allowSave`).
    current: { id: string; productId: string | null; reference: string; name: string | null; quantity: number };
    queueRest: { id: string; quantity: number }[];
    accumFailures: string[]; accumWarnings: string[]; accumSuccesses: string[];
  };
  // Overlay de premier choix (NoRecipeChoiceModal) : "Continuer" ou "Ajouter une recette".
  const [noRecipeChoice, setNoRecipeChoice] = useState<NoRecipeTarget | null>(null);
  // Overlay de saisie (RecipeEntryModal), ouvert seulement après "Ajouter une recette" — porte
  // aussi la file d'attente des sélections encore à traiter (traitées séquentiellement, pas en
  // parallèle, pour pouvoir s'arrêter sur chaque produit sans recette) et les listes de
  // résultats déjà accumulées, pour afficher un seul récapitulatif à la toute fin.
  const [recipeModal, setRecipeModal] = useState<NoRecipeTarget | null>(null);

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

  // Partagé entre les branches "Commander"/"Valider réception"/"Produire" ET le traitement pas
  // à pas de la file "Produire" (cf. processProduceQueue ci-dessous), qui doit pouvoir s'arrêter
  // sur un produit sans recette puis reprendre là où elle en était.
  const labelFor = (id: string) => {
    const item = productionItems.find((i) => i.id === id) ?? purchaseItems.find((i) => i.id === id);
    if (!item) return id;
    const l = itemLabel(item);
    return l.name ?? l.ref;
  };
  const unitFor = (id: string) => {
    const item = purchaseItems.find((i) => i.id === id);
    return item ? itemLabel(item).unit : '';
  };

  const finishBulk = async (title: string, failures: string[], warnings: string[], successes: string[]) => {
    await fetchAll();
    if (failures.length > 0) alert(failures.join('\n\n'));
    else if (warnings.length > 0) alert(warnings.join('\n\n'));
    else if (successes.length > 0) setSuccessResult({ title, lines: successes });
  };

  // "Produire" traité un par un (jamais en parallèle, contrairement à Commander/Valider
  // réception) : un produit sans recette (409 "NO_RECIPE") doit interrompre la file en cours
  // pour demander à l'utilisateur quoi faire, puis reprendre avec le reste une fois résolu.
  const processProduceQueue = async (queue: { id: string; quantity: number }[], failures: string[], warnings: string[], successes: string[]) => {
    for (let i = 0; i < queue.length; i++) {
      const s = queue[i];
      const res = await fetch(`/api/production-list/${s.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: s.quantity }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.warning) warnings.push(data.warning);
        successes.push(`${labelFor(s.id)} — ${s.quantity} unité(s) produite(s) avec succès`);
        continue;
      }
      const err = await res.json().catch(() => ({}));
      if (err?.error === 'NO_RECIPE') {
        // Ouvre l'overlay de premier choix (Continuer / Ajouter une recette) ; le reste de la
        // file reprend depuis handleContinueWithoutRecipe/handleOpenRecipeEntry une fois cette
        // décision prise (jamais en parallèle — un produit sans recette à la fois).
        setNoRecipeChoice({
          current: { id: s.id, productId: err.productId, reference: err.reference, name: err.name, quantity: s.quantity },
          queueRest: queue.slice(i + 1),
          accumFailures: failures, accumWarnings: warnings, accumSuccesses: successes,
        });
        return;
      }
      failures.push(`${labelFor(s.id)} : ${err.error ?? 'échec'}`);
    }
    await finishBulk('Marquer fabriquée', failures, warnings, successes);
  };

  // "Continuer" sur l'overlay de premier choix : produit sans vérifier/consommer de matière,
  // puis reprend la file là où elle en était.
  const handleContinueWithoutRecipe = async () => {
    if (!noRecipeChoice) return;
    const { current, queueRest, accumFailures, accumWarnings, accumSuccesses } = noRecipeChoice;
    setNoRecipeChoice(null);
    const retry = await fetch(`/api/production-list/${current.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: current.quantity, allowNoRecipe: true }),
    });
    if (retry.ok) {
      const data = await retry.json().catch(() => ({}));
      if (data?.warning) accumWarnings.push(data.warning);
      accumSuccesses.push(`${labelFor(current.id)} — ${current.quantity} unité(s) produite(s) avec succès`);
    } else {
      const e2 = await retry.json().catch(() => ({}));
      accumFailures.push(`${labelFor(current.id)} : ${e2.error ?? 'échec'}`);
    }
    await processProduceQueue(queueRest, accumFailures, accumWarnings, accumSuccesses);
  };

  // "Ajouter une recette" sur l'overlay de premier choix : ouvre l'overlay de saisie.
  const handleOpenRecipeEntry = () => {
    if (!noRecipeChoice) return;
    setRecipeModal(noRecipeChoice);
    setNoRecipeChoice(null);
  };

  // Fermeture (croix/clic extérieur) de l'overlay de premier choix, sans avoir choisi — traité
  // comme un abandon de cette production précise, la file reprend avec le reste.
  const handleNoRecipeChoiceClose = () => {
    if (!noRecipeChoice) return;
    const { current, queueRest, accumFailures, accumWarnings, accumSuccesses } = noRecipeChoice;
    accumFailures.push(`${labelFor(current.id)} : décision non prise, production annulée`);
    setNoRecipeChoice(null);
    processProduceQueue(queueRest, accumFailures, accumWarnings, accumSuccesses);
  };

  const handleRecipeSubmit = async (items: { rawMaterialId: string; quantity: number }[], saveRecipe: boolean) => {
    if (!recipeModal) return;
    const { current, queueRest, accumFailures, accumWarnings, accumSuccesses } = recipeModal;
    const res = await fetch(`/api/production-list/${current.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: current.quantity, recipeOverride: items, saveRecipe }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.warning) accumWarnings.push(data.warning);
      accumSuccesses.push(`${labelFor(current.id)} — ${current.quantity} unité(s) produite(s) avec succès`);
    } else {
      const err = await res.json().catch(() => ({}));
      accumFailures.push(`${labelFor(current.id)} : ${err.error ?? 'échec'}`);
    }
    setRecipeModal(null);
    await processProduceQueue(queueRest, accumFailures, accumWarnings, accumSuccesses);
  };

  const handleRecipeCancel = () => {
    if (!recipeModal) return;
    const { current, queueRest, accumFailures, accumWarnings, accumSuccesses } = recipeModal;
    accumFailures.push(`${labelFor(current.id)} : recette non saisie, production annulée`);
    setRecipeModal(null);
    processProduceQueue(queueRest, accumFailures, accumWarnings, accumSuccesses);
  };

  const runBulk = async (selections: { id: string; quantity: number }[]) => {
    // On garde une trace de chaque échec (ex: matière première insuffisante — disponible +
    // réservé ne suffisent pas — cf. PATCH /api/production-list/[id]) pour l'afficher : sans
    // ça, une ligne qui échoue silencieusement donne l'impression que rien ne s'est passé,
    // alors que l'API renvoie déjà le détail de ce qui manque.
    const failures: string[] = [];
    // Avertissements sur une action RÉUSSIE (ex: "Marquer fabriquée" sans recette, continuée
    // explicitement sans elle) — pas un échec, juste à signaler après coup.
    const warnings: string[] = [];
    // Une ligne de confirmation par succès (quantité + unité) — affichée dans une popup dédiée
    // une fois l'action terminée, pour ne jamais laisser l'utilisateur dans le doute sur ce qui
    // a réellement été enregistré.
    const successes: string[] = [];
    const verbFor = (action: 'order' | 'receive') => action === 'order' ? 'commandée(s)' : 'reçue(s)';

    if (bulkAction === 'order' || bulkAction === 'receive') {
      await Promise.all(selections.map(async (s) => {
        const res = await fetch(`/api/purchase-list/${s.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: bulkAction, quantity: s.quantity }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failures.push(`${labelFor(s.id)} : ${err.error ?? 'échec'}`);
        } else {
          successes.push(`${labelFor(s.id)} — ${s.quantity} ${unitFor(s.id) || 'unité(s)'} ${verbFor(bulkAction)} avec succès`);
        }
      }));
      await finishBulk(bulkTitle, failures, warnings, successes);
    } else if (bulkAction === 'produce') {
      await processProduceQueue(selections, failures, warnings, successes);
    }
  };

  const bulkCandidates = bulkAction === 'order'
    // Inclut aussi les lignes déjà "Commandé" tant qu'il leur reste un manquant (nouveau
    // besoin apparu depuis, ou commande fournisseur fractionnée) — pas seulement "À commander".
    ? purchaseItems.filter((i) => (i.status === 'A_COMMANDER' || i.status === 'COMMANDE') && totalQty(i) > 0).map((i) => { const l = itemLabel(i); return { id: i.id, label: `${refAndName(l)} (${totalQty(i)} manquant${i.status === 'COMMANDE' ? ', déjà commandé en partie' : ''})`, suggested: totalQty(i), max: totalQty(i), unit: l.unit }; })
    : bulkAction === 'receive'
    // Exclut les lignes déjà entièrement reçues (rien de plus à réceptionner dessus), et la
    // quantité suggérée/max est le restant RÉELLEMENT commandé non encore reçu — jamais tout
    // l'`orderedQuantity` d'un coup si une réception partielle a déjà eu lieu avant (cf. la
    // même contrainte, appliquée côté serveur, dans PATCH /api/purchase-list/[id]).
    ? purchaseItems.filter((i) => i.status === 'COMMANDE' && (i.orderedQuantity ?? 0) - (i.receivedQuantity ?? 0) > 0)
        .map((i) => {
          const l = itemLabel(i);
          const remaining = (i.orderedQuantity ?? 0) - (i.receivedQuantity ?? 0);
          return { id: i.id, label: `${refAndName(l)} (${remaining} restant sur ${i.orderedQuantity} commandé)`, suggested: remaining, max: remaining, unit: l.unit };
        })
    : bulkAction === 'produce'
    ? productionItems.filter((i) => i.status !== 'PRODUIT').map((i) => { const l = itemLabel(i); return { id: i.id, label: `${refAndName(l)} (${totalQty(i)} à produire)`, suggested: totalQty(i), unit: '' }; })
    : [];

  const bulkTitle = bulkAction === 'order' ? 'Commander' : bulkAction === 'receive' ? 'Valider réception' : 'Marquer fabriquée';

  return (
    <div className={fullscreen
      ? 'fixed inset-0 z-[300] bg-white p-5 flex flex-col'
      : 'bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 h-full flex flex-col'
    }>
      {/* Titre retiré : le toggle seul suffit à indiquer la liste active, gagne de la
          place verticale (utile sur la page Stock mobile, fixe en hauteur).
          Ligne 1 : toggle seul. Ligne 2 : "+ Ajouter ligne" + plein écran ensemble. */}
      <div className="flex items-center justify-center mb-2">
        <div className="flex gap-2 p-1 rounded-lg bg-[#F1F5F9]">
          <button onClick={() => setMode('achat')} className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${mode === 'achat' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Liste d&apos;achat</button>
          <button onClick={() => setMode('production')} className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${mode === 'production' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Liste de production</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-bold text-[#374151] hover:bg-[#F8FAFC] transition-colors flex-shrink-0">
          + Ajouter ligne
        </button>
        {/* Plein écran / réduire — surtout utile sur mobile où la carte est normalement
            contrainte en hauteur (cf. page Stock mobile). */}
        <button onClick={() => setFullscreen((v) => !v)} title={fullscreen ? 'Réduire' : 'Plein écran'}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#8A9BB5] hover:bg-[#F8FAFC] transition-colors">
          {fullscreen ? (
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M9 3v4a2 2 0 01-2 2H3M15 3v4a2 2 0 002 2h4M9 21v-4a2 2 0 00-2-2H3M15 21v-4a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto flex flex-col gap-3 pr-1 no-scrollbar ${fullscreen ? '' : 'max-h-[360px]'}`}>
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
              <div key={item.id} className="rounded-xl border border-[#E2E8F0] p-4 md:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] font-bold text-[#4F46E5]">{l.ref}</p>
                      {urgent && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#DC2626] uppercase tracking-wide">Urgent</span>}
                    </div>
                    {/* Pas de nom personnalisé → rien à afficher en plus de la référence
                        déjà visible juste au-dessus (évite la référence répétée). */}
                    {l.name && <p className="text-[13px] font-bold text-[#0F172A] truncate">{l.name}</p>}
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
            const l = itemLabel(item);
            const total = totalQty(item); // ce qui reste ENCORE à produire (diminue à chaque fabrication)
            const produced = item.producedQuantity ?? 0;
            const target = produced + total; // objectif d'origine reconstitué (produit + encore à produire)
            const pct = target > 0 ? Math.min(100, (produced / target) * 100) : 0;
            // Ligne LIBRE (sans fiche produit) : ni seuil ni "urgent" ne veulent dire quoi que ce
            // soit pour elle (rien de tout ça n'existe sans stock produit) — toujours "Commande
            // client", son besoin vient forcément d'une vraie commande/d'un vrai devis.
            const urgent = item.product ? total > 0 && item.product.available <= 0 : false;
            const linked = [...item.orderItems, ...item.quoteItems];
            // Le statut "Bloqué" ne s'affiche plus au niveau de la carte (badge, sous-titre,
            // ligne de statut) — il ne reste visible que par commande, dans "Commandes
            // concernées" (badge précis calculé par simulation FIFO, cf. stock-traceability.ts).
            const subtitle = item.product
              ? severitySubtitle({
                  urgent,
                  belowThreshold: item.product.available < item.product.productionThreshold,
                  auto: item.auto,
                  manual: item.manualQuantity > 0,
                })
              : 'Commande client';
            return (
              <div key={item.id} className="rounded-xl border border-[#E2E8F0] p-4 md:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] font-bold text-[#4F46E5]">{l.ref}</p>
                      {urgent && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#DC2626] uppercase tracking-wide">Urgent</span>}
                    </div>
                    {/* Pas de nom personnalisé → rien à afficher en plus de la référence
                        déjà visible juste au-dessus (même correction que la liste d'achat). */}
                    {l.name && <p className="text-[13px] font-bold text-[#0F172A] truncate">{l.name}</p>}
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
      {noRecipeChoice && (
        <NoRecipeChoiceModal
          label={`${noRecipeChoice.current.reference}${noRecipeChoice.current.name ? ' — ' + noRecipeChoice.current.name : ''}`}
          onClose={handleNoRecipeChoiceClose}
          onContinueWithout={handleContinueWithoutRecipe}
          onAddRecipe={handleOpenRecipeEntry}
        />
      )}
      {recipeModal && (
        <RecipeEntryModal
          productLabel={`${recipeModal.current.reference}${recipeModal.current.name ? ' — ' + recipeModal.current.name : ''}`}
          confirmLabel="Lancer la production"
          saveHint={recipeModal.current.productId
            ? 'Enregistrer cette recette sur le produit (sinon utilisée juste cette fois-ci)'
            : 'Enregistrer cette recette pour cette référence libre (sinon utilisée juste cette fois-ci)'}
          onClose={handleRecipeCancel}
          onSubmit={handleRecipeSubmit}
        />
      )}
      {successResult && (
        <Modal title={successResult.title} onClose={() => setSuccessResult(null)}>
          <div className="space-y-2">
            {successResult.lines.map((line, i) => (
              <p key={i} className="text-[13px] text-[#374151] flex items-start gap-2">
                <span className="text-[#4CAF4F] font-bold flex-shrink-0">✓</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
          <button onClick={() => setSuccessResult(null)}
            className="mt-5 w-full px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>
            OK
          </button>
        </Modal>
      )}
    </div>
  );
}
