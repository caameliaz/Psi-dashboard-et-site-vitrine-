import Link from 'next/link';
import { products } from '@/lib/mock-data';
import { ProductCard } from '@/components/ProductCard';

export default function Home() {
  return (
    <div className="bg-white">

      {/* ════════════════════════════════════════════════════════════
          HERO  — image plein écran, 70vh min, overlay sombre
      ════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[70vh] bg-cover bg-center flex items-center"
        style={{ backgroundImage: 'url(/photo%202.avif)' }}
      >
        {/* Overlay dégradé */}
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(38,50,56,0.90)] via-[rgba(38,50,56,0.75)] to-[rgba(38,50,56,0.45)]" />

        <div className="relative w-full max-w-[1280px] mx-auto px-6 md:px-12 py-20">
          <div className="max-w-[620px] flex flex-col gap-6">
            {/* Titre */}
            <div className="flex flex-col gap-2">
              <h1 className="text-[56px] md:text-[72px] font-extrabold text-white leading-none tracking-tight">
                PSI
              </h1>
              <p className="text-[18px] md:text-[22px] font-light text-white/80 mt-1 leading-relaxed">
                Spécialiste du papier thermique<br className="hidden md:block"/> professionnel en Algérie
              </p>
            </div>

            {/* Boutons */}
            <div className="flex flex-row gap-4 mt-4">
              <a
                href="#products"
                className="flex items-center gap-2 bg-[#4CAF4F] text-white text-[15px] font-semibold px-8 py-4 rounded shadow-[0px_4px_14px_rgba(76,175,79,0.5)] hover:bg-[#43A047] transition-all"
              >
                Voir nos produits
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <Link
                href="/quote"
                className="flex items-center gap-2 border-2 border-white/70 text-white text-[15px] font-semibold px-8 py-4 rounded hover:bg-white hover:text-[#4CAF4F] transition-all"
              >
                Demander un devis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PRODUITS
      ════════════════════════════════════════════════════════════ */}
      <section id="products" className="bg-white py-20 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10">

          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-[36px] md:text-[42px] font-bold text-[#263238] leading-tight">
              Nos Produits
            </h2>
            <p className="text-[16px] md:text-[18px] text-[#717171] max-w-[480px] leading-relaxed">
              Rouleaux thermiques de haute qualité pour tous vos besoins professionnels
            </p>
          </div>

          {/* Filtre */}
          <div className="flex justify-center gap-3">
            <button className="bg-[#4CAF4F] text-white text-[14px] font-semibold px-6 py-2.5 rounded-full shadow-[0_4px_14px_rgba(76,175,79,0.3)]">
              Papier thermique
            </button>
          </div>

          {/* Grille */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          QUALITÉ & CONFORMITÉ
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-[#EBF4FF] py-16 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row items-start lg:items-center gap-12">

          {/* Texte */}
          <div className="flex flex-col gap-4 lg:max-w-[380px]">
            <h2 className="text-[28px] md:text-[32px] font-bold text-[#4D4D4D] leading-snug">
              Notre engagement<br/>
              <span className="text-[#4CAF4F]">qualité & conformité</span>
            </h2>
            <p className="text-[16px] text-[#717171] leading-relaxed">
              Des produits sélectionnés pour leur fiabilité et leur conformité aux standards européens les plus exigeants.
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-start gap-6 md:gap-12 flex-wrap">
            {[
              {
                label: '55 gr/m²',
                sub: 'Papier Premium',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="18" rx="2" stroke="#4CAF4F" strokeWidth="1.8"/>
                    <path d="M2 9h20M8 3v6" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                ),
              },
              {
                label: 'Allemagne',
                sub: 'Origine Europe',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="5" fill="#1a1a1a" rx="1"/>
                    <rect x="2" y="10" width="20" height="4.5" fill="#D32F2F"/>
                    <rect x="2" y="14.5" width="20" height="5" fill="#FDD835" rx="1"/>
                  </svg>
                ),
              },
              {
                label: 'BPA Free',
                sub: 'Sécurité Sanitaire',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l8 3v6.5C20 16.7 16.6 21 12 22 7.4 21 4 16.7 4 11.5V5l8-3z" stroke="#4CAF4F" strokeWidth="1.8"/>
                    <path d="M8.5 12l3 3 5-5" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3 min-w-[100px]">
                <div className="w-14 h-14 bg-white border-2 border-[#C8DFF7] shadow-[0_4px_12px_rgba(171,190,209,0.4)] rounded-xl flex items-center justify-center">
                  {item.icon}
                </div>
                <div className="text-center">
                  <p className="text-[17px] font-bold text-[#263238] leading-5">{item.label}</p>
                  <p className="text-[13px] text-[#717171] mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          À PROPOS
      ════════════════════════════════════════════════════════════ */}
      <section id="about" className="bg-white py-20 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
          <h2 className="text-[32px] md:text-[38px] font-bold text-[#4D4D4D] leading-tight">
            À propos de PSI
          </h2>
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex flex-col gap-5 text-[16px] md:text-[17px] text-[#717171] leading-[1.75] flex-1">
              <p>
                PSI (Paper Solutions Industry) est une entreprise algérienne spécialisée dans la transformation et la distribution de papier thermique professionnel. Basée à Alger, nous servons commerces, banques, restaurants et pharmacies à travers tout le territoire national.
              </p>
              <p>
                Nous nous approvisionnons exclusivement auprès de fournisseurs européens certifiés, garantissant à nos clients des produits de qualité supérieure, conformes aux normes sanitaires les plus strictes.
              </p>
              <p>
                Notre mission est d'offrir des solutions papier fiables, rapides et accessibles à tous les professionnels qui en ont besoin, avec un service client réactif et de proximité.
              </p>
            </div>
            {/* Image */}
            <div className="lg:w-[460px] shrink-0 w-full">
              <div
                className="w-full h-[280px] md:h-[320px] bg-cover bg-center rounded-2xl shadow-[0_16px_48px_rgba(38,50,56,0.15)]"
                style={{ backgroundImage: 'url(/photo%202.avif)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════════════ */}
      <section id="contact" className="bg-[#4CAF4F] py-20 px-6 md:px-12 relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5" />

        <div className="relative max-w-[1280px] mx-auto flex flex-col items-center gap-6 text-center">
          <h2 className="text-[32px] md:text-[48px] font-bold text-white leading-tight max-w-[600px]">
            Besoin d'un devis personnalisé ?
          </h2>
          <p className="text-[16px] md:text-[18px] text-[#E8F5E9] max-w-[480px] leading-relaxed">
            Contactez notre équipe commerciale pour obtenir une offre adaptée à vos besoins.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 bg-white text-[#4CAF4F] text-[16px] font-bold px-10 py-4 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-all"
            >
              Nous contacter
            </Link>
            <Link
              href="/quote"
              className="flex items-center justify-center border-2 border-white text-white text-[16px] font-bold px-10 py-4 rounded-xl hover:bg-white/10 transition-all"
            >
              Demander un devis
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6 mt-6 text-[14px] text-[#E8F5E9]">
            <span>📍 Centre El Qods, Niveau M1, Chéraga, Alger</span>
            <span className="hidden sm:block opacity-40">•</span>
            <a href="mailto:contact@psi-algerie.com" className="hover:text-white transition-colors">
              ✉️ contact@psi-algerie.com
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
