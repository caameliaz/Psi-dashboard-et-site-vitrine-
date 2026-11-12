'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRole } from '@/lib/role-context';
import { RequirePerm } from '@/components/RequirePerm';
import { api } from '@/lib/documents/client';
import { fmtDate, fmtMoney } from '@/lib/documents/calc';
import type { DocumentKind } from '@/lib/documents/types';
import { DocumentFormModal } from '@/components/documents/DocumentFormModal';
import { DocumentRowActions, TYPE_STYLE, type DocListItem } from '@/components/documents/DocumentsSection';
import { ghostBtn, inputCls } from '@/components/documents/WideModal';

const TABS: { kind: DocumentKind; label: string; admin: boolean }[] = [
  { kind: 'BL', label: 'Bons de livraison', admin: false },
  { kind: 'FACTURE', label: 'Factures', admin: true },
  { kind: 'PROFORMA', label: 'Proformas', admin: true },
];

function DocumentsPageInner() {
  const { isAdmin, readOnly } = useRole();
  const [tab, setTab] = useState<DocumentKind>('BL');
  const [items, setItems] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [onlyToInvoice, setOnlyToInvoice] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [group, setGroup] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: DocListItem[] }>(`/api/documents?type=${tab}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
      setItems(r.items); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setLoading(false); }
  }, [tab, q]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { setSel([]); }, [tab]);

  const shown = useMemo(() => (tab === 'BL' && onlyToInvoice ? items.filter((d) => !d.invoice) : items), [items, tab, onlyToInvoice]);
  const toInvoiceCount = items.filter((d) => d.type === 'BL' && !d.invoice).length;

  // Regroupement : BL cochés, même client, pas déjà facturés
  const selected = items.filter((d) => sel.includes(d.id));
  const clients = new Set(selected.map((d) => d.clientId ?? d.clientName));
  const canGroup = isAdmin && !readOnly && selected.length > 0 && clients.size === 1 && selected.every((d) => !d.invoice);
  const groupHint = selected.length === 0 ? '' : clients.size > 1 ? 'Les BL cochés doivent être du même client.' : selected.some((d) => d.invoice) ? 'Un BL coché est déjà facturé.' : '';

  const th = 'px-3 py-2.5 text-left text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide whitespace-nowrap';
  const td = 'px-3 py-3 text-[13px] align-top';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-black text-[#0F172A]">Documents</h1>
          <p className="text-[12px] text-[#8A9BB5]">Bons de livraison, factures et proformas. On les crée depuis une commande ou un devis (section « Documents » du détail).</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.filter((t) => !t.admin || isAdmin).map((t) => (
          <button key={t.kind} onClick={() => setTab(t.kind)}
            className={`px-3.5 py-2 rounded-lg text-[13px] font-bold border transition-colors ${tab === t.kind ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]' : 'bg-white text-[#374151] border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
            {t.label}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (numéro, client)…" className={`${inputCls} !w-[260px] ml-auto`} />
      </div>

      {tab === 'BL' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-[#374151] cursor-pointer">
            <input type="checkbox" className="accent-[#4CAF4F]" checked={onlyToInvoice} onChange={(e) => setOnlyToInvoice(e.target.checked)} />
            À facturer seulement <span className="px-1.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] text-[11px] font-bold">{toInvoiceCount}</span>
          </label>
          {isAdmin && (
            <div className="flex items-center gap-2 ml-auto">
              {groupHint && <span className="text-[11px] text-[#B45309]">{groupHint}</span>}
              <button type="button" disabled={!canGroup} onClick={() => setGroup(selected.map((d) => d.id))}
                className="px-3.5 py-2 rounded-lg text-[13px] font-bold text-white disabled:opacity-40" style={{ background: '#4CAF4F' }}>
                Regrouper en facture{selected.length > 0 ? ` (${selected.length})` : ''}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              {tab === 'BL' && isAdmin && <th className="w-10 px-3" />}
              <th className={th}>Numéro</th><th className={th}>Client</th><th className={th}>Commande</th><th className={th}>Date</th>
              <th className={th}>{tab === 'BL' ? 'Rouleaux' : 'Montant'}</th>
              {tab === 'BL' && <th className={th}>Facturation</th>}
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-[#8A9BB5]">Chargement…</td></tr>}
            {!loading && error && <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-red-600">{error}</td></tr>}
            {!loading && !error && shown.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-[#8A9BB5]">Aucun document.</td></tr>}
            {shown.map((d) => (
              <tr key={d.id} className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#FAFBFC]">
                {tab === 'BL' && isAdmin && (
                  <td className="px-3 py-3 align-top">
                    <input type="checkbox" className="accent-[#4CAF4F]" disabled={!!d.invoice} checked={sel.includes(d.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id)))} aria-label={`Sélectionner ${d.number}`} />
                  </td>
                )}
                <td className={td}>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold mr-1.5" style={{ background: TYPE_STYLE[d.type].bg, color: TYPE_STYLE[d.type].fg }}>{d.number}</span>
                  {d.type === 'FACTURE' && d.blNumbers.length > 0 && <span className="block text-[11px] text-[#8A9BB5] mt-1">{d.blNumbers.join(', ')}</span>}
                </td>
                <td className={`${td} font-semibold text-[#0F172A]`}>{d.clientName || '—'}</td>
                <td className={`${td} text-[#6B7A90]`}>{d.sourceRef ?? '—'}</td>
                <td className={`${td} text-[#6B7A90] whitespace-nowrap`}>{fmtDate(d.date)}</td>
                <td className={`${td} font-semibold whitespace-nowrap`}>{tab === 'BL' ? d.quantity : d.total !== undefined ? `${fmtMoney(d.total)} DA` : '—'}</td>
                {tab === 'BL' && (
                  <td className={td}>{d.invoice ? <span className="font-semibold text-[#166534]">{d.invoice.number}</span> : <span className="font-semibold text-[#B45309]">À facturer</span>}</td>
                )}
                <td className={td}><DocumentRowActions item={d} isAdmin={isAdmin} onChanged={load} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#8A9BB5]">« Imprimer / PDF » ouvre la fenêtre d&apos;impression : choisis « Enregistrer au format PDF » pour garder un fichier.</p>
      <button type="button" onClick={load} className={`${ghostBtn} self-start`}>Actualiser</button>

      {group && <DocumentFormModal mode="create" kind="FACTURE" blIds={group} isAdmin={isAdmin} onClose={() => setGroup(null)} onSaved={() => { setSel([]); load(); }} />}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RequirePerm perm="voir_commandes">
      <DocumentsPageInner />
    </RequirePerm>
  );
}
