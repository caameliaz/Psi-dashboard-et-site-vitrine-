'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function QuotePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    wilaya: '',
    width: '',
    length: '',
    quantity: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert('Demande de devis envoyee ! Notre equipe vous contactera rapidement.');
    router.push('/');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputClass =
    'w-full px-4 py-3 border border-[#ABBED1] rounded-xl text-[15px] text-[#263238] placeholder-[#89939E] focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/40 focus:border-[#4CAF4F] transition-colors bg-white';
  const labelClass =
    'block text-[13px] font-semibold text-[#4D4D4D] mb-1.5 uppercase tracking-wide';

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <div className="max-w-[1100px] mx-auto">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#717171] text-[14px] hover:text-[#263238] transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Retour
        </Link>

        <h1 className="text-[36px] md:text-[42px] font-bold text-[#263238] mb-2">Demander un devis</h1>
        <p className="text-[16px] text-[#717171] mb-10">
          Remplissez le formulaire ci-dessous et notre equipe vous recontactera rapidement.
        </p>

        <div className="flex flex-col lg:flex-row gap-8">

          <form onSubmit={handleSubmit} className="flex-1">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-8 flex flex-col gap-6">
              <h2 className="text-[18px] font-bold text-[#263238]">Vos coordonnees</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Nom complet *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Votre nom et prenom" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Entreprise</label>
                  <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Nom de votre entreprise" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Telephone *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+213 XXX XXX XXX" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Wilaya *</label>
                  <input type="text" name="wilaya" value={formData.wilaya} onChange={handleChange} placeholder="Ex : Alger, Oran..." required className={inputClass} />
                </div>
              </div>

              <div className="border-t border-[#F0F4F8] pt-6">
                <h2 className="text-[18px] font-bold text-[#263238] mb-5">Specifications du produit</h2>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Largeur (mm)</label>
                    <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="Ex : 80" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Longueur (m)</label>
                    <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="Ex : 80" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Quantite</label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="Ex : 500" className={inputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Message complementaire</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Decrivez vos besoins, conditions de livraison, delais..."
                  rows={4}
                  required
                  className={inputClass + ' resize-none'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4CAF4F] text-white text-[16px] font-semibold py-4 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Envoi en cours...' : 'Envoyer la demande'}</span>
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </form>

          <div className="lg:w-[300px] shrink-0 flex flex-col gap-5">

            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6">
              <h3 className="text-[16px] font-bold text-[#263238] mb-4">Pourquoi choisir PSI ?</h3>
              <ul className="flex flex-col gap-3">
                {[
                  { icon: '🇩🇪', text: 'Papier origine Europe certifie' },
                  { icon: '🛡️', text: 'BPA Free — securite sanitaire' },
                  { icon: '📦', text: 'Livraison dans toute Algerie' },
                  { icon: '⚡', text: 'Reponse sous 24h' },
                  { icon: '🤝', text: 'Prix competitifs volume' },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-[14px] text-[#717171]">
                    <span className="text-[16px] shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#263238] rounded-2xl p-6 flex flex-col gap-4">
              <p className="text-[15px] font-semibold text-white">Une question ?</p>
              <p className="text-[13px] text-[#89939E] leading-relaxed">
                Notre equipe est disponible du dimanche au jeudi, 8h - 17h.
              </p>
              <a
                href="mailto:contact@psi-algerie.com"
                className="flex items-center gap-2 text-[#4CAF4F] text-[14px] font-medium hover:text-[#81C784] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                contact@psi-algerie.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
