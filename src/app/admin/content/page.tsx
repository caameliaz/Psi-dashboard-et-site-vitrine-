'use client';

import { useState } from 'react';

function IconCheck() {
  return (
    <svg width={14} height={14} fill="none">
      <path d="M2 7L5.5 10.5L12 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
      style={{ background: saved ? '#22C55E' : '#4CAF4F' }}
    >
      <IconCheck /> {saved ? 'Sauvegarde !' : 'Sauvegarder'}
    </button>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

export default function ContentPage() {
  const [hero, setHero] = useState({ titre: 'Bienvenue chez PSI', soustitre: 'Des solutions papier thermique de qualite superieure' });
  const [about, setAbout] = useState({ texte: "PSI (Paper Solutions Industrielles) est specialisee dans la fabrication et la distribution de rouleaux de papier thermique pour les professionnels." });
  const [contact, setContact] = useState({ adresse: '12 Rue des Industries, Zone Industrielle, Alger', email: 'contact@psi.dz', telephone: '+213 555 100 200' });
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const save = (section: string) => {
    setSaved((p) => ({ ...p, [section]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [section]: false })), 2000);
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#0F172A]">Contenu du site</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-1">Modifiez les textes affiches sur le site public</p>
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
                <SaveButton onClick={() => save('hero')} saved={!!saved['hero']} />
              </div>
            </div>
          </div>

          {/* A propos */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-5">À propos</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Texte de presentation</label>
                <textarea value={about.texte} onChange={(e) => setAbout({ texte: e.target.value })} rows={5} className={inputClass + ' resize-none'} placeholder="Texte de presentation..." />
              </div>
              <div className="flex justify-end pt-1">
                <SaveButton onClick={() => save('about')} saved={!!saved['about']} />
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
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Telephone</label>
                <input value={contact.telephone} onChange={(e) => setContact({ ...contact, telephone: e.target.value })} className={inputClass} placeholder="Telephone..." />
              </div>
              <div className="flex justify-end pt-1">
                <SaveButton onClick={() => save('contact')} saved={!!saved['contact']} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
