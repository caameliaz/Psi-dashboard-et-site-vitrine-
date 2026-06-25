'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    wilaya: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert('Message envoye ! Notre equipe vous contactera rapidement.');
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

        <h1 className="text-[36px] md:text-[42px] font-bold text-[#263238] mb-2">Contactez-nous</h1>
        <p className="text-[16px] text-[#717171] mb-10">
          Remplissez le formulaire ci-dessous et notre equipe vous recontactera rapidement.
        </p>

        <div className="flex flex-col lg:flex-row gap-8">

          <form onSubmit={handleSubmit} className="flex-1">
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-8 flex flex-col gap-6">

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
                  <label className={labelClass}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="votre@email.com" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Wilaya *</label>
                <input type="text" name="wilaya" value={formData.wilaya} onChange={handleChange} placeholder="Ex : Alger, Oran, Constantine..." required className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Votre message *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Decrivez votre besoin, posez votre question..."
                  rows={5}
                  required
                  className={inputClass + ' resize-none'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4CAF4F] text-white text-[16px] font-semibold py-4 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Envoi en cours...' : 'Envoyer le message'}</span>
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Sidebar coordonnees */}
          <div className="lg:w-[300px] shrink-0 flex flex-col gap-5">

            {/* Adresse */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 flex flex-col gap-5">
              <h3 className="text-[16px] font-bold text-[#263238]">Nos coordonnees</h3>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#4CAF4F" strokeWidth="1.8"/>
                    <circle cx="12" cy="10" r="3" stroke="#4CAF4F" strokeWidth="1.8"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#263238]">Adresse</p>
                  <p className="text-[13px] text-[#717171] mt-0.5 leading-relaxed">Centre El Qods, Niveau M1<br/>Cheraga, Alger</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#4CAF4F" strokeWidth="1.8"/>
                    <path d="M22 6l-10 7L2 6" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#263238]">Email</p>
                  <a href="mailto:contact@psi-algerie.com" className="text-[13px] text-[#4CAF4F] hover:underline mt-0.5 block">
                    contact@psi-algerie.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z" stroke="#4CAF4F" strokeWidth="1.8"/>
                    <path d="M12 6v6l4 2" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#263238]">Horaires</p>
                  <p className="text-[13px] text-[#717171] mt-0.5">Dim - Jeu : 8h a 17h</p>
                </div>
              </div>
            </div>

            {/* Devis rapide CTA */}
            <div className="bg-[#4CAF4F] rounded-2xl p-6 flex flex-col gap-3">
              <p className="text-[15px] font-bold text-white">Besoin urgent ?</p>
              <p className="text-[13px] text-[#E8F5E9] leading-relaxed">
                Demandez directement un devis personnalise avec vos specifications.
              </p>
              <Link
                href="/quote"
                className="mt-1 bg-white text-[#4CAF4F] text-[14px] font-bold py-2.5 rounded-xl text-center hover:bg-[#F5F7FA] transition-colors"
              >
                Demander un devis →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
