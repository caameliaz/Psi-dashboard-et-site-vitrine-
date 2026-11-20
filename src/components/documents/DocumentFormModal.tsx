'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { computeTotals, fmtMoney, lineAmount } from '@/lib/documents/calc';
import { api, DOC_NAMES } from '@/lib/documents/client';
import { renderDocumentHtml } from '@/lib/documents/render';
import { qrSvg, receiptUrl } from '@/lib/label-print';
import type { DocLine, DocParty, DocumentData, DocumentKind, DocumentSettingsData, DocumentTemplateConfig, RenderableDocument } from '@/lib/documents/types';
import { DocumentActions } from './DocumentActions';
import { WideModal, greenBtn, ghostBtn, inputCls, labelCls } from './WideModal';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.psi.dz';
const PAYMENTS = ['Virement/Chèque', 'Espèces', 'Chèque', 'Virement', 'Versement'];
const FISCAL: { key: 'rc' | 'nif' | 'nis' | 'ai'; label: string }[] = [{ key: 'rc', label: 'RC' }, { key: 'nif', label: 'NIF' }, { key: 'nis', label: 'NIS' }, { key: 'ai', label: 'AI' }];

type Props =
  | { mode: 'create'; kind: DocumentKind; orderId?: string | null; quoteId?: string | null; blIds?: string[]; isAdmin: boolean; onClose: () => void; onSaved?: (r: { id: string; number: string }) => void }
  | { mode: 'edit'; id: string; isAdmin: boolean; onClose: () => void; onSaved?: (r: { id: string; number: string }) => void };

interface Meta { kind: DocumentKind; orderId: string | null; quoteId: string | null; clientId: string | null; blIds: string[]; warnings: string[]; missingFiscal: string[]; bis: boolean }

const isoDay = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const fromDay = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : '');
const emptyLine = (): DocLine => ({ ref: '', designation: '', laize: '', metrage: '', quantity: 0, unitPrice: 0, observation: '' });

export function DocumentFormModal(props: Props) {
  const { mode, isAdmin, onClose } = props;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [template, setTemplate] = useState<DocumentTemplateConfig | null>(null);
  const [settings, setSettings] = useState<DocumentSettingsData | null>(null);
  const [number, setNumber] = useState('');
  const [data, setData] = useState<DocumentData | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [fiscalStep, setFiscalStep] = useState(false);
  const [saveClient, setSaveClient] = useState(true);
  const [created, setCreated] = useState<{ id: string; number: string } | null>(null);
  const [qr, setQr] = useState('');

  const kind: DocumentKind = meta?.kind ?? (props.mode === 'create' ? props.kind : 'BL');

  // Chargement : brouillon (création) ou document existant + réglages (modification)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (props.mode === 'create') {
          const d = await api('/api/documents/prepare', { method: 'POST', body: JSON.stringify({ kind: props.kind, orderId: props.orderId, quoteId: props.quoteId, blIds: props.blIds }) });
          if (!alive) return;
          setMeta({ kind: d.kind, orderId: d.orderId, quoteId: d.quoteId, clientId: d.clientId, blIds: d.blIds, warnings: d.warnings, missingFiscal: d.missingFiscal, bis: d.bis });
          setTemplate(d.template); setSettings(d.settings); setNumber(d.suggestedNumber); setData(d.data);
          if (d.missingFiscal.length > 0 && d.clientId) setFiscalStep(true);
        } else {
          const [r, s] = await Promise.all([api(`/api/documents/${props.id}`), api('/api/documents/settings')]);
          if (!alive) return;
          const doc: RenderableDocument = r.doc;
          setMeta({ kind: doc.type, orderId: r.meta.orderId, quoteId: r.meta.quoteId, clientId: r.meta.clientId, blIds: (r.meta.bls ?? []).map((b: { id: string }) => b.id), warnings: [], missingFiscal: [], bis: false });
          setTemplate(doc.template); setSettings(s.settings); setNumber(doc.number); setData(doc.data); setCustom(doc.customFields ?? {});
          if (doc.qrSvg) setQr(doc.qrSvg);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Erreur');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR du BL (même lien que l'étiquette colis)
  useEffect(() => {
    if (kind !== 'BL' || !data?.receiptToken) return;
    let alive = true;
    qrSvg(receiptUrl(data.receiptToken, SITE_URL)).then((s) => { if (alive) setQr(s); }).catch(() => {});
    return () => { alive = false; };
  }, [kind, data?.receiptToken]);

  const set = (patch: Partial<DocumentData>) => setData((d) => (d ? { ...d, ...patch } : d));
  const setClient = (patch: Partial<DocParty>) => setData((d) => (d ? { ...d, client: { ...d.client, ...patch } } : d));
  const setLine = (i: number, patch: Partial<DocLine>) => setData((d) => (d ? { ...d, lines: d.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) } : d));

  const totals = useMemo(() => (data && settings ? computeTotals(data.lines, data.vatRate, data.paymentMethod, settings.stampDuty) : null), [data, settings]);
  const live: RenderableDocument | null = useMemo(() => {
    if (!data || !template || !totals) return null;
    return { type: kind, number, template, data: { ...data, totals }, customFields: custom, qrSvg: qr || undefined };
  }, [data, template, totals, kind, number, custom, qr]);
  const previewHtml = useMemo(() => (showPreview && live ? renderDocumentHtml(live, { origin: typeof window !== 'undefined' ? window.location.origin : '' }) : ''), [showPreview, live]);

  const submit = async () => {
    if (!data) return;
    setBusy(true); setError('');
    try {
      if (props.mode === 'create' && meta) {
        const r = await api('/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            kind, number, data, customFields: custom, orderId: meta.orderId, quoteId: meta.quoteId, clientId: meta.clientId, blIds: meta.blIds,
            saveClient: kind !== 'BL' && saveClient && meta.clientId ? { rc: data.client.rc, nif: data.client.nif, nis: data.client.nis, ai: data.client.ai } : undefined,
          }),
        });
        setCreated({ id: r.id, number: r.number });
        props.onSaved?.({ id: r.id, number: r.number });
      } else if (props.mode === 'edit') {
        const r = await api(`/api/documents/${props.id}`, { method: 'PATCH', body: JSON.stringify({ number, data, customFields: custom }) });
        props.onSaved?.({ id: r.id, number: r.number });
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(false); }
  };

  // ── États particuliers ─────────────────────────────────────────────────────
  if (created) {
    return (
      <WideModal title={`${DOC_NAMES[kind]} créé${kind === 'BL' ? '' : 'e'}`} onClose={onClose} maxWidth="max-w-md">
        <div className="flex flex-col gap-4 items-center text-center py-2">
          <p className="text-[15px] font-bold text-[#166534]">✓ {DOC_NAMES[kind]} {created.number} {kind === 'BL' ? 'créé' : 'créée'}</p>
          <p className="text-[12px] text-[#6B7A90]">Imprime-le (puis « Enregistrer au format PDF »), télécharge l&apos;Excel{isAdmin ? ' ou envoie-le par e-mail' : ''}.</p>
          <DocumentActions id={created.id} isAdmin={isAdmin} />
          <button onClick={onClose} className={`${ghostBtn} mt-1`}>Fermer</button>
        </div>
      </WideModal>
    );
  }
  if (loading || error && !data) {
    return (
      <Modal title={mode === 'edit' ? 'Modifier le document' : `Créer — ${DOC_NAMES[kind]}`} onClose={onClose}>
        {error ? (<><p className="text-[13px] text-red-600 font-medium mb-3">{error}</p><button onClick={onClose} className={ghostBtn}>Fermer</button></>) : <p className="text-[13px] text-[#8A9BB5]">Préparation…</p>}
      </Modal>
    );
  }
  if (!data || !template || !settings || !meta || !totals) return null;

  // Pop-up « infos fiscales manquantes » (facture / proforma)
  if (fiscalStep) {
    const missing = FISCAL.filter((f) => meta.missingFiscal.includes(f.key));
    return (
      <Modal title="Infos du client manquantes" onClose={onClose}>
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#4D4D4D]">Ces informations figurent sur la {kind === 'PROFORMA' ? 'proforma' : 'facture'} mais ne sont pas sur la fiche de <b>{data.client.name || 'ce client'}</b>. Tu peux les saisir maintenant (facultatif) : elles seront enregistrées sur sa fiche.</p>
          <div className="grid grid-cols-2 gap-2">
            {missing.map((f) => (
              <label key={f.key} className="block"><span className={labelCls}>{f.label}</span>
                <input className={inputCls} value={data.client[f.key] ?? ''} onChange={(e) => setClient({ [f.key]: e.target.value })} /></label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[#374151] cursor-pointer">
            <input type="checkbox" checked={saveClient} onChange={(e) => setSaveClient(e.target.checked)} className="accent-[#4CAF4F]" /> Enregistrer sur la fiche client
          </label>
          <div className="flex gap-2">
            <button className={`${ghostBtn} flex-1`} onClick={onClose}>Annuler</button>
            <button className={`${ghostBtn} flex-1`} onClick={() => { setClient({ rc: '', nif: '', nis: '', ai: '' }); setFiscalStep(false); }}>Continuer sans</button>
            <button className={`${greenBtn} flex-1`} style={{ background: '#4CAF4F' }} onClick={() => setFiscalStep(false)}>Continuer</button>
          </div>
        </div>
      </Modal>
    );
  }

  const cols = template.columns.filter((c) => c.enabled);
  const showPrice = kind !== 'BL';
  const headerCustom = template.headerFields.filter((f) => f.enabled && f.custom);
  const hasHeader = (id: string) => template.headerFields.some((f) => f.id === id && f.enabled);
  const cellInput = (c: (typeof cols)[number], l: DocLine, i: number) => {
    const cls = `${inputCls} !px-1.5 !py-1`;
    switch (c.id) {
      case 'ref': return <input className={`${cls} w-[88px]`} value={l.ref} onChange={(e) => setLine(i, { ref: e.target.value })} />;
      case 'designation': return <textarea rows={3} className={`${cls} min-w-[220px]`} value={l.designation} onChange={(e) => setLine(i, { designation: e.target.value })} />;
      case 'laize': return <input className={`${cls} w-[64px] text-center`} value={l.laize} onChange={(e) => setLine(i, { laize: e.target.value })} />;
      case 'metrage': return <input className={`${cls} w-[64px] text-center`} value={l.metrage} onChange={(e) => setLine(i, { metrage: e.target.value })} />;
      case 'quantity': return <input type="number" min={0} className={`${cls} w-[84px] text-center`} value={l.quantity || ''} onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 0 })} />;
      case 'unitPrice': return <input type="number" min={0} step="0.01" className={`${cls} w-[96px] text-right`} value={l.unitPrice || ''} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })} />;
      case 'amount': return <span className="block w-[104px] text-right text-[12px] font-bold text-[#0F172A]">{fmtMoney(lineAmount(l))}</span>;
      case 'observation': return <textarea rows={2} className={`${cls} min-w-[170px]`} value={l.observation} placeholder="ex. 100 Cartons de 30 rouleaux" onChange={(e) => setLine(i, { observation: e.target.value })} />;
      default: return <input className={`${cls} w-[110px]`} value={l.custom?.[c.id] ?? ''} onChange={(e) => setLine(i, { custom: { ...(l.custom ?? {}), [c.id]: e.target.value } })} />;
    }
  };

  return (
    <WideModal
      title={mode === 'edit' ? `Modifier — ${DOC_NAMES[kind]} ${number}` : `Créer — ${DOC_NAMES[kind]}`}
      onClose={onClose}
      maxWidth={showPreview ? 'max-w-[1400px]' : 'max-w-5xl'}
      footer={(
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="min-h-[18px]">{error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowPreview((v) => !v)} className={ghostBtn}>{showPreview ? 'Masquer l’aperçu' : 'Aperçu'}</button>
            <button type="button" onClick={onClose} className={ghostBtn}>Annuler</button>
            <button type="button" onClick={submit} disabled={busy} className={greenBtn} style={{ background: '#4CAF4F' }}>
              {busy ? 'Enregistrement…' : mode === 'edit' ? 'Enregistrer les modifications' : `Créer ${kind === 'BL' ? 'le' : 'la'} ${DOC_NAMES[kind].toLowerCase()}`}
            </button>
          </div>
        </div>
      )}
    >
      <div className={`grid gap-5 ${showPreview ? 'lg:grid-cols-[minmax(0,1fr)_500px]' : ''}`}>
        <div className="flex flex-col gap-5 min-w-0">
          {meta.warnings.map((w) => <p key={w} className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[12px] text-[#9A3412]">⚠ {w}</p>)}
          {mode === 'edit' && <p className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-[12px] text-[#1E40AF]">Modification d&apos;un document déjà émis (réservée aux admins) : chaque changement est noté dans l&apos;historique.</p>}

          {/* En-tête */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="block col-span-2 md:col-span-1"><span className={labelCls}>Numéro</span>
              <input className={`${inputCls} font-bold`} value={number} onChange={(e) => setNumber(e.target.value)} /></label>
            <label className="block"><span className={labelCls}>Date</span>
              <input type="date" className={inputCls} value={isoDay(data.date)} onChange={(e) => e.target.value && set({ date: fromDay(e.target.value) })} /></label>
            {kind === 'FACTURE' && hasHeader('dueDate') && (
              <label className="block"><span className={labelCls}>Échéance de règlement (facultatif)</span>
                <input type="date" className={inputCls} value={isoDay(data.dueDate)} onChange={(e) => set({ dueDate: fromDay(e.target.value) || undefined })} /></label>
            )}
            {kind === 'PROFORMA' && hasHeader('validity') && (
              <label className="block"><span className={labelCls}>Validité</span>
                <input className={inputCls} value={data.validity ?? ''} placeholder="ex. 30 jours" onChange={(e) => set({ validity: e.target.value })} /></label>
            )}
            {kind !== 'BL' && hasHeader('paymentMethod') && (
              <label className="block"><span className={labelCls}>Mode de règlement</span>
                <input className={inputCls} list="doc-payments" value={data.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })} />
                <datalist id="doc-payments">{PAYMENTS.map((p) => <option key={p} value={p} />)}</datalist></label>
            )}
            {headerCustom.map((f) => (
              <label key={f.id} className="block"><span className={labelCls}>{f.label.replace(/:$/, '')}</span>
                <input className={inputCls} value={data.headerExtra?.[f.id] ?? f.defaultValue ?? ''} onChange={(e) => set({ headerExtra: { ...(data.headerExtra ?? {}), [f.id]: e.target.value } })} /></label>
            ))}
            {kind !== 'BL' && data.blNumbers && data.blNumbers.length > 0 && (
              <p className="col-span-2 text-[12px] text-[#6B7A90] self-end pb-1.5">BL regroupés : <b className="text-[#0F172A]">{data.blNumbers.join(', ')}</b></p>
            )}
          </section>

          {/* Client + commande */}
          <section className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex flex-col gap-2">
              <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide">Client</p>
              <label className="block"><span className={labelCls}>Nom / raison sociale</span><input className={inputCls} value={data.client.name} onChange={(e) => setClient({ name: e.target.value })} /></label>
              <label className="block"><span className={labelCls}>Adresse</span><textarea rows={2} className={inputCls} value={data.client.address} onChange={(e) => setClient({ address: e.target.value })} /></label>
              {kind !== 'BL' && (
                <div className="grid grid-cols-2 gap-2">
                  {FISCAL.map((f) => (
                    <label key={f.key} className="block"><span className={labelCls}>{f.label}</span>
                      <input className={inputCls} value={data.client[f.key] ?? ''} onChange={(e) => setClient({ [f.key]: e.target.value })} /></label>
                  ))}
                </div>
              )}
              {kind !== 'BL' && meta.clientId && (
                <label className="flex items-center gap-2 text-[11px] text-[#6B7A90] cursor-pointer">
                  <input type="checkbox" checked={saveClient} onChange={(e) => setSaveClient(e.target.checked)} className="accent-[#4CAF4F]" /> Enregistrer RC / NIF / NIS / AI sur la fiche client
                </label>
              )}
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex flex-col gap-2">
              <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide">Commande</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className={labelCls}>Référence</span><input className={inputCls} value={data.orderRef ?? ''} onChange={(e) => set({ orderRef: e.target.value })} /></label>
                <label className="block"><span className={labelCls}>Commande du</span><input type="date" className={inputCls} value={isoDay(data.orderDate)} onChange={(e) => set({ orderDate: fromDay(e.target.value) || undefined })} /></label>
              </div>
              {kind === 'BL' && template.deliveryInfo.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span className={labelCls}>Date de livraison</span><input className={inputCls} value={data.deliveryDate ?? ''} placeholder="jj/mm/aaaa" onChange={(e) => set({ deliveryDate: e.target.value })} /></label>
                  <label className="block"><span className={labelCls}>Lieu de livraison</span><input className={inputCls} value={data.deliveryPlace ?? ''} onChange={(e) => set({ deliveryPlace: e.target.value })} /></label>
                </div>
              )}
              {kind === 'BL' && template.showQr && (
                <label className="flex items-center gap-2 text-[12px] text-[#374151] cursor-pointer">
                  <input type="checkbox" checked={data.showQr !== false} onChange={(e) => set({ showQr: e.target.checked })} className="accent-[#4CAF4F]" /> QR code de réception sur le bon de livraison
                </label>
              )}
            </div>
          </section>

          {/* Lignes */}
          <section className="flex flex-col gap-2">
            <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide">Lignes</p>
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F1F5F9]">
                  <tr>{cols.map((c) => <th key={c.id} className="px-2 py-2 text-left font-bold text-[#475569] whitespace-nowrap">{c.label}</th>)}<th className="w-8" /></tr>
                </thead>
                <tbody>
                  {data.lines.map((l, i) => (
                    <tr key={i} className="border-t border-[#E2E8F0] align-top">
                      {cols.map((c) => <td key={c.id} className="px-2 py-1.5">{cellInput(c, l, i)}</td>)}
                      <td className="px-1 py-1.5">
                        {data.lines.length > 1 && <button type="button" aria-label="Supprimer la ligne" onClick={() => setData({ ...data, lines: data.lines.filter((_, k) => k !== i) })} className="w-7 h-7 rounded-lg text-[#B91C1C] hover:bg-[#FEF2F2]">✕</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div><button type="button" onClick={() => setData({ ...data, lines: [...data.lines, { ...emptyLine(), designation: data.lines[0]?.designation ?? '' }] })} className={ghostBtn}>+ Ajouter une ligne</button></div>
          </section>

          {/* Champs ajoutés + notes */}
          {(template.customFields.some((f) => f.enabled) || true) && (
            <section className="grid md:grid-cols-2 gap-3">
              {template.customFields.filter((f) => f.enabled).map((f) => (
                <label key={f.id} className="block"><span className={labelCls}>{f.label.replace(/:$/, '')}</span>
                  <input className={inputCls} value={custom[f.id] ?? f.defaultValue ?? ''} onChange={(e) => setCustom({ ...custom, [f.id]: e.target.value })} /></label>
              ))}
              <label className="block md:col-span-2"><span className={labelCls}>Note (facultatif, imprimée sous le tableau)</span>
                <textarea rows={2} className={inputCls} value={data.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></label>
            </section>
          )}

          {/* Totaux */}
          {showPrice && template.totals.enabled && (
            <section className="self-end w-full max-w-sm rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[13px]">
              <div className="flex justify-between py-0.5"><span className="text-[#6B7A90]">{template.totals.labelHt}</span><b>{fmtMoney(totals.ht)} DA</b></div>
              <div className="flex justify-between py-0.5"><span className="text-[#6B7A90]">TVA {data.vatRate} %</span><b>{fmtMoney(totals.vat)} DA</b></div>
              <div className="flex justify-between py-0.5"><span className="text-[#6B7A90]">{template.totals.labelTtc}</span><b>{fmtMoney(totals.ttc)} DA</b></div>
              {totals.stamp > 0 && <>
                <div className="flex justify-between py-0.5"><span className="text-[#6B7A90]">{template.totals.labelStamp} (espèces)</span><b>{fmtMoney(totals.stamp)} DA</b></div>
                <div className="flex justify-between py-1 mt-1 border-t border-[#E2E8F0] text-[14px]"><span className="font-bold">Net à payer</span><b>{fmtMoney(totals.net)} DA</b></div>
              </>}
            </section>
          )}
        </div>

        {showPreview && (
          <div className="hidden lg:block">
            <div className="sticky top-0 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] overflow-hidden" style={{ width: 500, height: 700 }}>
              <iframe title="Aperçu" srcDoc={previewHtml} style={{ width: 794, height: 1123, border: 0, background: '#fff', transform: 'scale(0.63)', transformOrigin: 'top left' }} />
            </div>
          </div>
        )}
      </div>
    </WideModal>
  );
}
