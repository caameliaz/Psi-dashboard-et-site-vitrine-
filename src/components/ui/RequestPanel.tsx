'use client';

import { useState, useEffect } from 'react';
import { StatusPill } from './StatusPill';

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

export interface RequestDetail {
  id?: string;
  ref: string;
  type: 'Commande' | 'Devis';
  date: string;
  heure?: string;
  statut: string;
  montant: string;
  produits: string;
  client: string;
  entreprise: string;
  telephone: string;
  wilaya?: string;
  adresse?: string;
  email?: string;
  message?: string;
}

// ── Export Excel pro (style facture N&B) ────────────────────────────────────
async function exportExcel(item: RequestDetail) {
  const { utils, writeFile } = await import('xlsx');
  const lignes = item.produits.split(',').map((p) => p.trim()).filter(Boolean);
  const rows: (string | number)[][] = [
    ['PSI — Paper Solutions Industry', '', '', ''],
    ['Centre El Qods, Niveau M1 — Chéraga, Alger', '', '', ''],
    ['contact@psi-algerie.com', '', '', ''],
    ['', '', '', ''],
    [item.type.toUpperCase(), '', 'Réf :', item.ref],
    ['', '', 'Date :', item.date + (item.heure ? ` ${item.heure}` : '')],
    ['', '', 'Statut :', item.statut],
    ['', '', '', ''],
    ['CLIENT', '', '', ''],
    ['Nom', item.client, 'Entreprise', item.entreprise],
    ['Téléphone', item.telephone, 'Wilaya', item.wilaya || '—'],
    ...(item.email ? [['Email', item.email, '', '']] : []),
    ...(item.adresse ? [['Adresse', item.adresse, '', '']] : []),
    ['', '', '', ''],
    ['DÉSIGNATION', '', 'QTÉ', 'MONTANT'],
    ...lignes.map((l) => {
      const m = l.match(/^(.+?)\s*×\s*(\d+)/);
      return [m ? m[1].trim() : l, '', m ? `${m[2]} roul.` : '—', ''];
    }),
    ['', '', '', ''],
    [item.type === 'Commande' ? 'TOTAL COMMANDE' : 'MONTANT ESTIMÉ', '', '', item.montant],
    ['', '', '', ''],
    ['Document généré par PSI — psi-algerie.com', '', '', ''],
  ];
  const ws = utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 14 }, { wch: 18 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, item.ref);
  writeFile(wb, `${item.ref}_PSI.xlsx`);
}

// ── Export PDF (impression propre N&B + logo) ───────────────────────────────
async function printDoc(item: RequestDetail) {
  const lignes = item.produits.split(',').map((p) => p.trim()).filter(Boolean);
  const rows = lignes.map((l) => {
    const m = l.match(/^(.+?)\s*×\s*(\d+)/);
    return `<tr><td>${m ? m[1].trim() : l}</td><td>${m ? `${m[2]} roul.` : '—'}</td><td>—</td></tr>`;
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
  ${item.adresse ? `<div class="client-cell" style="grid-column:1/-1"><div class="cell-label">Adresse</div><div class="cell-value">${item.adresse}</div></div>` : ''}
</div>
<div class="section-title">${item.type === 'Commande' ? 'Produits commandés' : 'Spécifications demandées'}</div>
<table>
  <thead><tr><th>Désignation</th><th>Quantité</th><th>Montant</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="total-row">
  <div class="total-box">
    <span class="total-label">${item.type === 'Commande' ? 'Total' : 'Estimé'}</span>
    <span class="total-amount">${item.montant}</span>
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

function TemplatePopover({ item, mode, onClose }: {
  item: RequestDetail; mode: 'wa' | 'mail'; onClose: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const select = (t: Template) => {
    setSelected(t);
    setPreview(fillTemplate(t.content, item));
  };

  const send = () => {
    if (!preview) return;
    if (mode === 'wa') {
      const phone = item.telephone.replace(/\s/g, '').replace('+', '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(preview)}`, '_blank');
    } else {
      window.location.href = `mailto:${item.email ?? ''}?subject=${encodeURIComponent(`${item.type} ${item.ref} — PSI`)}&body=${encodeURIComponent(preview)}`;
    }
    onClose();
  };

  const accentColor = mode === 'wa' ? '#25D366' : '#0D9488';
  const accentBg    = mode === 'wa' ? '#F0FDF4' : '#F0FDFA';

  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-[#F2F4F7] overflow-hidden flex flex-col"
          style={{ width: 480, maxWidth: '92vw', maxHeight: '80vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7]">
            <p className="text-[13px] font-bold text-[#0F172A]">
              {mode === 'wa' ? '💬 WhatsApp' : '✉️ Email'} — Choisir un template
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
                    <p className="text-[13px] font-semibold text-[#0F172A] group-hover:text-[#0D9488] transition-colors">{t.title}</p>
                    <p className="text-[11px] text-[#ABBED1] mt-0.5">{CATEGORY_LABEL[t.category] ?? t.category}</p>
                  </div>
                  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="flex-shrink-0 text-[#ABBED1] group-hover:text-[#0D9488] transition-colors"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                className="w-full resize-none text-[13px] text-[#374151] leading-relaxed border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all"
              />
              <button onClick={send}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold border transition-colors"
                style={{ borderColor: accentColor, color: accentColor, background: accentBg }}>
                {mode === 'wa' ? 'Ouvrir WhatsApp →' : 'Ouvrir messagerie →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ConvertModal({ item, onConfirm, onClose }: { item: RequestDetail; onConfirm: (montant: string) => void; onClose: () => void }) {
  const [montant, setMontant] = useState('');
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl p-6 w-[400px] max-w-[92vw]">
          <p className="text-[16px] font-bold text-[#0F172A] mb-1">Valider le devis</p>
          <p className="text-[13px] text-[#8A9BB5] mb-5">{item.ref} — {item.client} · {item.entreprise}</p>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Montant de la commande</label>
          <input autoFocus value={montant} onChange={(e) => setMontant(e.target.value)}
            placeholder="ex: 45 000 DA"
            className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all mb-5" />
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151]">Annuler</button>
            <button onClick={() => onConfirm(montant.trim() || 'À définir')} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
              Créer la commande
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
  onConvertToOrder?: (item: RequestDetail) => void;
}

// ── Bouton icône rond ────────────────────────────────────────────────────────
function IconBtn({ href, onClick, title, color, children }: {
  href?: string; onClick?: () => void; title: string; color: string; children: React.ReactNode;
}) {
  const cls = `w-9 h-9 rounded-full border flex items-center justify-center transition-colors`;
  const style = { borderColor: `${color}40`, color };
  if (href) return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={title} className={cls} style={style}
      onMouseEnter={(e) => (e.currentTarget.style.background = `${color}12`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </a>
  );
  return (
    <button onClick={onClick} title={title} className={cls} style={style}
      onMouseEnter={(e) => (e.currentTarget.style.background = `${color}12`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </button>
  );
}

export function RequestPanel({ item, onClose, onStatusChange, onConvertToOrder }: RequestPanelProps) {
  const [showConvert, setShowConvert] = useState(false);
  const [templateMode, setTemplateMode] = useState<'wa' | 'mail' | null>(null);
  const isCommande = item.type === 'Commande';
  const isArchived = item.statut === 'Livré' || item.statut === 'Annulé';

  const callHref = `tel:${item.telephone.replace(/\s/g, '')}`;
  const emailHref = item.email ? `mailto:${item.email}?subject=${encodeURIComponent(`${item.type} ${item.ref} — PSI`)}` : null;

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
              <IconBtn onClick={() => printDoc(item)} title="Imprimer / PDF" color="#374151">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </IconBtn>
              <IconBtn onClick={() => exportExcel(item)} title="Exporter Excel" color="#374151">
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
                  <p className="text-[11px] font-semibold mt-1" style={{ color: isCommande ? '#4CAF4F' : '#8B5CF6' }}>{item.type}</p>
                </div>
              </div>

              <div className="h-px bg-[#F2F4F7]" />

              {/* Infos client */}
              <div>
                <p className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-widest mb-3">Client</p>
                <div className="rounded-xl border border-[#F2F4F7] overflow-hidden">
                  <div className="grid grid-cols-2">
                    {[
                      { label: 'Nom', value: item.client },
                      { label: 'Entreprise', value: item.entreprise },
                      { label: 'Téléphone', value: item.telephone },
                      { label: 'Wilaya', value: item.wilaya || '—' },
                      ...(item.email ? [{ label: 'Email', value: item.email }] : []),
                      ...(item.adresse ? [{ label: 'Adresse', value: item.adresse }] : []),
                    ].map((info, i) => (
                      <div key={i} className="px-4 py-3 border-b border-r border-[#F2F4F7] last:border-b-0">
                        <p className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wider">{info.label}</p>
                        <p className="text-[13px] font-semibold text-[#0F172A] mt-0.5">{info.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Produits */}
              <div>
                <p className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-widest mb-3">
                  {isCommande ? 'Produits commandés' : 'Spécifications demandées'}
                </p>
                <div className="rounded-xl border border-[#F2F4F7] overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto] bg-[#F8FAFC] px-4 py-2 border-b border-[#F2F4F7]">
                    <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wider">Désignation</span>
                    <span className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-wider">Qté</span>
                  </div>
                  {lignes.map((ligne, i) => {
                    const match = ligne.match(/^(.+?)\s*×\s*(\d+)/);
                    const ref = match ? match[1].trim() : ligne;
                    const qty = match ? `${match[2]} roul.` : '—';
                    return (
                      <div key={i} className="grid grid-cols-[1fr_auto] px-4 py-3 border-b border-[#F2F4F7] last:border-b-0">
                        <span className="text-[13px] font-medium text-[#374151]">{ref}</span>
                        <span className="text-[13px] font-semibold text-[#8A9BB5] tabular-nums">{qty}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-4 py-4 rounded-xl" style={{ background: isCommande ? '#F0FDF4' : '#F5F3FF' }}>
                <span className="text-[13px] font-semibold" style={{ color: isCommande ? '#166534' : '#5B21B6' }}>
                  {isCommande ? 'Total commande' : 'Montant estimé'}
                </span>
                <span className="text-[22px] font-extrabold" style={{ color: isCommande ? '#4CAF4F' : '#8B5CF6' }}>
                  {item.montant}
                </span>
              </div>

              {item.message && (
                <div>
                  <p className="text-[10px] font-bold text-[#ABBED1] uppercase tracking-widest mb-2">Message du client</p>
                  <div className="rounded-xl border border-[#F2F4F7] px-4 py-3">
                    <p className="text-[13px] text-[#374151] leading-relaxed">{item.message}</p>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 border-t border-[#F2F4F7] px-6 py-4 bg-[#FAFCFF]">
            <div className="flex items-center justify-between">

              {/* Gauche : icônes rondes contact + export */}
              <div className="flex items-center gap-2">
                <IconBtn onClick={() => setTemplateMode('wa')} title="WhatsApp" color="#25D366">
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.522 5.854L.057 23.714a.5.5 0 00.61.639l5.963-1.562A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.862 9.862 0 012.106 12C2.106 6.53 6.53 2.106 12 2.106c5.471 0 9.894 4.424 9.894 9.894 0 5.471-4.423 9.894-9.894 9.894z"/></svg>
                </IconBtn>

                <IconBtn href={callHref} title="Appeler" color="#3B82F6">
                  <svg width={15} height={15} fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </IconBtn>

                {emailHref && (
                  <button onClick={() => setTemplateMode('mail')}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-full border text-[11px] font-bold transition-colors"
                    style={{ borderColor: '#F9731640', color: '#F97316' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F9731612')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    MAIL
                  </button>
                )}
              </div>

              {/* Droite : actions statut */}
              <div className="flex flex-col items-end gap-2">
                {!isArchived && onStatusChange && (
                  <>
                    {item.statut === 'En attente' && (
                      <button onClick={() => { onStatusChange(item.ref, 'Contacté'); onClose(); }}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#3B82F6] text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors">
                        Marquer Contacté
                      </button>
                    )}
                    {isCommande && item.statut === 'Contacté' && (
                      <button onClick={() => { onStatusChange(item.ref, 'Confirmé'); onClose(); }}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#0D9488] text-[#0D9488] hover:bg-[#F0FDFA] transition-colors">
                        Marquer Confirmé
                      </button>
                    )}
                    {isCommande && item.statut === 'Confirmé' && (
                      <button onClick={() => { onStatusChange(item.ref, 'Livré'); onClose(); }}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
                        Marquer Livré
                      </button>
                    )}
                    {!isCommande && item.statut === 'Contacté' && onConvertToOrder && (
                      <button onClick={() => setShowConvert(true)}
                        className="px-4 py-2 rounded-lg text-[13px] font-bold border border-[#0D9488] text-[#0D9488] hover:bg-[#F0FDFA] transition-colors">
                        Valider → Commande
                      </button>
                    )}
                    <button onClick={() => { onStatusChange(item.ref, 'Annulé'); onClose(); }}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#FECACA] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
                      Annuler
                    </button>
                  </>
                )}

                {item.statut === 'Annulé' && onStatusChange && (
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

      {showConvert && onConvertToOrder && (
        <ConvertModal
          item={item}
          onClose={() => setShowConvert(false)}
          onConfirm={(montant) => {
            onConvertToOrder({ ...item, montant });
            setShowConvert(false);
            onClose();
          }}
        />
      )}

      {templateMode && (
        <TemplatePopover
          item={item}
          mode={templateMode}
          onClose={() => setTemplateMode(null)}
        />
      )}
    </>
  );
}
