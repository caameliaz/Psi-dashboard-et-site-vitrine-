'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRole } from '@/lib/role-context';
import { api, DOC_NAMES } from '@/lib/documents/client';
import { formatDocumentNumber } from '@/lib/documents/numbering';
import { stampDuty } from '@/lib/documents/stamp-duty';
import { qrSvg } from '@/lib/label-print';
import type { DocumentKind, DocumentSettingsData, DocumentTemplateConfig } from '@/lib/documents/types';
import { TemplateEditor } from '@/components/documents/TemplateEditor';
import { ghostBtn, greenBtn, inputCls, labelCls } from '@/components/documents/WideModal';

interface Loaded {
  settings: DocumentSettingsData;
  templates: Record<DocumentKind, DocumentTemplateConfig>;
  counters: Record<DocumentKind, number>;
  year: number;
  categories: { id: string; name: string; documentDesignation: string | null }[];
  defaults: { settings: DocumentSettingsData; templates: Record<DocumentKind, DocumentTemplateConfig> };
}

type Tab = DocumentKind | 'general';
const TABS: { id: Tab; label: string }[] = [
  { id: 'BL', label: 'Bon de livraison' }, { id: 'FACTURE', label: 'Facture' }, { id: 'PROFORMA', label: 'Proforma' }, { id: 'general', label: 'Réglages généraux' },
];

const Card = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 flex flex-col gap-3">
    <div><p className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wide">{title}</p>{hint && <p className="text-[11px] text-[#8A9BB5] mt-0.5">{hint}</p>}</div>
    {children}
  </section>
);

export default function DocumentSettingsPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('BL');
  const [settings, setSettings] = useState<DocumentSettingsData | null>(null);
  const [templates, setTemplates] = useState<Record<DocumentKind, DocumentTemplateConfig> | null>(null);
  const [counters, setCounters] = useState<Record<DocumentKind, string>>({ BL: '', FACTURE: '', PROFORMA: '' });
  const [designations, setDesignations] = useState<Record<string, string>>({});
  const [qr, setQr] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<Loaded>('/api/documents/settings');
      setData(d); setSettings(d.settings); setTemplates(d.templates);
      setCounters({ BL: String(d.counters.BL), FACTURE: String(d.counters.FACTURE), PROFORMA: String(d.counters.PROFORMA) });
      setDesignations(Object.fromEntries(d.categories.map((c) => [c.id, c.documentDesignation ?? ''])));
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  useEffect(() => { qrSvg('https://www.psi.dz/r/exemple').then(setQr).catch(() => {}); }, []);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erreur' }); }
    finally { setBusy(false); setTimeout(() => setMsg(null), 4000); }
  };
  const put = (body: object) => api('/api/documents/settings', { method: 'PUT', body: JSON.stringify(body) });

  if (roleLoading) return null;
  if (!isAdmin) return <p className="text-[13px] text-[#8A9BB5] py-10 text-center">Cette page est réservée aux administrateurs.</p>;
  if (error) return <p className="text-[13px] text-red-600 py-10 text-center">{error}</p>;
  if (!data || !settings || !templates) return <p className="text-[13px] text-[#8A9BB5] py-10 text-center">Chargement…</p>;

  const setPsi = (k: keyof DocumentSettingsData['psi'], v: string) => setSettings({ ...settings, psi: { ...settings.psi, [k]: v } });
  const tiers = settings.stampDuty.tiers;
  const setTier = (i: number, patch: Partial<(typeof tiers)[number]>) => setSettings({ ...settings, stampDuty: { ...settings.stampDuty, tiers: tiers.map((t, k) => (k === i ? { ...t, ...patch } : t)) } });
  const dirtyTemplate = (k: DocumentKind) => JSON.stringify(templates[k]) !== JSON.stringify(data.templates[k]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[18px] font-black text-[#0F172A]">Documents</h1>
        <p className="text-[12px] text-[#8A9BB5]">Modèles du bon de livraison, de la facture et de la proforma, infos de PSI, numérotation et timbre. Réservé aux administrateurs. Un document déjà émis garde le modèle utilisé à son émission.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3.5 py-2 rounded-lg text-[13px] font-bold border transition-colors ${tab === t.id ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]' : 'bg-white text-[#374151] border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
            {t.label}{t.id !== 'general' && dirtyTemplate(t.id) ? ' •' : ''}
          </button>
        ))}
        {msg && <span className={`ml-auto text-[12px] font-semibold ${msg.ok ? 'text-[#166534]' : 'text-red-600'}`}>{msg.ok ? '✓ ' : ''}{msg.text}</span>}
      </div>

      {tab !== 'general' ? (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <button disabled={busy || !dirtyTemplate(tab)} className={greenBtn} style={{ background: '#4CAF4F' }}
              onClick={() => run(async () => { await put({ template: { type: tab, config: templates[tab] } }); await load(); }, `Modèle « ${DOC_NAMES[tab]} » enregistré`)}>
              Enregistrer le modèle
            </button>
            <button disabled={busy} className={ghostBtn}
              onClick={() => { if (confirm(`Remettre le modèle « ${DOC_NAMES[tab]} » comme à l'origine ? Tes modifications de ce modèle seront perdues.`)) run(async () => { await put({ resetTemplate: tab }); await load(); }, 'Modèle remis à l\'origine'); }}>
              Revenir au modèle d&apos;origine
            </button>
            {dirtyTemplate(tab) && <span className="text-[12px] text-[#B45309] font-semibold">Modifications non enregistrées</span>}
          </div>
          <TemplateEditor type={tab} template={templates[tab]} settings={settings} qr={qr} onChange={(t) => setTemplates({ ...templates, [tab]: t })} />
        </>
      ) : (
        <div className="flex flex-col gap-4 max-w-4xl">
          <Card title="Infos PSI (cadre Entreprise / Fournisseur)">
            <div className="grid md:grid-cols-2 gap-3">
              {([['name', 'Raison sociale'], ['addressHeader', 'Adresse (ligne 1)'], ['city', 'Ville (ligne 2)'], ['phone', 'Téléphone'], ['rc', 'RC'], ['nif', 'NIF'], ['nis', 'NIS'], ['rib', 'RIB']] as const).map(([k, l]) => (
                <label key={k} className="block"><span className={labelCls}>{l}</span><input className={inputCls} value={settings.psi[k]} onChange={(e) => setPsi(k, e.target.value)} /></label>
              ))}
            </div>
            <p className="text-[11px] text-[#8A9BB5]">Le pied de page se modifie dans chaque modèle (onglets BL / Facture / Proforma) : pense à le mettre à jour aussi si ces infos changent.</p>
          </Card>

          <Card title="Taux et valeurs par défaut">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block"><span className={labelCls}>TVA (%)</span><input type="number" className={inputCls} value={settings.vatRate} onChange={(e) => setSettings({ ...settings, vatRate: Number(e.target.value) })} /></label>
              <label className="block"><span className={labelCls}>Mode de règlement par défaut</span><input className={inputCls} value={settings.defaultPaymentMethod} onChange={(e) => setSettings({ ...settings, defaultPaymentMethod: e.target.value })} /></label>
            </div>
            <label className="block"><span className={labelCls}>Désignation par défaut (papier thermique et références libres)</span>
              <textarea rows={4} className={inputCls} value={settings.defaultDesignation} onChange={(e) => setSettings({ ...settings, defaultDesignation: e.target.value })} /></label>
          </Card>

          <Card title="Timbre (paiement en espèces)" hint="Calculé sur le total TTC selon le palier. ⚠ Valeurs de départ à faire confirmer par l'administration / le comptable.">
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 text-[10px] font-bold text-[#8A9BB5] uppercase"><span>De (DA TTC)</span><span>Jusqu&apos;à (vide = sans limite)</span><span>Taux %</span><span /></div>
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_90px_32px] gap-2">
                  <input type="number" className={inputCls} value={t.from} onChange={(e) => setTier(i, { from: Number(e.target.value) })} />
                  <input type="number" className={inputCls} value={t.to ?? ''} placeholder="∞" onChange={(e) => setTier(i, { to: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input type="number" step="0.1" className={inputCls} value={t.rate} onChange={(e) => setTier(i, { rate: Number(e.target.value) })} />
                  <button type="button" className="rounded-lg text-[#B91C1C] hover:bg-[#FEF2F2]" aria-label="Supprimer le palier" onClick={() => setSettings({ ...settings, stampDuty: { ...settings.stampDuty, tiers: tiers.filter((_, k) => k !== i) } })}>✕</button>
                </div>
              ))}
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" className={ghostBtn} onClick={() => setSettings({ ...settings, stampDuty: { ...settings.stampDuty, tiers: [...tiers, { from: tiers.at(-1)?.to ?? 0, to: null, rate: 1 }] } })}>+ Ajouter un palier</button>
                <label className="flex items-center gap-2 text-[12px] text-[#374151]">Minimum (DA) <input type="number" className={`${inputCls} !w-24`} value={settings.stampDuty.minimum} onChange={(e) => setSettings({ ...settings, stampDuty: { ...settings.stampDuty, minimum: Number(e.target.value) } })} /></label>
              </div>
              <p className="text-[11px] text-[#6B7A90]">Exemple : une facture de 355 286,40 DA TTC payée en espèces → timbre de <b>{stampDuty(355286.4, settings.stampDuty).toLocaleString('fr-FR')} DA</b>.</p>
            </div>
          </Card>

          <Card title="Format des numéros" hint="{seq:3} = numéro sur 3 chiffres, {year} = année, {suffix} = « bis » éventuel.">
            <div className="grid md:grid-cols-3 gap-3">
              {(['FACTURE', 'BL', 'PROFORMA'] as DocumentKind[]).map((k) => (
                <label key={k} className="block"><span className={labelCls}>{DOC_NAMES[k]}</span>
                  <input className={inputCls} value={settings.numberFormats[k]} onChange={(e) => setSettings({ ...settings, numberFormats: { ...settings.numberFormats, [k]: e.target.value } })} />
                  <span className="text-[11px] text-[#8A9BB5]">ex. {formatDocumentNumber(settings.numberFormats[k], 23, data.year)}</span></label>
              ))}
            </div>
          </Card>

          <div className="flex gap-2 items-center">
            <button disabled={busy} className={greenBtn} style={{ background: '#4CAF4F' }}
              onClick={() => run(async () => { await put({ settings }); await load(); }, 'Réglages enregistrés')}>Enregistrer les réglages</button>
            <button className={ghostBtn} disabled={busy} onClick={() => setSettings(data.settings)}>Annuler les changements</button>
          </div>

          <Card title={`Compteurs ${data.year}`} hint="Saisis le DERNIER numéro déjà utilisé : le suivant sera calculé à partir de là. Les documents déjà émis ne changent pas.">
            <div className="grid md:grid-cols-3 gap-3">
              {(['FACTURE', 'BL', 'PROFORMA'] as DocumentKind[]).map((k) => {
                const n = Number(counters[k]);
                return (
                  <div key={k} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex flex-col gap-2">
                    <span className={labelCls}>Dernier n° {DOC_NAMES[k].toLowerCase()}</span>
                    <input type="number" min={0} className={inputCls} value={counters[k]} onChange={(e) => setCounters({ ...counters, [k]: e.target.value })} />
                    <p className="text-[11px] text-[#6B7A90]">Prochain : <b className="text-[#0F172A]">{Number.isInteger(n) && n >= 0 ? formatDocumentNumber(data.settings.numberFormats[k], n + 1, data.year) : '—'}</b></p>
                    <button disabled={busy || String(data.counters[k]) === counters[k]} className={ghostBtn}
                      onClick={() => run(async () => { await put({ counter: { type: k, year: data.year, lastNumber: n } }); await load(); }, 'Compteur mis à jour')}>Enregistrer</button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#8A9BB5]">Le BL cherche à avoir le même numéro que sa future facture ; un 2e BL du même client avant facturation prend « bis ».</p>
          </Card>

          <Card title="Désignation par catégorie" hint="Texte imprimé dans la colonne « Désignation » (plusieurs lignes possibles). Vide = texte par défaut. Un produit peut avoir la sienne, modifiable aussi à chaque création.">
            <div className="flex flex-col gap-3">
              {data.categories.map((c) => (
                <label key={c.id} className="block"><span className={labelCls}>{c.name}</span>
                  <textarea rows={3} className={inputCls} value={designations[c.id] ?? ''} placeholder="(texte par défaut)" onChange={(e) => setDesignations({ ...designations, [c.id]: e.target.value })} /></label>
              ))}
            </div>
            <div><button disabled={busy} className={greenBtn} style={{ background: '#4CAF4F' }}
              onClick={() => run(async () => { await put({ designations: data.categories.map((c) => ({ categoryId: c.id, value: designations[c.id] ?? '' })) }); await load(); }, 'Désignations enregistrées')}>Enregistrer les désignations</button></div>
          </Card>
        </div>
      )}
    </div>
  );
}
