'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RequirePerm } from '@/components/RequirePerm';
import { useRole } from '@/lib/role-context';
import { dictionaries } from '@/lib/i18n/server';
import { LANG_META, LOCALES, contentKey, type Lang } from '@/lib/i18n/config';
import { compressImage } from '@/lib/compress-image';
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

const MAX_GALLERY = 6;

// Photos supplémentaires affichées en miniatures sous la photo principale d'une page catégorie.
function CategoryGalleryCard({ lang }: { lang: Lang }) {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [catId, setCatId] = useState('');
  const [photos, setPhotos] = useState<{ src: string; productId: string | null }[]>([]);
  const [usages, setUsages] = useState<string[]>(['', '', '']);
  const [refs, setRefs] = useState<{ id: string; reference: string; categoryId: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  // Usages dans une autre langue (English / العربية) : enregistrés avec les traductions du catalogue
  const [usagesTr, setUsagesTr] = useState<string[]>(['', '', '']);

  useEffect(() => {
    if (lang === 'fr' || !catId) return;
    setUsagesTr(['', '', '']);
    fetch('/api/translations').then((r) => r.ok ? r.json() : null).then((st) => {
      const u: string[] = st?.category?.[catId]?.[lang]?.usages ?? [];
      setUsagesTr([u[0] ?? '', u[1] ?? '', u[2] ?? '']);
    }).catch(() => {});
  }, [lang, catId]);

  useEffect(() => {
    fetch('/api/categories').then((r) => r.ok ? r.json() : []).then((data: any[]) => {
      setCats(data.map((c) => ({ id: c.id, name: c.name })));
      if (data[0]) setCatId(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/products?all=true').then((r) => r.ok ? r.json() : []).then((data: any[]) => {
      setRefs(data.map((p) => ({ id: p.id, reference: p.reference, categoryId: p.category?.id ?? null })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!catId) return;
    setPhotos([]);
    fetch(`/api/content/gallery?categoryId=${catId}&full=true`).then((r) => r.ok ? r.json() : { photos: [] })
      .then((d) => { setPhotos(d.photos ?? []); const u: string[] = d.usages ?? []; setUsages([u[0] ?? '', u[1] ?? '', u[2] ?? '']); }).catch(() => {});
  }, [catId]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_GALLERY - photos.length;
    const added: { src: string; productId: string | null }[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      try { added.push({ src: await compressImage(f, 900, 0.8), productId: null }); } catch { /* image illisible : ignorée */ }
    }
    setPhotos((p) => [...p, ...added]);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [`category_gallery_${catId}`]: JSON.stringify(photos),
          [`category_usages_${catId}`]: JSON.stringify(usages.map((u) => u.trim()).filter(Boolean)),
        }),
      });
      if (!res.ok) { alert((await res.json().catch(() => null))?.error ?? `L'enregistrement a échoué (erreur ${res.status}).`); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  const saveUsagesTr = async () => {
    if (lang === 'fr') return;
    setBusy(true);
    try {
      const res = await fetch('/api/translations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'category', id: catId, lang, data: { usages: usagesTr.map((u) => u.trim()).filter(Boolean) } }),
      });
      if (!res.ok) { alert((await res.json().catch(() => null))?.error ?? `L'enregistrement a échoué (erreur ${res.status}).`); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  // Autre langue que le français : seuls les usages se traduisent (les photos sont communes à toutes les langues)
  if (lang !== 'fr') {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-[15px] font-bold text-[#0F172A] mb-1">Usages des catégories <span className="ms-1 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">{LANG_META[lang].short}</span></h2>
        <p className="text-[12px] text-[#8A9BB5] mb-5">Traduction des 3 usages affichés sur la page de la catégorie. Les photos sont communes à toutes les langues ; le nom et la description de la catégorie se traduisent depuis Produits (bouton de langue). Un champ vide reste en français.</p>
        <div className="space-y-4">
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inputClass}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {usagesTr.map((u, i) => (
              <input key={i} value={u} maxLength={40} dir={lang === 'ar' ? 'rtl' : 'ltr'}
                placeholder={usages[i] ? `FR : ${usages[i]}` : `Usage ${i + 1}`}
                onChange={(e) => setUsagesTr((p) => p.map((x, j) => (j === i ? e.target.value : x)))} className={inputClass} />
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <SaveButton onClick={saveUsagesTr} saved={saved} loading={busy} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
      <h2 className="text-[15px] font-bold text-[#0F172A] mb-1">Photos des pages catégorie</h2>
      <p className="text-[12px] text-[#8A9BB5] mb-5">Photos affichées en miniatures sous la photo principale (max {MAX_GALLERY}). Lie chaque photo à une référence : elle s'affiche quand on clique sur cette référence. « Catégorie » = photo affichée quand la référence choisie n'a aucune photo. La photo principale se change dans la catégorie.</p>
      <div className="space-y-4">
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inputClass}>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-3">
          {photos.map((ph, i) => (
            <div key={i} className="w-24 flex flex-col gap-1">
              <div className="relative w-24 h-24 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
                <img src={ph.src} alt="" className="w-full h-full object-contain" />
                <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  aria-label="Supprimer la photo"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[12px] leading-5 text-center">×</button>
              </div>
              <select value={ph.productId ?? ''} aria-label="Référence liée à cette photo"
                onChange={(e) => setPhotos((p) => p.map((x, j) => j === i ? { ...x, productId: e.target.value || null } : x))}
                className="w-full px-1 py-1 rounded-md border border-[#E2E8F0] text-[11px] text-[#0F172A] bg-[#F8FAFC]">
                <option value="">Catégorie</option>
                {refs.filter((r) => r.categoryId === catId).map((r) => <option key={r.id} value={r.id}>{r.reference}</option>)}
              </select>
            </div>
          ))}
          {photos.length < MAX_GALLERY && (
            <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[#CBD5E1] flex items-center justify-center text-[#8A9BB5] text-[24px] cursor-pointer hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors">
              +
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Usages de la catégorie <span className="text-[#ABBED1] font-normal">(3 max — identiques pour toutes les références, ne changent pas quand on clique sur une référence)</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {usages.map((u, i) => (
              <input key={i} value={u} maxLength={40} placeholder={['Ex : Imprimantes thermiques', 'Ex : Caisses grand format', 'Ex : Commerces'][i]}
                onChange={(e) => setUsages((p) => p.map((x, j) => (j === i ? e.target.value : x)))} className={inputClass} />
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <SaveButton onClick={save} saved={saved} loading={busy} />
        </div>
      </div>
    </div>
  );
}

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
  // Langue des textes en cours d'édition (fr | en | ar). Chaque texte est enregistré sous une clé propre à la langue
  // (hero_titre, hero_titre__en, hero_titre__ar…) ; les infos de contact, logos et photos sont communes.
  const [editLang, setEditLang] = useState<Lang>('fr');
  const [raw, setRaw] = useState<Record<string, string>>({});
  const snap = useRef<Record<string, string>>({});
  // `ld` : éditer l'arabe → champs de droite à gauche
  const rtlCls = editLang === 'ar' ? ' lang-rtl' : '';

  const current = () => ({
    hero: JSON.stringify(hero), about: JSON.stringify(about), why: JSON.stringify(why), devis: JSON.stringify(devis),
  });

  // Remplit les formulaires avec les textes enregistrés dans la langue choisie (à défaut : le texte d'origine du site dans cette langue)
  const populate = useCallback((data: Record<string, string>, lang: Lang) => {
    const d = dictionaries[lang];
    const g = (key: string, fallback: string) => data[contentKey(key, lang)] ?? fallback;
    const nHero = {
      titre: g('hero_titre', `${d.hero.title_pre}${d.hero.title_highlight}${d.hero.title_post}`),
      sousTitre: g('hero_sous_titre', d.hero.subtitle),
    };
    const nAbout = {
      texte: g('about_texte', d.about.p1),
      texte2: g('about_texte_2', d.about.p4),
      // Commun à toutes les langues : bande de logos activée + valeur du chiffre 1
      logosEnabled: data['about_logos_enabled'] === 'true',
      stat1Valeur: data['about_stat1_valeur'] ?? d.about.stat1_value,
      stat1Label: g('about_stat1_label', d.about.stat1_label),
      stat2Label: g('about_stat2_label', d.about.stat2_label),
    };
    const badges = d.quality as Record<string, string>;
    const defaultListes: Record<number, string> = { 2: d.why.list2, 3: d.why.list3 };
    const nWhy = {
      why_titre: g('why_titre', d.why.title),
      why_sous_titre: g('why_sous_titre', d.why.subtitle),
      ...Object.fromEntries([1, 2, 3, 4].flatMap((n) => [
        [`why_${n}_titre`, g(`why_${n}_titre`, badges[`badge${n}_title`])],
        [`why_${n}_desc`, g(`why_${n}_desc`, badges[`badge${n}_desc_short`])],
        [`why_${n}_liste`, g(`why_${n}_liste`, defaultListes[n] ?? '')],
      ])),
    };
    const nDevis = {
      hero_clients: g('hero_clients', d.hero.clients),
      devis_titre: g('devis_titre', d.home_quote.title),
      devis_sous_titre: g('devis_sous_titre', d.home_quote.subtitle),
      devis_point_1: g('devis_point_1', d.home_quote.point1),
      devis_point_2: g('devis_point_2', d.home_quote.point2),
      devis_point_3: g('devis_point_3', d.home_quote.point3),
    };
    setHero(nHero); setAbout(nAbout); setWhy(nWhy); setDevis(nDevis);
    snap.current = { hero: JSON.stringify(nHero), about: JSON.stringify(nAbout), why: JSON.stringify(nWhy), devis: JSON.stringify(nDevis) };
  }, []);

  useEffect(() => {
    fetch('/api/content').then((r) => r.json()).then((data: Record<string, string>) => {
      setRaw(data);
      populate(data, 'fr');
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
  }, [populate]);

  const changeLang = (l: Lang) => {
    if (l === editLang) return;
    const c = current();
    if (Object.keys(c).some((k) => c[k as keyof typeof c] !== snap.current[k]) && !confirm('Des modifications non sauvegardées seront perdues en changeant de langue. Continuer ?')) return;
    setEditLang(l);
    populate(raw, l);
  };

  // Clés d'une section dans la langue éditée (hero_titre → hero_titre__en…)
  const T = (obj: Record<string, string>) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [contentKey(k, editLang), v]));

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
      setRaw((p) => ({ ...p, ...updates }));
      const c = current();
      if (section in c) snap.current[section] = c[section as keyof typeof c];
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
    <div className="w-full">
      {/* Champs de droite à gauche quand on édite l'arabe */}
      <style>{'.lang-rtl input, .lang-rtl textarea { direction: rtl; text-align: right; }'}</style>
      {!canEdit && <p className="mb-4 px-3 py-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[12px] font-semibold text-[#1E40AF]">Mode lecture seule — consultation uniquement.</p>}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#0F172A]">Contenu du site</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-1">Modifiez les textes affichés sur le site public</p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-[320px]">
          <p className="text-[14px] font-bold text-[#0F172A]">Langue des textes</p>
          <p className="text-[12px] text-[#8A9BB5] mt-0.5">
            Choisissez la langue pour modifier la version correspondante du site (français, anglais, arabe).
            Les sections marquées <span className="font-bold text-[#4CAF4F]">{LANG_META[editLang].short}</span> changent selon la langue ;
            contact, logos et photos sont communs. Un champ laissé vide reprend le texte d&apos;origine du site.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-[#F1F5F9]">
          {LOCALES.map((l) => (
            <button key={l} type="button" onClick={() => changeLang(l)} aria-pressed={editLang === l}
              className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${editLang === l ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5] hover:text-[#374151]'}`}>
              {LANG_META[l].native}
            </button>
          ))}
        </div>
      </div>

      <fieldset disabled={!canEdit} className="contents">
      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">

        {/* Colonne gauche */}
        <div className="flex flex-col gap-6">

          {/* Hero */}
          <div className={`bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm${rtlCls}`}>
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Section Hero<span className="ms-2 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">{LANG_META[editLang].short}</span></h2>
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
                  onClick={() => save('hero', T({ hero_titre: hero.titre, hero_sous_titre: hero.sousTitre }))}
                  saved={!!saved['hero']} loading={!!saving['hero']} />
              </div>
            </div>
          </div>

          {/* A propos */}
          <div className={`bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm${rtlCls}`}>
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">À propos<span className="ms-2 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">{LANG_META[editLang].short}</span></h2>
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
                    ...T({
                      about_texte: about.texte,
                      about_texte_2: about.texte2,
                      about_stat1_label: about.stat1Label,
                      about_stat2_label: about.stat2Label,
                    }),
                    // communs à toutes les langues
                    about_logos_enabled: String(about.logosEnabled),
                    about_stat1_valeur: about.stat1Valeur,
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
          <div className={`bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm${rtlCls}`}>
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Section « Pourquoi nous choisir »<span className="ms-2 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">{LANG_META[editLang].short}</span></h2>
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
                <SaveButton onClick={() => save('why', T(why))} saved={!!saved['why']} loading={!!saving['why']} />
              </div>
            </div>
          </div>

          {/* Bannière (texte sous le bouton) + bloc devis */}
          <div className={`bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm${rtlCls}`}>
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Bannière et bloc devis<span className="ms-2 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">{LANG_META[editLang].short}</span></h2>
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
                <SaveButton onClick={() => save('devis', T(devis))} saved={!!saved['devis']} loading={!!saving['devis']} />
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-6">

          <CategoryGalleryCard lang={editLang} />

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">Informations de contact <span className="ms-1 text-[11px] font-medium text-[#8A9BB5]">(communes à toutes les langues)</span></h2>
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
      </fieldset>
    </div>
  );
}

export default function ContentPage() {
  return <RequirePerm perm={['modifier_contenu', 'voir_contenu']}><ContentPageInner /></RequirePerm>;
}
