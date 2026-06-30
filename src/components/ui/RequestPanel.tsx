'use client';

import { useState } from 'react';
import { StatusPill } from './StatusPill';

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

async function exportExcel(item: RequestDetail) {
  const { utils, writeFile } = await import('xlsx');
  const rows = [
    ['PSI — Paper Solutions Industry', ''],
    ['Référence', item.ref],
    ['Date', item.date + (item.heure ? ` ${item.heure}` : '')],
    ['Statut', item.statut],
    ['', ''],
    ['Client', item.client],
    ['Entreprise', item.entreprise],
    ['Téléphone', item.telephone],
    ...(item.email ? [['Email', item.email]] : []),
    ...(item.wilaya ? [['Wilaya', item.wilaya]] : []),
    ['', ''],
    ...item.produits.split(',').map((p) => [p.trim(), '']),
    ['', ''],
    [item.type === 'Commande' ? 'Total' : 'Montant estimé', item.montant],
  ];
  const ws = utils.aoa_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, item.ref);
  writeFile(wb, `${item.ref}_PSI.xlsx`);
}

function buildWAMsg(item: RequestDetail) {
  return encodeURIComponent(`Bonjour ${item.client},\n\nSuite à votre ${item.type.toLowerCase()} ${item.ref} du ${item.date}, nous revenons vers vous.\n\nCordialement,\nÉquipe PSI`);
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

export function RequestPanel({ item, onClose, onStatusChange, onConvertToOrder }: RequestPanelProps) {
  const [showConvert, setShowConvert] = useState(false);
  const isCommande = item.type === 'Commande';
  const isArchived = item.statut === 'Livré' || item.statut === 'Annulé';

  const waHref = `https://wa.me/${item.telephone.replace(/\s/g, '').replace('+', '')}?text=${buildWAMsg(item)}`;
  const callHref = `tel:${item.telephone.replace(/\s/g, '')}`;
  const emailHref = item.email ? `mailto:${item.email}?subject=${encodeURIComponent(`${item.type} ${item.ref} — PSI`)}` : null;

  const lignes = item.produits.split(',').map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 600, maxWidth: '94vw', maxHeight: '92vh' }}>

          {/* ── Header modal ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold font-mono" style={{ color: isCommande ? '#4CAF4F' : '#8B5CF6' }}>{item.ref}</span>
              <StatusPill status={item.statut} />
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1] hover:text-[#374151] transition-colors">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* ── Corps scrollable — style facture ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-6 flex flex-col gap-6">

              {/* En-tête facture : PSI à gauche, ref + date à droite */}
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

              {/* Lignes produits — style tableau facture */}
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
                    // parse "80/80 × 50 rouleaux" → ref + qté
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

              {/* Message client si devis */}
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

          {/* ── Footer actions ── */}
          <div className="flex-shrink-0 border-t border-[#F2F4F7] px-6 py-4 flex flex-col gap-3 bg-[#FAFCFF]">

            {/* Ligne contact + annuler */}
            {!isArchived && onStatusChange && (
              <div className="flex items-center gap-2">
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white"
                  style={{ background: '#25D366' }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.522 5.854L.057 23.714a.5.5 0 00.61.639l5.963-1.562A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.862 9.862 0 012.106 12C2.106 6.53 6.53 2.106 12 2.106c5.471 0 9.894 4.424 9.894 9.894 0 5.471-4.423 9.894-9.894 9.894z"/></svg>
                  WA
                </a>
                <a href={callHref} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-white transition-colors">
                  <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Appeler
                </a>
                {emailHref && (
                  <a href={emailHref} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-white transition-colors">
                    <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Email
                  </a>
                )}
                <div className="flex-1" />
                <button onClick={() => { onStatusChange(item.ref, 'Annulé'); onClose(); }}
                  className="px-3 py-2 rounded-lg text-[12px] font-semibold text-[#EF4444] border border-[#FECACA] hover:bg-[#FEF2F2] transition-colors">
                  Annuler
                </button>
              </div>
            )}

            {/* Ligne export + action principale */}
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-white transition-colors">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Imprimer
              </button>
              <button onClick={() => exportExcel(item)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#166534] border border-[#86EFAC] hover:bg-[#F0FDF4] transition-colors">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Excel
              </button>

              <div className="flex-1" />

              {item.statut === 'Annulé' && onStatusChange && (
                <button onClick={() => { onStatusChange(item.ref, 'En attente'); onClose(); }}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#E2E8F0] text-[#374151] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors">
                  Restaurer
                </button>
              )}

              {!isArchived && onStatusChange && (
                <>
                  {item.statut === 'En attente' && (
                    <button onClick={() => { onStatusChange(item.ref, 'Contacté'); onClose(); }}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold text-white"
                      style={{ background: '#3B82F6' }}>
                      Marquer Contacté
                    </button>
                  )}
                  {isCommande && item.statut === 'Contacté' && (
                    <button onClick={() => { onStatusChange(item.ref, 'Livré'); onClose(); }}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold text-white"
                      style={{ background: '#4CAF4F' }}>
                      Marquer Livré
                    </button>
                  )}
                  {!isCommande && item.statut === 'Contacté' && onConvertToOrder && (
                    <button onClick={() => setShowConvert(true)}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold text-white"
                      style={{ background: '#4CAF4F' }}>
                      Valider → Commande
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Ref en bas à gauche */}
            <p className="text-[10px] text-[#ABBED1]">{item.ref} · PSI Paper Solutions Industry · psi-algerie.com</p>
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
    </>
  );
}
