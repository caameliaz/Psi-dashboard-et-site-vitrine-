'use client';

import { useState, useEffect } from 'react';

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

export default function ContentPage() {
  const [hero,    setHero]    = useState({ titre: '', soustitre: '' });
  const [about,   setAbout]   = useState({ texte: '' });
  const [contact, setContact] = useState({ adresse: '', email: '', telephone: '', facebook: '', instagram: '' });
  const [saved,   setSaved]   = useState<Record<string, boolean>>({});
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    fetch('/api/content').then((r) => r.json()).then((data: Record<string, string>) => {
      setHero({
        titre:     data['hero_titre']     ?? 'PSI',
        soustitre: data['hero_soustitre'] ?? 'Spécialiste du papier thermique professionnel en Algérie',
      });
      setAbout({
        texte: data['about_texte'] ?? 'PSI (Paper Solutions Industry) est une entreprise algérienne spécialisée dans la transformation et la distribution de papier thermique professionnel. Basée à Alger, nous servons commerces, banques, restaurants et pharmacies à travers tout le territoire national.\n\nNous nous approvisionnons exclusivement auprès de fournisseurs européens certifiés, garantissant à nos clients des produits de qualité supérieure, conformes aux normes sanitaires les plus strictes.\n\nNotre mission est d\'offrir des solutions papier fiables, rapides et accessibles à tous les professionnels qui en ont besoin, avec un service client réactif et de proximité.',
      });
      setContact({
        adresse:   data['contact_adresse']   ?? 'Centre El Qods, Niveau M1, Chéraga, Alger',
        email:     data['contact_email']     ?? 'contact@psi-algerie.com',
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
      await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
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
                <input value={hero.soustitre} onChange={(e) => setHero({ ...hero, soustitre: e.target.value })} className={inputClass} placeholder="Sous-titre..." />
              </div>
              <div className="flex justify-end pt-1">
                <SaveButton
                  onClick={() => save('hero', { hero_titre: hero.titre, hero_soustitre: hero.soustitre })}
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
  );
}
