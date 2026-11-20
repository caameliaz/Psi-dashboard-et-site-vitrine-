'use client';

import { useEffect, useState } from 'react';
import { api, DOC_NAMES } from '@/lib/documents/client';
import { fmtDate } from '@/lib/documents/calc';
import type { DocumentKind } from '@/lib/documents/types';
import type { DocListItem } from './DocumentsSection';
import { WideModal, ghostBtn, greenBtn, inputCls } from './WideModal';

interface Source { kind: 'order' | 'quote'; id: string; ref: string; status: string; createdAt: string; client: string; quantity: number }

export type CreateChoice = { kind: DocumentKind; orderId?: string | null; quoteId?: string | null; blIds?: string[] };

const STATUS: Record<string, string> = { EN_ATTENTE: 'En attente', CONTACTE: 'Contacté', VALIDE: 'Validé', PRODUITE: 'Disponible', LIVRE: 'Livré', RETOURNE: 'Retourné', ANNULE: 'Annulé' };

// « Créer un document » depuis la page Documents : on choisit le type, puis on RECHERCHE la commande / le devis
// (BL, proforma) ou les BL à facturer (facture, même client) — la fenêtre de saisie s'ouvre ensuite pré-remplie.
export function CreateDocumentModal({ isAdmin, onClose, onChoose }: { isAdmin: boolean; onClose: () => void; onChoose: (c: CreateChoice) => void }) {
  const [kind, setKind] = useState<DocumentKind>('BL');
  const [q, setQ] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [bls, setBls] = useState<DocListItem[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setPicked([]); }, [kind]);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        if (kind === 'FACTURE') {
          const r = await api<{ items: DocListItem[] }>(`/api/documents?toInvoice=1${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
          if (alive) setBls(r.items);
        } else {
          const r = await api<{ items: Source[] }>(`/api/documents/sources?q=${encodeURIComponent(q.trim())}`);
          if (alive) setSources(r.items);
        }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Erreur'); }
      finally { if (alive) setLoading(false); }
    }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [kind, q]);

  const kinds: DocumentKind[] = isAdmin ? ['BL', 'FACTURE', 'PROFORMA'] : ['BL'];
  const chosen = bls.filter((b) => picked.includes(b.id));
  const sameClient = new Set(chosen.map((b) => b.clientId ?? b.clientName)).size <= 1;

  return (
    <WideModal title="Créer un document" onClose={onClose} maxWidth="max-w-2xl"
      footer={kind === 'FACTURE' ? (
        <div className="flex items-center gap-2 justify-end">
          {!sameClient && <span className="text-[11px] text-[#B45309] mr-auto">Les BL cochés doivent être du même client.</span>}
          <button className={ghostBtn} onClick={onClose}>Annuler</button>
          <button disabled={chosen.length === 0 || !sameClient} className={greenBtn} style={{ background: '#4CAF4F' }} onClick={() => onChoose({ kind: 'FACTURE', blIds: picked })}>
            Créer la facture{chosen.length > 0 ? ` (${chosen.length} BL)` : ''}
          </button>
        </div>
      ) : undefined}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {kinds.map((k) => (
            <button key={k} onClick={() => { setKind(k); setQ(''); }}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-bold border transition-colors ${kind === k ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]' : 'bg-white text-[#374151] border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
              {DOC_NAMES[k]}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-[#6B7A90]">
          {kind === 'FACTURE' ? 'Cherche les bons de livraison à facturer (par numéro ou client), puis coche ceux à regrouper.' : `Cherche la commande ou le devis (référence, client ou entreprise) pour y créer ${kind === 'BL' ? 'le bon de livraison' : 'la proforma'}.`}
        </p>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === 'FACTURE' ? 'Numéro de BL ou client…' : 'Référence, client, entreprise…'} className={inputCls} />

        <div className="flex flex-col gap-1.5 max-h-[45vh] overflow-y-auto pr-1">
          {loading && <p className="text-[12px] text-[#8A9BB5] py-3 text-center">Recherche…</p>}
          {!loading && error && <p className="text-[12px] text-red-600 py-3 text-center">{error}</p>}
          {!loading && !error && kind !== 'FACTURE' && sources.length === 0 && <p className="text-[12px] text-[#8A9BB5] py-3 text-center">Aucune commande ni devis trouvé.</p>}
          {!loading && !error && kind === 'FACTURE' && bls.length === 0 && <p className="text-[12px] text-[#8A9BB5] py-3 text-center">Aucun BL à facturer{q ? ' pour cette recherche' : ''}. Crée d&apos;abord le bon de livraison.</p>}

          {kind !== 'FACTURE' && sources.map((s) => (
            <button key={`${s.kind}-${s.id}`} type="button" onClick={() => onChoose({ kind, orderId: s.kind === 'order' ? s.id : null, quoteId: s.kind === 'quote' ? s.id : null })}
              className="text-left rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F0FDF4] hover:border-[#BBF7D0] px-3 py-2.5 flex items-center gap-3 transition-colors">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={s.kind === 'order' ? { background: '#F0FDF4', color: '#166534' } : { background: '#F5F3FF', color: '#5B21B6' }}>{s.kind === 'order' ? 'Commande' : 'Devis'}</span>
              <span className="text-[13px] font-bold text-[#0F172A]">{s.ref}</span>
              <span className="text-[12px] text-[#374151] truncate flex-1 min-w-0">{s.client}</span>
              <span className="text-[11px] text-[#8A9BB5] whitespace-nowrap">{s.quantity} roul. · {STATUS[s.status] ?? s.status} · {fmtDate(s.createdAt)}</span>
            </button>
          ))}

          {kind === 'FACTURE' && bls.map((b) => (
            <label key={b.id} className="rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-3 py-2.5 flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="accent-[#4CAF4F]" checked={picked.includes(b.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, b.id] : p.filter((x) => x !== b.id)))} />
              <span className="text-[13px] font-bold text-[#0F172A]">{b.number}</span>
              <span className="text-[12px] text-[#374151] truncate flex-1 min-w-0">{b.clientName}</span>
              <span className="text-[11px] text-[#8A9BB5] whitespace-nowrap">{b.sourceRef ?? ''} · {b.quantity} roul. · {fmtDate(b.date)}</span>
            </label>
          ))}
        </div>
      </div>
    </WideModal>
  );
}
