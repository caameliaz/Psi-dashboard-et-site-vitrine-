'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

interface RawMaterialOption { id: string; reference: string; name: string; unit: string; }

// ── Overlay : premier choix quand un produit/ligne n'a aucune recette ───────────────────────
// Remplace l'ancien window.confirm() — "Continuer" (fond blanc) produit sans vérifier/consommer
// de matière, "Ajouter une recette" (fond vert) ouvre RecipeEntryModal pour la saisir et lancer
// la production avec elle.
export function NoRecipeChoiceModal({ label, onClose, onContinueWithout, onAddRecipe }: {
  label: string;
  onClose: () => void;
  onContinueWithout: () => void;
  onAddRecipe: () => void;
}) {
  return (
    <Modal title="Aucune recette" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[13px] text-[#374151]">
          <span className="font-bold">{label}</span> n&apos;a aucune recette enregistrée.
        </p>
        <div className="flex flex-col gap-3 pt-1">
          <button onClick={onContinueWithout}
            className="text-left px-4 py-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors">
            <p className="text-sm font-semibold text-[#374151]">Continuer</p>
            <p className="text-[11px] text-[#8A9BB5] mt-0.5">
              Produit sans consommer de matière première — <span className="font-semibold text-[#DC2626]">déconseillé</span> pour la gestion du stock, le stock matière ne sera pas mis à jour.
            </p>
          </button>
          <button onClick={onAddRecipe}
            className="text-left px-4 py-3 rounded-lg transition-colors" style={{ background: '#4CAF4F' }}>
            <p className="text-sm font-bold text-white">Ajouter une recette</p>
            <p className="text-[11px] text-white/85 mt-0.5">
              Saisissez les matières premières nécessaires — la production consommera automatiquement le stock matière correspondant.
            </p>
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Overlay : saisir la recette d'un produit (ou d'une ligne libre) qui n'en a aucune ───────
// Utilisé par le bouton "Produire" (liste de production) ET "Marquer Disponible" (commande/
// devis) quand un produit fabriqué n'a aucune recette enregistrée — cf. order-stock.ts
// (RecipeOverrideItem) : la case "Enregistrer" décide si la recette saisie est persistée —
// sur le produit (PUT /api/products/[id]/recipe, réutilisable pour toujours), ou, pour une
// ligne libre sans fiche produit, sous son texte EXACT (saveFreeTextRecipe, réutilisée
// automatiquement la prochaine fois qu'une ligne libre porte ce même texte) — ou seulement
// utilisée pour CETTE action si décochée (jamais écrite en base).
export function RecipeEntryModal({ productLabel, confirmLabel, saveHint, onClose, onSubmit }: {
  productLabel: string;
  confirmLabel: string;
  // Texte de la case à cocher — adapté selon qu'on sauvegarde sur un produit ou sous le texte
  // d'une ligne libre (cf. StockListsWidget.tsx / requests/page.tsx).
  saveHint: string;
  onClose: () => void;
  onSubmit: (items: { rawMaterialId: string; quantity: number }[], saveRecipe: boolean) => Promise<void>;
}) {
  const [materials, setMaterials] = useState<RawMaterialOption[]>([]);
  const [lines, setLines] = useState<{ rawMaterialId: string; quantity: string }[]>([{ rawMaterialId: '', quantity: '' }]);
  const [saveRecipe, setSaveRecipe] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/raw-materials').then((r) => r.ok ? r.json() : []).then(setMaterials).catch(() => {});
  }, []);

  const setLine = (i: number, patch: Partial<{ rawMaterialId: string; quantity: string }>) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { rawMaterialId: '', quantity: '' }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const items = lines.filter((l) => l.rawMaterialId && Number(l.quantity) > 0).map((l) => ({ rawMaterialId: l.rawMaterialId, quantity: Number(l.quantity) }));

  const submit = async () => {
    if (items.length === 0 || saving) return;
    setSaving(true);
    try { await onSubmit(items, saveRecipe); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal title={`Recette — ${productLabel}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[13px] text-[#8A9BB5]">
          Ce produit n&apos;a aucune recette enregistrée. Saisissez-la pour continuer.
        </p>
        <div className="flex flex-col gap-2">
          {lines.map((l, i) => {
            const mat = materials.find((m) => m.id === l.rawMaterialId);
            return (
              <div key={i} className="flex gap-2 items-center">
                <select value={l.rawMaterialId} onChange={(e) => setLine(i, { rawMaterialId: e.target.value })} className={inputClass}>
                  <option value="">Choisir une matière première</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.name}</option>)}
                </select>
                <input value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal"
                  placeholder="Qté" style={{ width: 90 }} className={inputClass} />
                <span className="text-[12px] text-[#8A9BB5] w-14 flex-shrink-0">{mat?.unit ?? ''}</span>
                <button onClick={() => removeLine(i)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] text-xs font-bold">×</button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={addLine} className="text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C]">+ Ajouter une matière première</button>

        <label className="flex items-center gap-2 text-[12px] font-semibold text-[#374151] cursor-pointer">
          <input type="checkbox" checked={saveRecipe} onChange={(e) => setSaveRecipe(e.target.checked)} className="w-4 h-4" />
          {saveHint}
        </label>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={submit} disabled={saving || items.length === 0} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Enregistrement…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
