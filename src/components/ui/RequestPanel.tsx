'use client';

import { useState, useEffect } from 'react';
import { StatusPill } from './StatusPill';
import { useRole } from '@/lib/role-context';

interface Template { id: string; title: string; content: string; category: string; }

const CATEGORY_LABEL: Record<string, string> = {
  CONFIRMATION: 'Confirmation', DEVIS: 'Devis', LIVRAISON: 'Livraison',
  RELANCE: 'Relance', AUTRE: 'Autre',
};

function fillTemplate(content: string, item: RequestDetail, agentName?: string) {
  return content
    .replace(/\[Nom\]/g, item.client)
    .replace(/\[Référence\]/g, item.ref)
    .replace(/\[Wilaya\]/g, item.wilaya ?? '')
    .replace(/\[Agent\]/g, agentName ?? 'notre équipe');
}

export interface RequestItem {
  designation: string;
  categorie?: string;
  quantite: number;
  prixUnitaire: number;
}

export interface RequestDetail {
  id?: string;
  ref: string;
  type: 'Commande' | 'Devis';
  source?: string;
  date: string;
  heure?: string;
  statut: string;
  montant: string;
  tva?: boolean;
  produits: string;
  items?: RequestItem[];
  client: string;
  entreprise: string;
  telephone: string;
  wilaya?: string;
  commune?: string;
  adresse?: string;
  email?: string;
  message?: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
}

function getSourceLabel(src: string) { return src === 'SITE' ? 'Site web' : 'Manuel'; }
const SOURCE_COLOR: Record<'SITE' | 'OTHER', { bg: string; color: string; border: string }> = {
  SITE:  { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  OTHER: { bg: '#FFF7ED', color: '#92400E', border: '#FDE68A' },
};

// ── Export Excel pro (mêmes infos que le PDF, en tableaux clairs et bordés) ──
async function exportExcel(item: RequestDetail) {
  const { utils, writeFile } = await import('xlsx-js-style');
  const { styleBandRow, styleHeaderRow, styleDataRows, styleSectionTitle, styleSubTotalRow, styleTotalHighlight } =
    await import('@/lib/xlsx-style');

  const lignesData: { categorie: string; designation: string; quantite: number; pu: number }[] =
    item.items && item.items.length > 0
      ? item.items.map((i) => ({ categorie: i.categorie || '—', designation: i.designation, quantite: i.quantite, pu: i.prixUnitaire }))
      : item.produits.split(',').map((p) => {
          const m = p.trim().match(/^(.+?)\s*×\s*(\d+)/);
          return { categorie: '—', designation: m ? m[1].trim() : p.trim(), quantite: m ? Number(m[2]) : 0, pu: 0 };
        });

  const ht = lignesData.reduce((acc, l) => acc + l.quantite * l.pu, 0);
  const hasTva = item.type === 'Commande' ? item.tva !== false : item.tva === true;
  const ttc = hasTva ? Math.round(ht * 1.19) : ht;

  const rows: (string | number)[][] = [];
  const push = (r: (string | number)[]) => rows.push(r);
  const NUM_COLS = 9;
  const pad = (r: (string | number)[]) => { while (r.length < NUM_COLS) r.push(''); return r; };

  // ── Bandeau PSI ──────────────────────────────────────────────────────────
  push(pad(['PSI — Paper Solutions Industry']));
  push(pad(['Centre El Qods, Niveau M1 — Chéraga, Alger | contact@psi-algerie.com']));
  push(pad([`${item.type} ${item.ref} — Exporté le ${new Date().toLocaleDateString('fr-FR')}`]));
  push(pad([]));

  // ── Tableau infos commande + client, dans un seul tableau clair ──────────
  push(pad(['INFORMATIONS']));
  const infoHeaderIdx = rows.length;
  push(['Référence', 'Type', 'Date', 'Statut', 'Client', 'Entreprise', 'Téléphone', 'Wilaya', 'Commune']);
  const infoDataStart = rows.length;
  push([item.ref, item.type, item.date + (item.heure ? ` ${item.heure}` : ''), item.statut,
    item.client, item.entreprise, item.telephone, item.wilaya || '—', item.commune || '—']);
  if (item.email || item.adresse) {
    push(pad(['', '', '', '', 'Email', item.email || '—', '', 'Adresse', item.adresse || '—']));
  }
  const infoDataEnd = rows.length - 1;
  push(pad([]));

  // ── Tableau produits : mêmes colonnes que le PDF ─────────────────────────
  push(pad([item.type === 'Commande' ? 'PRODUITS COMMANDÉS' : 'SPÉCIFICATIONS DEMANDÉES']));
  const prodHeaderIdx = rows.length;
  push(pad(['Catégorie', 'Désignation', 'Quantité', 'Prix unitaire (DA)', 'Montant (DA)']));
  const prodDataStart = rows.length;
  lignesData.forEach((l) => {
    const total = l.quantite * l.pu;
    push(pad([l.categorie, l.designation, `${l.quantite} roul.`, l.pu > 0 ? l.pu : '—', total > 0 ? total : '—']));
  });
  const prodDataEnd = rows.length - 1;
  push(pad([]));

  // ── Totaux : HT / TVA fins, TOTAL TTC mis en évidence ────────────────────
  let htRowIdx = -1, tvaRowIdx = -1;
  if (hasTva) {
    htRowIdx = rows.length;
    push(pad(['', '', '', 'Montant HT', ht]));
    tvaRowIdx = rows.length;
    push(pad(['', '', '', 'TVA 19%', ttc - ht]));
  }
  const totalRowIdx = rows.length;
  push(pad(['', '', '', hasTva ? 'TOTAL TTC' : (item.type === 'Commande' ? 'TOTAL' : 'MONTANT ESTIMÉ'), ttc > 0 ? ttc : item.montant]));

  const ws = utils.aoa_to_sheet(rows);
  // ── Largeurs colonnes : ces 5 premières colonnes servent à la fois au tableau
  // Informations (Référence/Type/Date/Statut/Client) et au tableau Produits
  // (Catégorie/Désignation/Quantité/Prix unitaire/Montant) — élargies pour que
  // la désignation produit et les libellés longs ne soient jamais coupés.
  ws['!cols'] = [
    { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
    { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: NUM_COLS - 1 } },
    // Titres de section fusionnés sur toute la largeur : sans ça, une cellule
    // vide (même "") juste après bloque le débordement du texte et le coupe.
    { s: { r: infoHeaderIdx - 1, c: 0 }, e: { r: infoHeaderIdx - 1, c: NUM_COLS - 1 } },
    { s: { r: prodHeaderIdx - 1, c: 0 }, e: { r: prodHeaderIdx - 1, c: NUM_COLS - 1 } },
  ];

  styleBandRow(ws, 0, NUM_COLS, 13);
  styleBandRow(ws, 1, NUM_COLS);
  styleBandRow(ws, 2, NUM_COLS);

  styleSectionTitle(ws, infoHeaderIdx - 1, 0);
  styleHeaderRow(ws, infoHeaderIdx, NUM_COLS);
  styleDataRows(ws, infoDataStart, infoDataEnd, NUM_COLS);

  styleSectionTitle(ws, prodHeaderIdx - 1, 0);
  styleHeaderRow(ws, prodHeaderIdx, NUM_COLS);
  styleDataRows(ws, prodDataStart, prodDataEnd, NUM_COLS);

  if (hasTva) {
    styleSubTotalRow(ws, htRowIdx, 3, 4);
    styleSubTotalRow(ws, tvaRowIdx, 3, 4);
  }
  styleTotalHighlight(ws, totalRowIdx, 3, 4);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, item.ref.slice(0, 31));
  writeFile(wb, `${item.ref}_PSI.xlsx`);
}

// ── Export PDF (impression propre N&B + logo) ───────────────────────────────
async function printDoc(item: RequestDetail) {
  // Utilise items structurés si disponibles, sinon parse la string produits
  const lignesData: { designation: string; categorie: string; quantite: number; pu: number }[] =
    item.items && item.items.length > 0
      ? item.items.map(i => ({ designation: i.designation, categorie: i.categorie || '—', quantite: i.quantite, pu: i.prixUnitaire }))
      : item.produits.split(',').map(p => {
          const m = p.trim().match(/^(.+?)\s*×\s*(\d+)/);
          return { designation: m ? m[1].trim() : p.trim(), categorie: '—', quantite: m ? Number(m[2]) : 0, pu: 0 };
        });

  const ht = lignesData.reduce((acc, l) => acc + l.quantite * l.pu, 0);
  const hasTva = item.type === 'Commande' ? item.tva !== false : item.tva === true;
  const ttc = hasTva ? Math.round(ht * 1.19) : ht;

  const rows = lignesData.map(l => {
    const totalLigne = l.quantite * l.pu;
    return `<tr>
      <td>${l.categorie}</td>
      <td>${l.designation}</td>
      <td style="text-align:center">${l.quantite} roul.</td>
      <td style="text-align:right">${l.pu > 0 ? l.pu.toLocaleString('fr-FR') + ' DA' : '—'}</td>
      <td style="text-align:right">${totalLigne > 0 ? totalLigne.toLocaleString('fr-FR') + ' DA' : '—'}</td>
    </tr>`;
  }).join('');

  // Charge le logo et le convertit en data-URL pour l'embarquer dans le HTML
  let logoHtml = '<div class="brand">PSI</div><div class="brand-sub">Paper Solutions Industry</div>';
  try {
    const resp = await fetch('/Logo PSI-new.jpeg');
    const blob = await resp.blob();
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(blob);
    });
    logoHtml = `<img src="${b64}" alt="PSI" style="height:52px;filter:grayscale(100%) contrast(110%);display:block;margin-bottom:4px"/>`;
  } catch { /* garde le fallback texte */ }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px 48px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .brand{font-size:20px;font-weight:800;letter-spacing:-0.5px}
  .brand-sub{font-size:10px;color:#666;margin-top:2px}
  .brand-addr{font-size:10px;color:#999;margin-top:6px;line-height:1.5}
  .doc-meta{text-align:right}
  .doc-type{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px}
  .doc-ref{font-size:26px;font-weight:900;letter-spacing:-1px}
  .doc-date{font-size:11px;color:#666;margin-top:4px}
  hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
  .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:10px}
  .client-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:28px}
  .client-cell{padding:10px 14px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
  .client-cell:nth-child(even){border-right:none}
  .client-cell:nth-last-child(-n+2){border-bottom:none}
  .cell-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:3px}
  .cell-value{font-size:12px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  thead tr{background:#111;color:#fff}
  thead th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px}
  tbody tr:nth-child(even){background:#f9fafb}
  tbody td{padding:9px 12px;font-size:12px;border-bottom:1px solid #f0f0f0}
  .total-row{display:flex;justify-content:flex-end;margin-top:8px}
  .total-box{border:2px solid #111;border-radius:6px;padding:12px 20px;min-width:220px;display:flex;justify-content:space-between;align-items:center}
  .total-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
  .total-amount{font-size:18px;font-weight:900}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#aaa;display:flex;justify-content:space-between}
  @media print{body{padding:24px 32px}@page{margin:0;size:A4}}
</style></head><body>
<div class="header">
  <div>
    ${logoHtml}
    <div class="brand-addr">Centre El Qods, Niveau M1 — Chéraga, Alger<br/>contact@psi-algerie.com</div>
  </div>
  <div class="doc-meta">
    <div class="doc-type">${item.type}</div>
    <div class="doc-ref">${item.ref}</div>
    <div class="doc-date">${item.date}${item.heure ? ` · ${item.heure}` : ''}</div>
  </div>
</div>
<hr/>
<div class="section-title">Client</div>
<div class="client-grid">
  <div class="client-cell"><div class="cell-label">Nom</div><div class="cell-value">${item.client}</div></div>
  <div class="client-cell"><div class="cell-label">Entreprise</div><div class="cell-value">${item.entreprise}</div></div>
  <div class="client-cell"><div class="cell-label">Téléphone</div><div class="cell-value">${item.telephone}</div></div>
  <div class="client-cell"><div class="cell-label">Wilaya</div><div class="cell-value">${item.wilaya || '—'}</div></div>
  <div class="client-cell"><div class="cell-label">Commune</div><div class="cell-value">${item.commune || '—'}</div></div>
  ${item.adresse ? `<div class="client-cell" style="grid-column:1/-1"><div class="cell-label">Adresse</div><div class="cell-value">${item.adresse}</div></div>` : ''}
</div>
<div class="section-title">${item.type === 'Commande' ? 'Produits commandés' : 'Spécifications demandées'}</div>
<table>
  <thead><tr><th>Catégorie</th><th>Désignation</th><th style="text-align:center">Quantité</th><th style="text-align:right">Prix unitaire</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="total-row">
  <div style="min-width:260px">
    ${hasTva ? `
    <div style="display:flex;justify-content:space-between;padding:8px 20px;border:1px solid #e5e7eb;border-radius:6px 6px 0 0;font-size:12px">
      <span style="color:#666">Montant HT</span>
      <span style="font-weight:600">${ht.toLocaleString('fr-FR')} DA</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 20px;border:1px solid #e5e7eb;border-top:none;font-size:12px">
      <span style="color:#666">TVA 19%</span>
      <span style="font-weight:600">${(ttc - ht).toLocaleString('fr-FR')} DA</span>
    </div>
    ` : ''}
    <div class="total-box" style="${hasTva ? 'border-radius:0 0 6px 6px;border-top:none' : ''}">
      <span class="total-label">${hasTva ? 'Total TTC' : item.type === 'Commande' ? 'Total HT' : 'Estimé'}</span>
      <span class="total-amount">${ttc > 0 ? ttc.toLocaleString('fr-FR') + ' DA' : item.montant}</span>
    </div>
  </div>
</div>
${item.message ? `<div style="margin-top:24px"><div class="section-title">Message du client</div><div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;font-size:12px;color:#374151;line-height:1.6">${item.message}</div></div>` : ''}
<div class="footer">
  <span>${item.ref} · PSI Paper Solutions Industry</span>
  <span>psi-algerie.com</span>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 600);
}

function buildWAMsg(item: RequestDetail) {
  return encodeURIComponent(`Bonjour ${item.client},\n\nSuite à votre ${item.type.toLowerCase()} ${item.ref} du ${item.date}, nous revenons vers vous.\n\nCordialement,\nÉquipe PSI`);
}

function TemplatePopover({ item, mode, recipientEmail, onClose }: {
  item: RequestDetail; mode: 'wa' | 'mail' | 'sms'; recipientEmail?: string; onClose: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const select = (t: Template) => {
    setSelected(t);
    setPreview(fillTemplate(t.content, item));
    setError('');
  };

  const send = async () => {
    if (!preview || sending) return;
    const phone = item.telephone.replace(/\s/g, '').replace('+', '');
    if (mode === 'wa') {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(preview)}`, '_blank');
      onClose();
      return;
    }
    if (mode === 'sms') {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(preview)}`;
      onClose();
      return;
    }

    // Mail : envoi direct côté serveur avec l'adresse de l'entreprise comme expéditeur
    const to = recipientEmail || item.email || '';
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `${item.type} ${item.ref} — PSI`,
          text: preview,
          html: preview.replace(/\n/g, '<br/>'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Échec de l\'envoi');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const accentColor = mode === 'wa' ? '#25D366' : mode === 'sms' ? '#3B82F6' : '#4CAF4F';
  const accentBg    = '#F0FDF4';

  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-[#F2F4F7] overflow-hidden flex flex-col"
          style={{ width: 480, maxWidth: '92vw', maxHeight: '80vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7]">
            <p className="text-[13px] font-bold text-[#0F172A]">
              {mode === 'wa' ? '💬 WhatsApp' : mode === 'sms' ? '📱 SMS' : '✉️ Email'} — Choisir un template
            </p>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1]">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Liste templates cliquables */}
          {!selected ? (
            <div className="overflow-y-auto py-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => select(t)}
                  className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors group">
                  <div>
                    <p className="text-[13px] font-semibold text-[#0F172A] group-hover:text-[#4CAF4F] transition-colors">{t.title}</p>
                    <p className="text-[11px] text-[#ABBED1] mt-0.5">{CATEGORY_LABEL[t.category] ?? t.category}</p>
                  </div>
                  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="flex-shrink-0 text-[#ABBED1] group-hover:text-[#4CAF4F] transition-colors"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ))}
            </div>
          ) : (
            /* Édition du message */
            <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
              <button onClick={() => setSelected(null)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A9BB5] hover:text-[#374151] transition-colors self-start">
                <svg width={12} height={12} fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {selected.title}
              </button>
              <textarea
                value={preview}
                onChange={e => setPreview(e.target.value)}
                rows={7}
                className="w-full resize-none text-[13px] text-[#374151] leading-relaxed border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:border-[#4CAF4F] focus:ring-2 focus:ring-[#4CAF4F]/10 transition-all"
              />
              {error && <p className="text-[11px] font-semibold text-[#EF4444]">{error}</p>}
              <button onClick={send} disabled={sending}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold border transition-colors disabled:opacity-60"
                style={{ borderColor: accentColor, color: accentColor, background: accentBg }}>
                {sending ? 'Envoi en cours…' : mode === 'wa' ? 'Ouvrir WhatsApp →' : mode === 'sms' ? 'Ouvrir SMS →' : 'Envoyer l\'email →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export interface ConvertPrixData { totalOverride?: number; itemPrices?: { designation: string; unitPrice: number }[]; }

function PriceModal({ item, onConfirm, onClose }: {
  item: RequestDetail;
  onConfirm: (montant: string, prix: ConvertPrixData) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'unitaire' | 'total'>('unitaire');
  const [totalGlobal, setTotalGlobal] = useState('');
  const [itemPrices, setItemPrices] = useState<{ designation: string; qty: number; pu: string }[]>(
    (item.items ?? []).map(i => ({ designation: i.designation, qty: i.quantite, pu: i.prixUnitaire > 0 ? String(i.prixUnitaire) : '' }))
  );

  const totalCalc = itemPrices.reduce((acc, i) => acc + i.qty * (parseFloat(i.pu) || 0), 0);
  const inputCls = "w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-[13px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all";
  const hasItems = itemPrices.length > 0;

  const handleConfirm = () => {
    if (mode === 'total') {
      const t = parseFloat(totalGlobal) || 0;
      onConfirm(t > 0 ? `${t.toLocaleString('fr-FR')} DA` : 'À définir', { totalOverride: t });
    } else {
      onConfirm(totalCalc > 0 ? `${totalCalc.toLocaleString('fr-FR')} DA` : 'À définir',
        { itemPrices: itemPrices.map(i => ({ designation: i.designation, unitPrice: parseFloat(i.pu) || 0 })) });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl p-6 w-[460px] max-w-[94vw]">
          <p className="text-[16px] font-bold text-[#0F172A] mb-1">Confirmer le devis — fixer le prix</p>
          <p className="text-[12px] text-[#8A9BB5] mb-4">{item.ref} — {item.entreprise || item.client}</p>

          {/* Toggle mode — n'affiche l'unitaire que si on a des produits */}
          {hasItems && (
            <div className="flex gap-2 mb-4 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              {(['unitaire', 'total'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all"
                  style={{ background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0F172A' : '#8A9BB5', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                  {m === 'unitaire' ? 'Prix unitaire par produit' : 'Total global direct'}
                </button>
              ))}
            </div>
          )}

          {hasItems && mode === 'unitaire' ? (
            <div className="flex flex-col gap-2 mb-4">
              {itemPrices.map((it, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-[#374151] flex-1 truncate">{it.designation} <span className="text-[#ABBED1]">× {it.qty}</span></span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input type="number" min="0" value={it.pu} onChange={e => setItemPrices(p => p.map((x, j) => j === i ? { ...x, pu: e.target.value } : x))}
                      placeholder="Prix unit." className={`${inputCls} w-28`} />
                    <span className="text-[11px] text-[#8A9BB5]">DA</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-[#F2F4F7] mt-1">
                <span className="text-[12px] font-semibold text-[#374151]">Total calculé</span>
                <span className="text-[15px] font-extrabold text-[#4CAF4F]">{totalCalc.toLocaleString('fr-FR')} DA</span>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Montant de la commande</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" autoFocus value={totalGlobal} onChange={e => setTotalGlobal(e.target.value)}
                  placeholder="Ex: 45000" className={inputCls} />
                <span className="text-[12px] text-[#8A9BB5] flex-shrink-0">DA</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151]">Annuler</button>
            <button onClick={handleConfirm} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
              Confirmer le devis
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Modale "Modifier la commande" — édition complète des lignes ──────────────
interface ProdOption { id: string; reference: string; price: number; }
interface EditLine { productId: string | null; designation: string; quantite: number; prixUnitaire: number; }

function EditOrderModal({ item, onClose, onSaved }: {
  item: RequestDetail; onClose: () => void; onSaved: () => void;
}) {
  const [products, setProducts] = useState<ProdOption[]>([]);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then((data: ProdOption[]) => {
      setProducts(data);
      // Initialise les lignes depuis la commande, en retrouvant le productId via la référence
      const init: EditLine[] = (item.items ?? []).map(it => {
        const p = data.find(pr => pr.reference === it.designation);
        return { productId: p?.id ?? null, designation: it.designation, quantite: it.quantite, prixUnitaire: it.prixUnitaire };
      });
      setLines(init.length > 0 ? init : [{ productId: null, designation: '', quantite: 1, prixUnitaire: 0 }]);
    }).catch(() => {});
  }, [item.items]);

  const setLine = (i: number, patch: Partial<EditLine>) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const pickProduct = (i: number, p: ProdOption) => {
    setLine(i, { productId: p.id, designation: p.reference, prixUnitaire: p.price });
    setPickerOpen(null);
  };
  const total = lines.reduce((acc, l) => acc + l.quantite * l.prixUnitaire, 0);
  const inputCls = "px-3 py-2 rounded-xl border border-[#E2E8F0] text-[13px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[2px] focus:ring-[#4CAF4F]/15 transition-all";

  const save = async () => {
    if (!item.id) return;
    setSaving(true);
    const items = lines
      .filter(l => l.productId && l.quantite > 0)
      .map(l => ({ productId: l.productId, quantity: l.quantite, unitPrice: l.prixUnitaire }));
    const res = await fetch(`/api/orders/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'Impossible de modifier la commande.');
      return;
    }
    onSaved();
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl p-6 w-[560px] max-w-[94vw] max-h-[88vh] flex flex-col">
          <p className="text-[16px] font-bold text-[#0F172A] mb-1">Modifier la commande</p>
          <p className="text-[12px] text-[#8A9BB5] mb-4">{item.ref} — {item.entreprise || item.client}</p>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {/* En-têtes */}
            <div className="grid grid-cols-[1fr_70px_100px_28px] gap-2 mb-2 px-1">
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Produit</span>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Qté</span>
              <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wide">Prix unit.</span>
              <span />
            </div>
            <div className="flex flex-col gap-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_100px_28px] gap-2 items-center">
                  {/* Sélecteur produit */}
                  <div className="relative">
                    <button type="button" onClick={() => setPickerOpen(pickerOpen === i ? null : i)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[13px] hover:border-[#4CAF4F]"
                      style={{ color: l.designation ? '#0F172A' : '#94A3B8' }}>
                      <span className="truncate">{l.designation || '— Réf —'}</span>
                      <svg width={12} height={12} fill="none" viewBox="0 0 24 24" className="flex-shrink-0 text-[#ABBED1]"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {pickerOpen === i && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setPickerOpen(null)} />
                        <div className="absolute top-full left-0 right-0 mt-1 z-[110] bg-white rounded-xl border border-[#E2E8F0] shadow-xl overflow-hidden">
                          <div className="max-h-[180px] overflow-y-auto py-1">
                            {products.map(p => (
                              <button key={p.id} type="button" onClick={() => pickProduct(i, p)}
                                className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-[#F0FDF4]">
                                <span className="text-[13px] font-semibold text-[#0F172A]">{p.reference}</span>
                                <span className="text-[11px] text-[#ABBED1]">{p.price.toLocaleString('fr-FR')} DA</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <input type="number" min="1" value={l.quantite} onChange={e => setLine(i, { quantite: Math.max(1, Number(e.target.value)) })} className={inputCls} />
                  <input type="number" min="0" value={l.prixUnitaire} onChange={e => setLine(i, { prixUnitaire: Number(e.target.value) })} className={inputCls} />
                  <button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2]" title="Retirer">
                    <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setLines(prev => [...prev, { productId: null, designation: '', quantite: 1, prixUnitaire: 0 }])}
              className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C] transition-colors">
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Ajouter un produit
            </button>
          </div>

          <div className="flex justify-between items-center py-3 mt-2 border-t border-[#F2F4F7]">
            <span className="text-[13px] font-semibold text-[#374151]">Total</span>
            <span className="text-[17px] font-extrabold text-[#4CAF4F]">{total.toLocaleString('fr-FR')} DA</span>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151]">Annuler</button>
            <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface RequestPanelProps {
  item: RequestDetail;
  onClose: () => void;
  onStatusChange?: (ref: string, newStatut: string) => void;
  onConfirmQuoteWithPrice?: (item: RequestDetail & { _prix?: ConvertPrixData }) => void;
  users?: { id: string; name: string }[];
  onAssign?: (id: string, type: string, assignedToId: string | null) => void;
}

// ── Bouton icône rond ────────────────────────────────────────────────────────
// hoverColor : si fourni, la bordure/icône/texte passent à cette couleur au survol
// (utilisé pour les boutons d'export PDF/Excel — survol vert clair)
function IconBtn({ href, onClick, title, color, hoverColor, children }: {
  href?: string; onClick?: () => void; title: string; color: string; hoverColor?: string; children: React.ReactNode;
}) {
  const cls = `w-9 h-9 rounded-full border flex items-center justify-center transition-colors`;
  const style = { borderColor: `${color}40`, color };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    const c = hoverColor ?? color;
    e.currentTarget.style.background = `${c}1A`;
    e.currentTarget.style.borderColor = c;
    e.currentTarget.style.color = c;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.borderColor = `${color}40`;
    e.currentTarget.style.color = color;
  };
  if (href) return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={title} className={cls} style={style}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
    </a>
  );
  return (
    <button onClick={onClick} title={title} className={cls} style={style}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
    </button>
  );
}

// ── Petit badge coloré avec une lettre (Gmail/Yahoo/Outlook/Viber n'ont pas
// besoin d'un logo pixel-perfect, juste d'être reconnaissables au coup d'œil).
function LetterBadge({ letter, bg }: { letter: string; bg: string }) {
  return (
    <span className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
      style={{ background: bg, fontSize: 9, fontWeight: 800 }}>
      {letter}
    </span>
  );
}

interface ContactOption { label: string; icon: React.ReactNode; onClick: () => void; }

// ── Bouton icône rond avec menu déroulant d'options (choix de l'outil) ───────
function ContactDropdown({ title, color, hoverColor, children, options }: {
  title: string; color: string; hoverColor?: string; children: React.ReactNode; options: ContactOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <IconBtn onClick={() => setOpen(o => !o)} title={title} color={color} hoverColor={hoverColor}>
        {children}
      </IconBtn>
      {open && (
        <>
          <div className="fixed inset-0 z-[95]" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 z-[100] bg-white rounded-xl border border-[#E2E8F0] shadow-xl overflow-hidden py-1"
            style={{ minWidth: 200 }}>
            {options.map((opt, i) => (
              <button key={i} onClick={() => { opt.onClick(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#F8FAFC] transition-colors">
                {opt.icon}
                <span className="text-[12px] font-semibold text-[#374151]">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function RequestPanel({ item, onClose, onStatusChange, onConfirmQuoteWithPrice, users, onAssign }: RequestPanelProps) {
  const { can } = useRole();
  const canModifierStatuts = can('modifier_statuts');
  const canAssign = can('assign_commandes');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [templateMode, setTemplateMode] = useState<'wa' | 'mail' | 'sms' | null>(null);
  const [emailOverride, setEmailOverride] = useState('');
  const isCommande = item.type === 'Commande';
  const isArchived = item.statut === 'Livré' || item.statut === 'Annulé';

  const saveNotes = async () => {
    if (!item.id) return;
    const endpoint = isCommande ? `/api/orders/${item.id}` : `/api/quotes/${item.id}`;
    await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: notesValue }) });
    setEditingNotes(false);
    onStatusChange?.(item.ref, item.statut);
  };

  const phoneDigits = item.telephone.replace(/\s/g, '');
  const waPhone = phoneDigits.replace('+', '');
  const callHref = `tel:${phoneDigits}`;
  const openMail = () => {
    if (!item.email && !emailOverride) {
      const entered = window.prompt('Adresse email du destinataire :', '');
      if (!entered) return;
      setEmailOverride(entered);
    }
    setTemplateMode('mail');
  };

  const lignes = item.produits.split(',').map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 600, maxWidth: '94vw', maxHeight: '92vh' }}>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7] flex-shrink-0">
            <StatusPill status={item.statut} />
            <div className="flex items-center gap-2">
              <IconBtn onClick={() => printDoc(item)} title="Imprimer en PDF" color="#374151" hoverColor="#4CAF4F">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </IconBtn>
              <IconBtn onClick={() => exportExcel(item)} title="Exporter vers Excel" color="#374151" hoverColor="#4CAF4F">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </IconBtn>
              <div className="w-px h-5 bg-[#E2E8F0] mx-1" />
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1] hover:text-[#374151] transition-colors">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* ── Corps scrollable ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-6 flex flex-col gap-6">

              {/* En-tête style facture */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/Logo PSI-new.jpeg" alt="PSI" className="h-9 w-9 object-contain rounded-lg" />
                    <div>
                      <p className="text-[15px] font-extrabold text-[#0F172A] leading-none">PSI</p>
                      <p className="text-[10px] text-[#ABBED1] leading-none mt-0.5">Paper Solutions Industry</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#ABBED1] mt-1">Centre El Qods, Niveau M1 — Chéraga, Alger</p>
                  <p className="text-[11px] text-[#ABBED1]">contact@psi-algerie.com</p>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-extrabold text-[#0F172A] font-mono leading-none">{item.ref}</p>
                  <p className="text-[12px] text-[#8A9BB5] mt-1">{item.date}{item.heure ? ` · ${item.heure}` : ''}</p>
                  <div className="flex items-center justify-end gap-2 mt-1.5">
                    <p className="text-[11px] font-semibold" style={{ color: isCommande ? '#4CAF4F' : '#8B5CF6' }}>{item.type}</p>
                    {item.source && (() => {
                      const sc = item.source === 'SITE' ? SOURCE_COLOR.SITE : SOURCE_COLOR.OTHER;
                      return (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                          {getSourceLabel(item.source)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#F2F4F7]" />

              {/* Infos client */}
              <div>
                <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-3">Client</p>
                <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden">
                  <div className="grid grid-cols-2">
                    {[
                      { label: 'Nom', value: item.client },
                      { label: 'Entreprise', value: item.entreprise },
                      { label: 'Téléphone', value: item.telephone },
                      { label: 'Wilaya', value: item.wilaya || '—' },
                      { label: 'Commune', value: item.commune || '—' },
                      ...(item.email ? [{ label: 'Email', value: item.email }] : []),
                      ...(item.adresse ? [{ label: 'Adresse', value: item.adresse }] : []),
                    ].map((info, i) => (
                      <div key={i} className="px-4 py-3 border-b border-r border-[#E2E8F0] last:border-b-0">
                        <p className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wider">{info.label}</p>
                        <p className="text-[13px] font-semibold text-[#0F172A] mt-0.5">{info.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Produits */}
              <div>
                <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-3">
                  {isCommande ? 'Produits commandés' : 'Spécifications demandées'}
                </p>
                <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto] bg-[#F8FAFC] px-4 py-2 border-b border-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wider">Référence</span>
                    <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wider">Qté</span>
                  </div>
                  {lignes.map((ligne, i) => {
                    const match = ligne.match(/^(.+?)\s*×\s*(\d+)/);
                    const ref = match ? match[1].trim() : ligne;
                    const qty = match ? `${match[2]} roul.` : '—';
                    return (
                      <div key={i} className="grid grid-cols-[1fr_auto] px-4 py-3 border-b border-[#E2E8F0] last:border-b-0">
                        <span className="text-[13px] font-medium text-[#374151]">{ref}</span>
                        <span className="text-[13px] font-semibold text-[#8A9BB5] tabular-nums">{qty}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pris en charge par */}
              <div>
                <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-2">Pris en charge par</p>
                {canAssign && onAssign && users ? (
                  <select
                    value={item.assignedToId ?? ''}
                    onChange={(e) => item.id && onAssign(item.id, item.type, e.target.value || null)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#374151] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white">
                    <option value="">— Non assigné —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                ) : (
                  <div className="rounded-xl border-2 border-[#E2E8F0] px-4 py-3">
                    <p className="text-[13px] font-semibold text-[#374151]">{item.assignedToName ?? '— Non assigné —'}</p>
                  </div>
                )}
              </div>

              {item.message && (
                <div>
                  <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-2">Message du client</p>
                  <div className="rounded-xl border-2 border-[#E2E8F0] px-4 py-3">
                    <p className="text-[13px] text-[#374151] leading-relaxed">{item.message}</p>
                  </div>
                </div>
              )}

              {/* Total — toujours tout en bas */}
              <div className="flex items-center justify-between px-4 py-4 rounded-xl" style={{ background: isCommande ? '#F0FDF4' : '#F5F3FF' }}>
                <span className="text-[13px] font-semibold" style={{ color: isCommande ? '#166534' : '#5B21B6' }}>
                  {isCommande ? 'Total commande' : 'Montant estimé'}
                </span>
                <span className="text-[22px] font-extrabold" style={{ color: isCommande ? '#4CAF4F' : '#8B5CF6' }}>
                  {item.montant}
                </span>
              </div>

            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 border-t border-[#F2F4F7] px-6 py-4 bg-[#FAFCFF]">
            <div className="flex items-center justify-between">

              {/* Gauche : icônes rondes contact + export */}
              <div className="flex items-center gap-2">
                {/* Appeler : choix du canal (téléphone, WhatsApp, Viber) */}
                <ContactDropdown title="Appeler" color="#3B82F6" hoverColor="#3B82F6" options={[
                  {
                    label: 'Appel téléphonique', onClick: () => { window.location.href = callHref; },
                    icon: <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="text-[#3B82F6] flex-shrink-0"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
                  },
                  {
                    label: 'WhatsApp', onClick: () => window.open(`https://wa.me/${waPhone}`, '_blank'),
                    icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="#25D366" className="flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.522 5.854L.057 23.714a.5.5 0 00.61.639l5.963-1.562A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.862 9.862 0 012.106 12C2.106 6.53 6.53 2.106 12 2.106c5.471 0 9.894 4.424 9.894 9.894 0 5.471-4.423 9.894-9.894 9.894z"/></svg>,
                  },
                  {
                    label: 'Viber', onClick: () => { window.location.href = `viber://chat?number=%2B${waPhone.replace(/^0/, '')}`; },
                    icon: <LetterBadge letter="V" bg="#7360F2" />,
                  },
                ]}>
                  <svg width={15} height={15} fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </ContactDropdown>

                {/* Message : choix de l'appli (WhatsApp, SMS) */}
                <ContactDropdown title="Message" color="#25D366" hoverColor="#25D366" options={[
                  {
                    label: 'WhatsApp', onClick: () => setTemplateMode('wa'),
                    icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="#25D366" className="flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.522 5.854L.057 23.714a.5.5 0 00.61.639l5.963-1.562A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.862 9.862 0 012.106 12C2.106 6.53 6.53 2.106 12 2.106c5.471 0 9.894 4.424 9.894 9.894 0 5.471-4.423 9.894-9.894 9.894z"/></svg>,
                  },
                  {
                    label: 'SMS', onClick: () => setTemplateMode('sms'),
                    icon: <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="text-[#3B82F6] flex-shrink-0"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  },
                ]}>
                  <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </ContactDropdown>

                {/* Email : envoi direct depuis l'adresse de l'entreprise — demande l'adresse du client si absente */}
                <IconBtn onClick={openMail} title="Envoyer un email" color="#F97316" hoverColor="#F97316">
                  <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </IconBtn>
                <button onClick={() => { setNotesValue(''); setEditingNotes(true); }}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-full border text-[11px] font-bold transition-colors"
                  style={{ borderColor: '#ABBED140', color: '#8A9BB5' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Notes
                </button>
                {isCommande && !isArchived && canModifierStatuts && (
                  <button onClick={() => setShowEdit(true)}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-full border text-[11px] font-bold transition-colors"
                    style={{ borderColor: '#4CAF4F40', color: '#4CAF4F' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDF4')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Modifier
                  </button>
                )}
              </div>

              {/* Droite : actions statut */}
              <div className="flex flex-col items-end gap-2">
                {!isArchived && onStatusChange && canModifierStatuts && (
                  <>
                    {/* Commande en attente → Confirmer */}
                    {isCommande && item.statut === 'En attente' && (
                      <button onClick={() => { onStatusChange(item.ref, 'Confirmé'); onClose(); }}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
                        Confirmer
                      </button>
                    )}
                    {/* Commande confirmée → Marquer Livré */}
                    {isCommande && item.statut === 'Confirmé' && (
                      <button onClick={() => { onStatusChange(item.ref, 'Livré'); onClose(); }}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
                        Marquer Livré
                      </button>
                    )}
                    {/* Devis en attente → Confirmer (fixe le prix via popup) */}
                    {!isCommande && item.statut === 'En attente' && onConfirmQuoteWithPrice && (
                      <button onClick={() => setShowPriceModal(true)}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
                        Confirmer
                      </button>
                    )}
                    {/* Devis confirmé → Marquer Livré */}
                    {!isCommande && item.statut === 'Confirmé' && (
                      <button onClick={() => { onStatusChange(item.ref, 'Livré'); onClose(); }}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
                        Marquer Livré
                      </button>
                    )}
                    <button onClick={() => { if (window.confirm(`Annuler ${item.type.toLowerCase()} de ${item.entreprise || item.client} ?`)) { onStatusChange(item.ref, 'Annulé'); onClose(); } }}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#FECACA] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
                      Annuler
                    </button>
                  </>
                )}

                {item.statut === 'Annulé' && onStatusChange && canModifierStatuts && (
                  <button onClick={() => { onStatusChange(item.ref, 'En attente'); onClose(); }}
                    className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#ABBED1]/60 text-[#374151] hover:border-[#374151]/40 transition-colors">
                    Restaurer
                  </button>
                )}
              </div>

            </div>
            <p className="text-[10px] text-[#ABBED1] mt-3">{item.ref} · PSI Paper Solutions Industry · psi-algerie.com</p>
          </div>

        </div>
      </div>

      {showEdit && (
        <EditOrderModal
          item={item}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            onStatusChange?.(item.ref, item.statut); // déclenche un refetch côté parent
            onClose();
          }}
        />
      )}

      {editingNotes && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={() => setEditingNotes(false)} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl p-6 w-[440px] max-w-[94vw]">
              <p className="text-[15px] font-bold text-[#0F172A] mb-1">Notes internes</p>
              <p className="text-[12px] text-[#8A9BB5] mb-4">{item.ref} — non visible par le client</p>
              <textarea autoFocus value={notesValue} onChange={e => setNotesValue(e.target.value)} rows={5} placeholder="Remarques internes, conditions particulières…"
                className="w-full resize-none px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#374151] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setEditingNotes(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151]">Annuler</button>
                <button onClick={saveNotes} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </>
      )}


      {showPriceModal && onConfirmQuoteWithPrice && (
        <PriceModal
          item={item}
          onClose={() => setShowPriceModal(false)}
          onConfirm={(montant, prix) => {
            onConfirmQuoteWithPrice({ ...item, montant, _prix: prix });
            setShowPriceModal(false);
            onClose();
          }}
        />
      )}

      {templateMode && (
        <TemplatePopover
          item={item}
          mode={templateMode}
          recipientEmail={emailOverride}
          onClose={() => setTemplateMode(null)}
        />
      )}
    </>
  );
}
