'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { renderDocumentHtml } from '@/lib/documents/render';
import { sampleDocument } from '@/lib/documents/sample';
import type { DocumentKind, DocumentSettingsData, DocumentTemplateConfig, TemplateColumn, TemplateField } from '@/lib/documents/types';
import { inputCls, labelCls } from './WideModal';

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;
const small = 'px-2 py-1 rounded-md border border-[#E2E8F0] bg-white text-[11px] font-bold text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-40';

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 flex flex-col gap-2.5">
      <div>
        <p className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wide">{title}</p>
        {hint && <p className="text-[11px] text-[#8A9BB5] mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-[#0F172A] font-semibold cursor-pointer">
      <input type="checkbox" className="accent-[#4CAF4F] w-4 h-4" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

// Liste de champs : afficher oui/non, renommer le libellé, ajouter un champ personnalisé (libellé + valeur par défaut)
function FieldList({ fields, onChange, allowAdd, allowDefault, nameIsTitle }: { fields: TemplateField[]; onChange: (f: TemplateField[]) => void; allowAdd?: boolean; allowDefault?: boolean; nameIsTitle?: boolean }) {
  const upd = (i: number, patch: Partial<TemplateField>) => onChange(fields.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= fields.length) return; const a = [...fields]; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="flex flex-col gap-1.5">
      {fields.map((f, i) => (
        <div key={f.id} className="flex items-center gap-2">
          <input type="checkbox" className="accent-[#4CAF4F] w-4 h-4 shrink-0" checked={f.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} aria-label="Afficher" />
          {nameIsTitle && f.id === 'name' ? (
            <span className="flex-1 text-[12px] text-[#6B7A90] italic">Nom (le libellé est le titre du cadre)</span>
          ) : (
            <input className={`${inputCls} flex-1`} value={f.label} onChange={(e) => upd(i, { label: e.target.value })} />
          )}
          {allowDefault && f.custom && <input className={`${inputCls} w-[34%]`} placeholder="Valeur par défaut" value={f.defaultValue ?? ''} onChange={(e) => upd(i, { defaultValue: e.target.value })} />}
          <button type="button" className={small} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
          <button type="button" className={small} onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Descendre">↓</button>
          {f.custom && <button type="button" className={`${small} !text-[#B91C1C]`} onClick={() => onChange(fields.filter((_, k) => k !== i))} aria-label="Supprimer">✕</button>}
        </div>
      ))}
      {allowAdd && <div><button type="button" className={small} onClick={() => onChange([...fields, { id: uid('custom'), label: 'Nouveau champ :', enabled: true, custom: true, defaultValue: '' }])}>+ Ajouter un champ</button></div>}
    </div>
  );
}

function ColumnList({ cols, onChange }: { cols: TemplateColumn[]; onChange: (c: TemplateColumn[]) => void }) {
  const upd = (i: number, patch: Partial<TemplateColumn>) => onChange(cols.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= cols.length) return; const a = [...cols]; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="flex flex-col gap-1.5">
      {cols.map((c, i) => (
        <div key={c.id} className="flex items-center gap-2">
          <input type="checkbox" className="accent-[#4CAF4F] w-4 h-4 shrink-0" checked={c.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} aria-label="Afficher la colonne" />
          <input className={`${inputCls} flex-1`} value={c.label} onChange={(e) => upd(i, { label: e.target.value })} />
          <span className="text-[10px] text-[#ABBED1] w-16 text-right">{c.custom ? 'ajoutée' : c.id}</span>
          <button type="button" className={small} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
          <button type="button" className={small} onClick={() => move(i, 1)} disabled={i === cols.length - 1} aria-label="Descendre">↓</button>
          {c.custom && <button type="button" className={`${small} !text-[#B91C1C]`} onClick={() => onChange(cols.filter((_, k) => k !== i))} aria-label="Supprimer">✕</button>}
        </div>
      ))}
      <div><button type="button" className={small} onClick={() => onChange([...cols, { id: uid('custom'), label: 'Nouvelle colonne', enabled: true, custom: true }])}>+ Ajouter une colonne</button></div>
    </div>
  );
}

// Éditeur d'un modèle : tout ce qui est affiché / écrit sur le document est modifiable ; l'aperçu se met à jour en direct.
export function TemplateEditor({ type, template, settings, qr, onChange }: { type: DocumentKind; template: DocumentTemplateConfig; settings: DocumentSettingsData; qr: string; onChange: (t: DocumentTemplateConfig) => void }) {
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const set = (patch: Partial<DocumentTemplateConfig>) => onChange({ ...template, ...patch });
  const html = useMemo(() => renderDocumentHtml(sampleDocument(type, template, settings, qr), { origin }), [type, template, settings, qr, origin]);
  const isBl = type === 'BL';

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_440px] gap-5 items-start">
      <div className="flex flex-col gap-3 min-w-0">
        <Card title="Titre et logo">
          <label className="block"><span className={labelCls}>Titre du document</span><input className={inputCls} value={template.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <div className="flex flex-wrap gap-5">
            <Toggle checked={template.showLogo} onChange={(v) => set({ showLogo: v })} label="Logo PSI" />
            {isBl && <Toggle checked={template.showQr} onChange={(v) => set({ showQr: v })} label="QR code de réception (désactivable aussi à chaque création)" />}
          </div>
        </Card>

        <Card title="En-tête (à droite du titre)" hint="N°, date, échéance… Coche pour afficher, renomme, réordonne. Un champ ajouté se remplit à chaque création.">
          <FieldList fields={template.headerFields} onChange={(f) => set({ headerFields: f })} allowAdd allowDefault />
        </Card>

        <Card title="Cadre de gauche">
          <Toggle checked={template.partyA.enabled} onChange={(v) => set({ partyA: { ...template.partyA, enabled: v } })} label="Afficher ce cadre" />
          <label className="block"><span className={labelCls}>Titre du cadre</span><input className={inputCls} value={template.partyA.title} onChange={(e) => set({ partyA: { ...template.partyA, title: e.target.value } })} /></label>
          <FieldList nameIsTitle fields={template.partyA.fields} onChange={(f) => set({ partyA: { ...template.partyA, fields: f } })} />
          <p className="text-[11px] text-[#8A9BB5]">Les valeurs viennent de « Infos PSI » (onglet Réglages généraux).</p>
        </Card>

        <Card title="Cadre de droite (client)">
          <Toggle checked={template.partyB.enabled} onChange={(v) => set({ partyB: { ...template.partyB, enabled: v } })} label="Afficher ce cadre" />
          <label className="block"><span className={labelCls}>Titre du cadre</span><input className={inputCls} value={template.partyB.title} onChange={(e) => set({ partyB: { ...template.partyB, title: e.target.value } })} /></label>
          <FieldList nameIsTitle fields={template.partyB.fields} onChange={(f) => set({ partyB: { ...template.partyB, fields: f } })} />
          <p className="text-[11px] text-[#8A9BB5]">Une ligne dont le client n&apos;a pas la valeur (ex. AI) est simplement masquée.</p>
        </Card>

        <Card title="Ligne « Commande du … »">
          <Toggle checked={template.orderLine.enabled} onChange={(v) => set({ orderLine: { ...template.orderLine, enabled: v } })} label="Afficher" />
          <input className={inputCls} value={template.orderLine.label} onChange={(e) => set({ orderLine: { ...template.orderLine, label: e.target.value } })} />
        </Card>

        <Card title="Colonnes du tableau" hint="Renomme, masque, réordonne ou ajoute une colonne (sa valeur se saisit ligne par ligne à la création).">
          <ColumnList cols={template.columns} onChange={(c) => set({ columns: c })} />
        </Card>

        {!isBl && (
          <>
            <Card title="Totaux">
              <Toggle checked={template.totals.enabled} onChange={(v) => set({ totals: { ...template.totals, enabled: v } })} label="Afficher les totaux" />
              <div className="grid grid-cols-2 gap-2">
                {([['labelHt', 'Total HT'], ['labelVat', 'TVA'], ['labelTtc', 'Total TTC'], ['labelStamp', 'Timbre']] as const).map(([k, l]) => (
                  <label key={k} className="block"><span className={labelCls}>{l}</span><input className={inputCls} value={template.totals[k]} onChange={(e) => set({ totals: { ...template.totals, [k]: e.target.value } })} /></label>
                ))}
              </div>
            </Card>
            <Card title="Montant en toutes lettres">
              <Toggle checked={template.amountInWords.enabled} onChange={(v) => set({ amountInWords: { ...template.amountInWords, enabled: v } })} label="Afficher" />
              <input className={inputCls} value={template.amountInWords.label} onChange={(e) => set({ amountInWords: { ...template.amountInWords, label: e.target.value } })} />
            </Card>
          </>
        )}

        {isBl && (
          <>
            <Card title="Date et lieu de livraison">
              <Toggle checked={template.deliveryInfo.enabled} onChange={(v) => set({ deliveryInfo: { ...template.deliveryInfo, enabled: v } })} label="Afficher sous le tableau" />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} value={template.deliveryInfo.dateLabel} onChange={(e) => set({ deliveryInfo: { ...template.deliveryInfo, dateLabel: e.target.value } })} />
                <input className={inputCls} value={template.deliveryInfo.placeLabel} onChange={(e) => set({ deliveryInfo: { ...template.deliveryInfo, placeLabel: e.target.value } })} />
              </div>
            </Card>
            <Card title="Signatures">
              <Toggle checked={template.signatures.enabled} onChange={(v) => set({ signatures: { ...template.signatures, enabled: v } })} label="Afficher" />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} value={template.signatures.leftLabel} onChange={(e) => set({ signatures: { ...template.signatures, leftLabel: e.target.value } })} />
                <input className={inputCls} value={template.signatures.rightLabel} onChange={(e) => set({ signatures: { ...template.signatures, rightLabel: e.target.value } })} />
              </div>
            </Card>
          </>
        )}

        <Card title="Champs ajoutés sous le tableau" hint="Ex. « N° bon de commande client », « Chauffeur », « Matricule »… Remplis à chaque création.">
          <FieldList fields={template.customFields} onChange={(f) => set({ customFields: f })} allowAdd allowDefault />
        </Card>

        <Card title="Note / conditions">
          <Toggle checked={template.notes.enabled} onChange={(v) => set({ notes: { ...template.notes, enabled: v } })} label="Texte fixe sous le tableau" />
          <textarea rows={3} className={inputCls} value={template.notes.text} placeholder="ex. Marchandise voyageant aux risques et périls du client." onChange={(e) => set({ notes: { ...template.notes, text: e.target.value } })} />
        </Card>

        <Card title="Pied de page — mentions légales" hint="Une ligne par ligne imprimée. Modifiable par les admins.">
          <Toggle checked={template.footer.enabled} onChange={(v) => set({ footer: { ...template.footer, enabled: v } })} label="Afficher le pied de page" />
          <textarea rows={4} className={inputCls} value={template.footer.lines.join('\n')} onChange={(e) => set({ footer: { ...template.footer, lines: e.target.value.split('\n') } })} />
        </Card>
      </div>

      <div className="hidden xl:block sticky top-4">
        <p className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-wide mb-1.5">Aperçu en direct (données d&apos;exemple)</p>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] overflow-hidden" style={{ width: 440, height: 620 }}>
          <iframe title="Aperçu du modèle" srcDoc={html} style={{ width: 794, height: 1123, border: 0, background: '#fff', transform: 'scale(0.554)', transformOrigin: 'top left' }} />
        </div>
      </div>
    </div>
  );
}
