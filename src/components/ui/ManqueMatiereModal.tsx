'use client';

import { useState } from 'react';
import { Modal } from './Modal';

// Matière première qui manque pour produire (renvoyée en 409 « MATIERE_INSUFFISANTE » par
// /api/stock/restock et /api/production-list/[id]).
export type ManqueMatiere = { rawMaterialId: string; reference: string; name: string; unit: string; missing: number };

// Overlay affiché quand une production est refusée faute de matière première :
//  • « Réapprovisionner et produire » : ajoute la matière saisie (réassort) puis relance la production ;
//  • « Produire quand même » (admins seulement) : produit en consommant ce qu'il reste, la matière
//    manquante n'est pas inventée (le stock matière descend à 0, jamais en négatif).
export function ManqueMatiereModal({ produit, manques, peutForcer, onReessayer, onForcer, onClose }: {
  produit: string; manques: ManqueMatiere[]; peutForcer: boolean;
  onReessayer: () => Promise<void>; onForcer: () => Promise<void>; onClose: () => void;
}) {
  const [quantites, setQuantites] = useState<Record<string, string>>(
    () => Object.fromEntries(manques.map((m) => [m.rawMaterialId, String(Math.ceil(m.missing))])),
  );
  const [enCours, setEnCours] = useState(false);

  const reapprovisionner = async () => {
    setEnCours(true);
    try {
      for (const m of manques) {
        const q = Number(quantites[m.rawMaterialId]);
        if (!q || q <= 0) continue;
        const res = await fetch('/api/stock/restock', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'material', id: m.rawMaterialId, quantity: q }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`${m.name} : ${err.error ?? 'échec du réapprovisionnement'}`);
          return;
        }
      }
      await onReessayer();
    } finally {
      setEnCours(false);
    }
  };

  const forcer = async () => {
    setEnCours(true);
    try { await onForcer(); } finally { setEnCours(false); }
  };

  return (
    <Modal title="Pas assez de matière première" onClose={enCours ? () => {} : onClose}>
      <div className="space-y-4">
        <p className="text-[13px] text-[#374151]">
          Impossible de produire <span className="font-semibold">{produit}</span> : il manque de la matière première.
        </p>
        <ul className="flex flex-col gap-2">
          {manques.map((m) => (
            <li key={m.rawMaterialId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
              <span className="flex-1 min-w-0 text-[12px] text-[#374151]">
                <span className="font-semibold">{m.name}</span> <span className="text-[#8A9BB5]">({m.reference})</span>
                <span className="block text-[11px] text-[#B91C1C]">Manque {m.missing} {m.unit}</span>
              </span>
              <label className="text-[11px] text-[#8A9BB5]">+</label>
              <input value={quantites[m.rawMaterialId] ?? ''} inputMode="decimal"
                onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ''); setQuantites((q) => ({ ...q, [m.rawMaterialId]: v })); }}
                className="w-[80px] px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] text-right bg-white focus:outline-none focus:border-[#4CAF4F]" />
              <span className="text-[11px] text-[#8A9BB5] w-5">{m.unit}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[#8A9BB5]">
          Mettez la quantité <b>réellement rentrée</b> : elle devient la nouvelle référence (100 %) de la matière.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={reapprovisionner} disabled={enCours}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {enCours ? 'En cours…' : 'Réapprovisionner la matière et produire'}
          </button>
          {peutForcer && (
            <button onClick={forcer} disabled={enCours}
              className="w-full px-4 py-2.5 rounded-lg border border-[#F59E0B] text-sm font-bold text-[#B45309] hover:bg-[#FFFBEB] disabled:opacity-60">
              Produire quand même (admin)
            </button>
          )}
          <button onClick={onClose} disabled={enCours}
            className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC]">
            Annuler
          </button>
        </div>
        {peutForcer && (
          <p className="text-[11px] text-[#8A9BB5]">« Produire quand même » consomme ce qui reste (la matière descend à 0, jamais en négatif) et le note dans le journal.</p>
        )}
      </div>
    </Modal>
  );
}
