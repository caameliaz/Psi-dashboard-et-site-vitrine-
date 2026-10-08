'use client';

import { useState, useEffect } from 'react';
import { RequirePerm } from '@/components/RequirePerm';
import { useRole } from '@/lib/role-context';
import { fr } from '@/lib/i18n/fr';
import { compressImage } from '@/lib/compress-image';

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
function CategoryGalleryCard() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [catId, setCatId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then((r) => r.ok ? r.json() : []).then((data: any[]) => {
      setCats(data.map((c) => ({ id: c.id, name: c.name })));
      if (data[0]) setCatId(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!catId) return;
    setPhotos([]);
    fetch(`/api/content/gallery?categoryId=${catId}`).then((r) => r.ok ? r.json() : { photos: [] })
      .then((d) => setPhotos(d.photos ?? [])).catch(() => {});
  }, [catId]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_GALLERY - photos.length;
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      try { added.push(await compressImage(f, 900, 0.8)); } catch { /* image illisible : ignorée */ }
    }
    setPhotos((p) => [...p, ...added]);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`category_gallery_${catId}`]: JSON.stringify(photos) }),
      });
      if (!res.ok) { alert((await res.json().catch(() => null))?.error ?? `L'enregistrement a échoué (erreur ${res.status}).`); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
      <h2 className="text-[15px] font-bold text-[#0F172A] mb-1">Photos des pages catégorie</h2>
      <p className="text-[12px] text-[#8A9BB5] mb-5">Photos supplémentaires affichées en miniatures sous la photo principale (max {MAX_GALLERY}). La photo principale se change dans la catégorie.</p>
      <div className="space-y-4">
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inputClass}>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-contain" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                aria-label="Supprimer la photo"
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[12px] leading-5 text-center">×</button>
            </div>
          ))}
          {photos.length < MAX_GALLERY && (
            <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[#CBD5E1] flex items-center justify-center text-[#8A9BB5] text-[24px] cursor-pointer hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors">
              +
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
          )}
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
  const [about,   setAbout]   = useState({ texte: '' });
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
        texte: data['about_texte'] ?? 'PSI (Paper Solutions Industry) est une entreprise algérienne spécialisée dans la transformation et la distribution de papier thermique professionnel. Basée à Alger, nous servons commerces, banques, restaurants et pharmacies à travers tout le territoire national.\n\nNous nous approvisionnons exclusivement auprès de fournisseurs européens certifiés, garantissant à nos clients des produits de qualité supérieure, conformes aux normes sanitaires les plus strictes.\n\nNotre mission est d\'offrir des solutions papier fiables, rapides et accessibles à tous les professionnels qui en ont besoin, avec un service client réactif et de proximité.',
      });
      const badges = fr.quality as Record<string, string>;
      setWhy({
        why_titre: data['why_titre'] ?? fr.why.title,
        why_sous_titre: data['why_sous_titre'] ?? fr.why.subtitle,
        ...Object.fromEntries([1, 2, 3, 4].flatMap((n) => [
          [`why_${n}_titre`, data[`why_${n}_titre`] ?? badges[`badge${n}_title`]],
          [`why_${n}_desc`, data[`why_${n}_desc`] ?? badges[`badge${n}_desc_short`]],
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
  }, []);

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
                <textarea value={about.texte} onChange={(e) => setAbout({ texte: e.target.value })} rows={5} className={inputClass + ' resize-none'} placeholder="Texte de présentation..." />
              </div>
              <div className="flex justify-end pt-1">
                <SaveButton
                  onClick={() => save('about', { about_texte: about.texte })}
                  saved={!!saved['about']} loading={!!saving['about']} />
              </div>
            </div>
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
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2">
                  <label className="block text-[12px] font-semibold text-[#374151]">Argument {n}</label>
                  <input value={why[`why_${n}_titre`] ?? ''} onChange={(e) => setWhy({ ...why, [`why_${n}_titre`]: e.target.value })} className={inputClass} placeholder="Titre" />
                  <textarea value={why[`why_${n}_desc`] ?? ''} onChange={(e) => setWhy({ ...why, [`why_${n}_desc`]: e.target.value })} rows={2} className={inputClass + ' resize-none'} placeholder="Description courte" />
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

          <CategoryGalleryCard />

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
