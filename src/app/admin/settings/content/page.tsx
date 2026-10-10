'use client';

import { useState, useEffect } from 'react';
import { RequirePerm } from '@/components/RequirePerm';
import { useRole } from '@/lib/role-context';
import { fr } from '@/lib/i18n/fr';
import { resizeImageToDataUrl } from '@/lib/resize-image';

function IconCheck() {
  return (
    <svg width={14} height={14} fill="none">
      <path d="M2 7L5.5 10.5L12 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SaveButton({ onClick, saved, loading }: { onClick: () => void; saved: boolean; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
      style={{ background: '#4CAF4F' }}>
      {saved ? <><IconCheck /> Sauvegardé</> : loading ? 'Enregistrement…' : <><IconCheck /> Sauvegarder</>}
    </button>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

function ContentPageInner() {
  const { can: canRole } = useRole();
  const canEdit = canRole('modifier_contenu'); // sans ce droit (compte lecture seule) : consultation uniquement
  const [hero,    setHero]    = useState({ titre: '', sousTitre: '' });
  const [about,   setAbout]   = useState({ texte: '', texte2: '', logosEnabled: false, stat1Valeur: '', stat1Label: '', stat2Label: '' });
  const [logos, setLogos] = useState<{ id: string; name: string; photo: string | null }[]>([]);
  const [logosOpen, setLogosOpen] = useState(false);
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoPhoto, setNewLogoPhoto] = useState('');
  const [logosSaving, setLogosSaving] = useState(false);
  // Édition d'un client existant : `editPhoto` undefined = logo inchangé, null = logo retiré
  // (nom seul), string = nouveau logo uploadé.
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [editLogoName, setEditLogoName] = useState('');
  const [editLogoPhoto, setEditLogoPhoto] = useState<string | null | undefined>(undefined);
  const [editLogoSaving, setEditLogoSaving] = useState(false);
  const [contact, setContact] = useState({ adresse: '', email: '', telephone: '', facebook: '', instagram: '' });
  // Nouvelles sections de l'accueil: « Pourquoi nous choisir », bloc devis, texte sous le bouton de la bannière.
  const [why,     setWhy]     = useState<Record<string, string>>({});
  const [devis,   setDevis]   = useState<Record<string, string>>({});
  const [saved,   setSaved]   = useState<Record<string, boolean>>({});
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    fetch('/api/content').then((r) => r.json()).then((data: Record<string, string>) => {
      setHero({
        titre: data['hero_titre'] ?? 'Votre spécialiste du papier thermique en Algérie',
        sousTitre: data['hero_sous_titre'] ?? "PSI fournit aux professionnels d'Algérie un papier thermique premium 55 gr/m², garanti 100% sans BPA.",
      });
      setAbout({
        texte: data['about_texte'] ?? 'PSI (Paper Solutions Industry) est une entreprise algérienne spécialisée dans la transformation et la distribution de papier thermique professionnel. Basée à Alger, nous servons commerces, banques, restaurants et pharmacies à travers tout le territoire national.',
        texte2: data['about_texte_2'] ?? 'Notre mission est d\'offrir des solutions papier fiables, rapides et accessibles à tous les professionnels qui en ont besoin, avec un service client réactif et de proximité.',
        logosEnabled: data['about_logos_enabled'] === 'true',
        stat1Valeur: data['about_stat1_valeur'] ?? '+100',
        stat1Label: data['about_stat1_label'] ?? 'Clients satisfaits',
        stat2Label: data['about_stat2_label'] ?? 'Références produits',
      });
      const badges = fr.quality as Record<string, string>;
      const defaultListes: Record<number, string> = {
        2: ['Grammage 55 g/m² premium', '100% sans BPA', 'Matières premières européennes certifiées', 'Transformé et conditionné en Algérie', 'Qualité constante garantie', 'Impression nette et longue durée'].join('\n'),
        3: ['Commerces & points de vente', 'Banques & terminaux de paiement (TPE)', 'Restaurants & cafés', 'Pharmacies', 'Logistique & transport', 'Grande distribution'].join('\n'),
      };
      setWhy({
        why_titre: data['why_titre'] ?? fr.why.title,
        why_sous_titre: data['why_sous_titre'] ?? fr.why.subtitle,
        ...Object.fromEntries([1, 2, 3, 4].flatMap((n) => [
          [`why_${n}_titre`, data[`why_${n}_titre`] ?? badges[`badge${n}_title`]],
          [`why_${n}_desc`, data[`why_${n}_desc`] ?? badges[`badge${n}_desc_short`]],
          [`why_${n}_liste`, data[`why_${n}_liste`] ?? defaultListes[n] ?? ''],
        ])),
      });
      setDevis({
        hero_clients: data['hero_clients'] ?? fr.hero.clients,
        devis_titre: data['devis_titre'] ?? fr.home_quote.title,
        devis_sous_titre: data['devis_sous_titre'] ?? fr.home_quote.subtitle,
        devis_point_1: data['devis_point_1'] ?? fr.home_quote.point1,
        devis_point_2: data['devis_point_2'] ?? fr.home_quote.point2,
        devis_point_3: data['devis_point_3'] ?? fr.home_quote.point3,
      });
      setContact({
        adresse:   data['contact_adresse']   ?? 'Centre El Qods, Niveau M1, Chéraga, Alger',
        email:     data['contact_email']     ?? 'Contact@psi.dz',
        telephone: data['contact_telephone'] ?? '+213770150656',
        facebook:  data['contact_facebook']  ?? 'https://www.facebook.com/PSI',
        instagram: data['contact_instagram'] ?? 'https://www.instagram.com/psi04_2026',
      });
      setLoaded(true);
    }).catch(() => setLoaded(true));
    fetch('/api/partner-logos').then((r) => r.ok ? r.json() : []).then(setLogos).catch(() => {});
  }, []);

  const addLogo = async () => {
    if (!newLogoName.trim()) return;
    setLogosSaving(true);
    try {
      const res = await fetch('/api/partner-logos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLogoName.trim(), photo: newLogoPhoto }),
      });
      if (!res.ok) { alert((await res.json().catch(() => null))?.error ?? 'Impossible d\'ajouter ce client.'); return; }
      const created = await res.json();
      setLogos((prev) => [...prev, created]);
      setNewLogoName('');
      setNewLogoPhoto('');
      // Active et sauvegarde automatiquement la bande défilante dès qu'un logo est ajouté —
      // sinon le logo est enregistré mais invisible tant que la case "Afficher..." n'est pas
      // cochée ET sauvegardée séparément, ce qui n'est pas intuitif (« pourquoi ça n'apparaît
      // pas sur le site »). Reste modifiable/désactivable ensuite via la case à cocher.
      if (!about.logosEnabled) {
        setAbout((a) => ({ ...a, logosEnabled: true }));
        await fetch('/api/content', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ about_logos_enabled: 'true' }),
        }).catch(() => {});
      }
    } finally {
      setLogosSaving(false);
    }
  };

  const removeLogo = async (id: string) => {
    if (!confirm('Retirer ce client de la bande de logos ?')) return;
    const prev = logos;
    setLogos((p) => p.filter((l) => l.id !== id));
    const res = await fetch(`/api/partner-logos/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Impossible de supprimer ce client.'); setLogos(prev); }
  };

  const handleLogoFile = (file: File | undefined) => {
    if (!file) return;
    resizeImageToDataUrl(file).then(setNewLogoPhoto).catch(() => alert('Impossible de charger ce logo.'));
  };

  const startEditLogo = (l: { id: string; name: string; photo: string | null }) => {
    setEditingLogoId(l.id);
    setEditLogoName(l.name);
    setEditLogoPhoto(undefined);
  };

  const cancelEditLogo = () => {
    setEditingLogoId(null);
    setEditLogoName('');
    setEditLogoPhoto(undefined);
  };

  const handleEditLogoFile = (file: File | undefined) => {
    if (!file) return;
    resizeImageToDataUrl(file).then(setEditLogoPhoto).catch(() => alert('Impossible de charger ce logo.'));
  };

  const saveEditLogo = async () => {
    if (!editingLogoId || !editLogoName.trim()) return;
    setEditLogoSaving(true);
    try {
      const body: Record<string, unknown> = { name: editLogoName.trim() };
      if (editLogoPhoto !== undefined) body.photo = editLogoPhoto; // null = logo retiré, string = nouveau logo
      const res = await fetch(`/api/partner-logos/${editingLogoId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert((await res.json().catch(() => null))?.error ?? 'Impossible de modifier ce client.'); return; }
      const updated = await res.json();
      setLogos((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      cancelEditLogo();
    } finally {
      setEditLogoSaving(false);
    }
  };

  const save = async (section: string, updates: Record<string, string>) => {
    setSaving((p) => ({ ...p, [section]: true }));
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      // Avant : « Enregistré ✓ » s'affichait même quand la sauvegarde avait échoué.
      if (!res.ok) { alert((await res.json().catch(() => null))?.error ?? `L'enregistrement a échoué (erreur ${res.status}).`); return; }
      setSaved((p) => ({ ...p, [section]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [section]: false })), 2000);
    } finally {
      setSaving((p) => ({ ...p, [section]: false }));
    }
  };

  if (!loaded) {
    return <div className="w-full py-20 text-center text-[13px] text-[#8A9BB5]">Chargement…</div>;
  }

  return (
    <fieldset disabled={!canEdit} className="contents">
    <div className="w-full">
      {!canEdit && <p className="mb-4 px-3 py-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[12px] font-semibold text-[#1E40AF]">Mode lecture seule — consultation uniquement.</p>}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#0F172A]">Contenu du site</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-1">Modifiez les textes affichés sur le site public</p>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">

        {/* Colonne gauche */}
        <div className="flex flex-col gap-6">

          {/* Hero */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Section Hero</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Titre principal</label>
                <input value={hero.titre} onChange={(e) => setHero({ ...hero, titre: e.target.value })} className={inputClass} placeholder="Titre principal..." />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Sous-titre</label>
                <textarea value={hero.sousTitre} onChange={(e) => setHero({ ...hero, sousTitre: e.target.value })} rows={3} className={inputClass + ' resize-none'} placeholder="Sous-titre..." />
              </div>
              <div className="flex justify-end pt-1">
                <SaveButton
                  onClick={() => save('hero', { hero_titre: hero.titre, hero_sous_titre: hero.sousTitre })}
                  saved={!!saved['hero']} loading={!!saving['hero']} />
              </div>
            </div>
          </div>

          {/* A propos */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">À propos</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Texte de présentation</label>
                <textarea value={about.texte} onChange={(e) => setAbout({ ...about, texte: e.target.value })} rows={5} className={inputClass + ' resize-none'} placeholder="Texte de présentation..." />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Texte court <span className="text-[#ABBED1] font-normal">(affiché au-dessus des chiffres)</span></label>
                <textarea value={about.texte2} onChange={(e) => setAbout({ ...about, texte2: e.target.value })} rows={2} className={inputClass + ' resize-none'} placeholder="Notre approche est simple..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Chiffre 1</label>
                  <input value={about.stat1Valeur} onChange={(e) => setAbout({ ...about, stat1Valeur: e.target.value })} className={inputClass} placeholder="+100" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Légende chiffre 1</label>
                  <input value={about.stat1Label} onChange={(e) => setAbout({ ...about, stat1Label: e.target.value })} className={inputClass} placeholder="Clients satisfaits" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Légende chiffre 2 <span className="text-[#ABBED1] font-normal">(la valeur est le nombre de références produit, calculée automatiquement)</span></label>
                <input value={about.stat2Label} onChange={(e) => setAbout({ ...about, stat2Label: e.target.value })} className={inputClass} placeholder="Références produits" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={about.logosEnabled} onChange={(e) => setAbout({ ...about, logosEnabled: e.target.checked })} className="w-4 h-4 accent-[#4CAF4F]" />
                <span className="text-[13px] text-[#374151]">Afficher la bande de logos clients (défilante) au lieu des photos fixes</span>
              </label>
              <div className="flex justify-end pt-1">
                <SaveButton
                  onClick={() => save('about', {
                    about_texte: about.texte,
                    about_texte_2: about.texte2,
                    about_logos_enabled: String(about.logosEnabled),
                    about_stat1_valeur: about.stat1Valeur,
                    about_stat1_label: about.stat1Label,
                    about_stat2_label: about.stat2Label,
                  })}
                  saved={!!saved['about']} loading={!!saving['about']} />
              </div>
            </div>
          </div>

          {/* Logos clients (bande défilante) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <button type="button" onClick={() => setLogosOpen((v) => !v)} className="w-full flex items-center justify-between p-6">
              <div className="text-start">
                <h2 className="text-[15px] font-bold text-[#0F172A]">Logos clients</h2>
                <p className="text-[12px] text-[#8A9BB5] mt-0.5">{logos.length} client{logos.length > 1 ? 's' : ''} — affichés si la bande défilante est activée ci-dessus</p>
              </div>
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" className={`shrink-0 transition-transform duration-200 ${logosOpen ? 'rotate-180' : ''}`}>
                <path d="M4 6l4 4 4-4" stroke="#8A9BB5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {logosOpen && (
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {logos.map((l) => editingLogoId === l.id ? (
                    <div key={l.id} className="col-span-2 sm:col-span-3 rounded-xl border border-[#4CAF4F] bg-[#F0FDF4] p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="shrink-0 w-14 h-14 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center cursor-pointer overflow-hidden" title="Changer le logo">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEditLogoFile(e.target.files?.[0])} />
                          {editLogoPhoto === null ? (
                            <span className="text-[11px] text-[#ABBED1]">Aucun</span>
                          ) : editLogoPhoto ? (
                            <img src={editLogoPhoto} alt="" className="w-full h-full object-contain" />
                          ) : l.photo ? (
                            <img src={l.photo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[20px] text-[#ABBED1]">+</span>
                          )}
                        </label>
                        <input value={editLogoName} onChange={(e) => setEditLogoName(e.target.value)} className={inputClass} placeholder="Nom du client" />
                      </div>
                      {(editLogoPhoto === undefined ? l.photo : editLogoPhoto) && (
                        <button type="button" onClick={() => setEditLogoPhoto(null)} className="text-[11px] text-[#EF4444] font-semibold">Retirer le logo (garder le nom seul)</button>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={cancelEditLogo} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#374151] border border-[#E2E8F0]">Annuler</button>
                        <button type="button" onClick={saveEditLogo} disabled={!editLogoName.trim() || editLogoSaving}
                          className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: '#4CAF4F' }}>
                          {editLogoSaving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={l.id} className="relative group rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex flex-col items-center gap-2 cursor-pointer hover:border-[#4CAF4F]" onClick={() => startEditLogo(l)}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeLogo(l.id); }} title="Retirer" className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-white border border-[#E2E8F0] text-[#EF4444] text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      {l.photo ? (
                        <img src={l.photo} alt={l.name} className="h-10 w-full object-contain" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[12px] font-bold text-[#8A9BB5]">
                          {l.name.trim().slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] text-[#374151] text-center truncate w-full">{l.name}</span>
                    </div>
                  ))}
                  <label className="rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#4CAF4F] transition-colors min-h-[84px]">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFile(e.target.files?.[0])} />
                    {newLogoPhoto ? (
                      <img src={newLogoPhoto} alt="" className="h-10 object-contain" />
                    ) : (
                      <span className="text-[20px] text-[#ABBED1] leading-none">+</span>
                    )}
                    <span className="text-[11px] text-[#8A9BB5]">{newLogoPhoto ? 'Changer le logo' : 'Logo (facultatif)'}</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input value={newLogoName} onChange={(e) => setNewLogoName(e.target.value)} className={inputClass} placeholder="Nom du client (ex: Moon Mobil)" />
                  <button type="button" onClick={addLogo} disabled={!newLogoName.trim() || logosSaving}
                    className="shrink-0 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: '#4CAF4F' }}>
                    {logosSaving ? 'Ajout…' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pourquoi nous choisir */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Section « Pourquoi nous choisir »</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Titre</label>
                <input value={why.why_titre ?? ''} onChange={(e) => setWhy({ ...why, why_titre: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Sous-titre</label>
                <textarea value={why.why_sous_titre ?? ''} onChange={(e) => setWhy({ ...why, why_sous_titre: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
              </div>
              {/* Seules les cartes 2 (Qualité) et 3 (Imprimantes) sont affichées sur le site —
                  les 2 autres arguments existent encore en base mais ne sont plus montrés. */}
              {[3, 2].map((n) => (
                <div key={n} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2">
                  <label className="block text-[12px] font-semibold text-[#374151]">Carte {n === 3 ? '« Compatibilité imprimantes »' : '« Qualité et savoir-faire »'}</label>
                  <input value={why[`why_${n}_titre`] ?? ''} onChange={(e) => setWhy({ ...why, [`why_${n}_titre`]: e.target.value })} className={inputClass} placeholder="Titre" />
                  <textarea value={why[`why_${n}_desc`] ?? ''} onChange={(e) => setWhy({ ...why, [`why_${n}_desc`]: e.target.value })} rows={2} className={inputClass + ' resize-none'} placeholder="Description courte (face avant)" />
                  <div>
                    <label className="block text-[11px] text-[#8A9BB5] mb-1">Liste révélée au survol (une ligne = un point)</label>
                    <textarea value={why[`why_${n}_liste`] ?? ''} onChange={(e) => setWhy({ ...why, [`why_${n}_liste`]: e.target.value })} rows={6} className={inputClass + ' resize-none'} placeholder={'Point 1\nPoint 2\n...'} />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <SaveButton onClick={() => save('why', why)} saved={!!saved['why']} loading={!!saving['why']} />
              </div>
            </div>
          </div>

          {/* Bannière (texte sous le bouton) + bloc devis */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Bannière et bloc devis</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Texte sous le bouton de la bannière</label>
                <input value={devis.hero_clients ?? ''} onChange={(e) => setDevis({ ...devis, hero_clients: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Titre du bloc devis</label>
                <input value={devis.devis_titre ?? ''} onChange={(e) => setDevis({ ...devis, devis_titre: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Sous-titre du bloc devis</label>
                <textarea value={devis.devis_sous_titre ?? ''} onChange={(e) => setDevis({ ...devis, devis_sous_titre: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
              </div>
              {[1, 2, 3].map((n) => (
                <div key={n}>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Point {n}</label>
                  <input value={devis[`devis_point_${n}`] ?? ''} onChange={(e) => setDevis({ ...devis, [`devis_point_${n}`]: e.target.value })} className={inputClass} />
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <SaveButton onClick={() => save('devis', devis)} saved={!!saved['devis']} loading={!!saving['devis']} />
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-6">

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Informations de contact</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Adresse</label>
                <input value={contact.adresse} onChange={(e) => setContact({ ...contact, adresse: e.target.value })} className={inputClass} placeholder="Adresse..." />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Email</label>
                <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputClass} placeholder="Email..." />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Téléphone</label>
                <input value={contact.telephone} onChange={(e) => setContact({ ...contact, telephone: e.target.value })} className={inputClass} placeholder="Téléphone..." />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Facebook (URL)</label>
                <input value={contact.facebook} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} className={inputClass} placeholder="https://www.facebook.com/..." />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Instagram (URL)</label>
                <input value={contact.instagram} onChange={(e) => setContact({ ...contact, instagram: e.target.value })} className={inputClass} placeholder="https://www.instagram.com/..." />
              </div>
              <div className="flex justify-end pt-1">
                <SaveButton
                  onClick={() => save('contact', { contact_adresse: contact.adresse, contact_email: contact.email, contact_telephone: contact.telephone, contact_facebook: contact.facebook, contact_instagram: contact.instagram })}
                  saved={!!saved['contact']} loading={!!saving['contact']} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </fieldset>
  );
}

export default function ContentPage() {
  return <RequirePerm perm={['modifier_contenu', 'voir_contenu']}><ContentPageInner /></RequirePerm>;
}
