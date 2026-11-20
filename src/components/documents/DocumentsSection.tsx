'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/lib/role-context';
import { api, DOC_NAMES } from '@/lib/documents/client';
import { fmtDate, fmtMoney } from '@/lib/documents/calc';
import type { DocumentKind } from '@/lib/documents/types';
import { DocumentActions } from './DocumentActions';
import { DocumentFormModal } from './DocumentFormModal';
import { ghostBtn, greenBtn } from './WideModal';

export interface DocListItem {
  id: string; type: DocumentKind; number: string; year: number; createdAt: string; date: string; clientId: string | null; clientName: string;
  orderId: string | null; quoteId: string | null; sourceRef: string | null; invoice: { id: string; number: string } | null;
  lineCount: number; quantity: number; paymentMethod: string; total?: number; blNumbers: string[];
}

export const TYPE_STYLE: Record<DocumentKind, { bg: string; fg: string }> = {
  BL: { bg: '#EFF6FF', fg: '#1E40AF' },
  FACTURE: { bg: '#F0FDF4', fg: '#166534' },
  PROFORMA: { bg: '#F5F3FF', fg: '#5B21B6' },
};

// Modifier / supprimer (admins) + boutons d'impression, Excel, e-mail d'un document.
export function DocumentRowActions({ item, isAdmin, onChanged }: { item: DocListItem; isAdmin: boolean; onChanged: () => void }) {
  const [edit, setEdit] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');
  const del = async () => {
    try { await api(`/api/documents/${item.id}`, { method: 'DELETE' }); setConfirmDel(false); onChanged(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <DocumentActions id={item.id} isAdmin={isAdmin} onChanged={onChanged} compact />
        {isAdmin && <button type="button" onClick={() => setEdit(true)} className="px-2 py-1 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-bold text-[#374151] hover:bg-[#F8FAFC]">Modifier</button>}
        {isAdmin && <button type="button" onClick={() => setConfirmDel(true)} className="px-2 py-1 rounded-lg border border-[#FECACA] bg-white text-[11px] font-bold text-[#B91C1C] hover:bg-[#FEF2F2]">Supprimer</button>}
      </div>
      {edit && <DocumentFormModal mode="edit" id={item.id} isAdmin={isAdmin} onClose={() => setEdit(false)} onSaved={onChanged} />}
      {confirmDel && (
        <Modal title="Supprimer ce document ?" onClose={() => { setConfirmDel(false); setErr(''); }}>
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-[#374151]">{DOC_NAMES[item.type]} <b>{item.number}</b> sera supprimé{item.type === 'BL' ? '' : 'e'}. Son numéro ne sera pas réutilisé automatiquement.{item.type === 'FACTURE' && ' Les BL qu’elle regroupe redeviennent « à facturer ».'}</p>
            {err && <p className="text-[12px] text-red-600 font-medium">{err}</p>}
            <div className="flex gap-2">
              <button className={`${ghostBtn} flex-1`} onClick={() => { setConfirmDel(false); setErr(''); }}>Annuler</button>
              <button className={`${greenBtn} flex-1`} style={{ background: '#DC2626' }} onClick={del}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Détail d'une commande / d'un devis : « Documents » — BL, facture (depuis les BL), proforma.
export function DocumentsSection({ kind, id, onChanged }: { kind: 'order' | 'quote'; id: string; onChanged?: () => void }) {
  const { isAdmin, readOnly } = useRole();
  const [items, setItems] = useState<DocListItem[] | null>(null);
  const [create, setCreate] = useState<null | { kind: DocumentKind; blIds?: string[] }>(null);
  const [pick, setPick] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: DocListItem[] }>(`/api/documents?${kind === 'order' ? 'orderId' : 'quoteId'}=${id}`);
      setItems(r.items);
    } catch { setItems([]); }
  }, [kind, id]);
  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); onChanged?.(); };
  const toInvoice = (items ?? []).filter((d) => d.type === 'BL' && !d.invoice);
  const sectionTitle = 'text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-2';
  const act = 'px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#2563EB] hover:bg-[#F8FAFC] transition-colors';

  return (
    <div>
      <p className={sectionTitle}>Documents (BL, facture, proforma)</p>
      {items === null ? (
        <p className="text-[12px] text-[#8A9BB5]">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.length === 0 && <p className="text-[12px] text-[#8A9BB5]">Aucun document pour l&apos;instant.</p>}
          {items.map((d) => (
            <div key={d.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: TYPE_STYLE[d.type].bg, color: TYPE_STYLE[d.type].fg }}>{d.type === 'BL' ? 'BL' : d.type === 'FACTURE' ? 'Facture' : 'Proforma'}</span>
                <span className="text-[13px] font-bold text-[#0F172A]">{d.number}</span>
                <span className="text-[11px] text-[#8A9BB5]">{fmtDate(d.date)}</span>
                {d.type === 'BL' && (d.invoice ? <span className="text-[11px] font-semibold text-[#166534]">→ {d.invoice.number}</span> : <span className="text-[11px] font-semibold text-[#B45309]">à facturer</span>)}
                {d.type === 'FACTURE' && d.blNumbers.length > 0 && <span className="text-[11px] text-[#6B7A90]">({d.blNumbers.join(', ')})</span>}
                {d.total !== undefined && d.type !== 'BL' && <span className="ml-auto text-[12px] font-bold text-[#0F172A]">{fmtMoney(d.total)} DA</span>}
              </div>
              <DocumentRowActions item={d} isAdmin={isAdmin} onChanged={refresh} />
            </div>
          ))}
          {!readOnly && (
            <div className="flex flex-wrap gap-2 mt-1">
              <button type="button" className={act} onClick={() => setCreate({ kind: 'BL' })}>+ Bon de livraison</button>
              {isAdmin && toInvoice.length > 0 && (
                <button type="button" className={act} onClick={() => {
                  if (toInvoice.length === 1) setCreate({ kind: 'FACTURE', blIds: [toInvoice[0].id] });
                  else { setPicked(toInvoice.map((b) => b.id)); setPick(true); }
                }}>+ Facture ({toInvoice.length} BL à facturer)</button>
              )}
              {isAdmin && <button type="button" className={act} onClick={() => setCreate({ kind: 'PROFORMA' })}>+ Proforma</button>}
            </div>
          )}
          {isAdmin && !readOnly && toInvoice.length === 0 && <p className="text-[11px] text-[#8A9BB5]">Une facture se crée à partir d&apos;un BL : crée d&apos;abord le bon de livraison.</p>}
        </div>
      )}

      {pick && (
        <Modal title="Quels BL facturer ?" onClose={() => setPick(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-[#4D4D4D]">Les BL cochés seront regroupés dans une seule facture. Pour regrouper des BL d&apos;autres commandes du même client, utilise la page Documents.</p>
            {toInvoice.map((b) => (
              <label key={b.id} className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 cursor-pointer">
                <input type="checkbox" className="accent-[#4CAF4F]" checked={picked.includes(b.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, b.id] : p.filter((x) => x !== b.id)))} />
                <span className="text-[13px] font-semibold">{b.number}</span>
                <span className="text-[11px] text-[#8A9BB5]">{b.quantity} rouleaux</span>
              </label>
            ))}
            <div className="flex gap-2">
              <button className={`${ghostBtn} flex-1`} onClick={() => setPick(false)}>Annuler</button>
              <button disabled={picked.length === 0} className={`${greenBtn} flex-1`} style={{ background: '#4CAF4F' }} onClick={() => { setPick(false); setCreate({ kind: 'FACTURE', blIds: picked }); }}>Continuer</button>
            </div>
          </div>
        </Modal>
      )}
      {create && (
        <DocumentFormModal
          mode="create" kind={create.kind} blIds={create.blIds} isAdmin={isAdmin}
          orderId={kind === 'order' ? id : null} quoteId={kind === 'quote' ? id : null}
          onClose={() => setCreate(null)} onSaved={refresh}
        />
      )}
    </div>
  );
}
