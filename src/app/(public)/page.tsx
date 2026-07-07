import Link from 'next/link';
import Image from 'next/image';
import { ProductCard } from '@/components/ProductCard';

const BASE = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

async function getProducts() {
  try {
    const res = await fetch(`${BASE}/api/products`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getContent(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BASE}/api/content`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export default async function Home() {
  const [products, content] = await Promise.all([getProducts(), getContent()]);

  const heroTitre     = content['hero_titre']     ?? 'PSI';
  const heroSoustitre = content['hero_soustitre'] ?? 'Spécialiste du papier thermique professionnel en Algérie';
  const aboutTexte    = content['about_texte']    ?? '';
  return (
    <div className="bg-white">

      {/* ════════════════════════════════════════════════════════════
          HERO  — image plein écran, 70vh min, overlay sombre
      ════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-[70vh] bg-cover bg-center flex items-center"
        style={{ backgroundImage: 'url(/geri-sakti-g9_KP2fvFII-unsplash.jpg)' }}
      >
        {/* Overlay dégradé */}
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(38,50,56,0.90)] via-[rgba(38,50,56,0.75)] to-[rgba(38,50,56,0.45)]" />

        <div className="relative w-full max-w-[1280px] mx-auto px-6 md:px-12 py-20">
          <div className="max-w-[620px] flex flex-col gap-6">
            {/* Titre */}
            <div className="flex flex-col gap-2">
              <h1 className="text-[56px] md:text-[72px] font-extrabold text-white leading-none tracking-tight">
                {heroTitre}
              </h1>
              <p className="text-[18px] md:text-[22px] font-light text-white/80 mt-1 leading-relaxed">
                {heroSoustitre}
              </p>
            </div>

            {/* Boutons */}
            <div className="flex flex-row flex-wrap gap-4 mt-4">
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
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px] gap-x-16 gap-y-8 items-start">

          {/* ── Titre + filtre ── */}
          <div className="flex items-center gap-4 flex-wrap min-w-0">
            <h2 className="text-[36px] md:text-[42px] font-bold text-[#263238] leading-tight">
              Nos Produits
            </h2>
            <button className="bg-[#4CAF4F] text-white text-[14px] font-semibold px-6 py-2.5 rounded-full shadow-[0_4px_14px_rgba(76,175,79,0.3)]">
              Papier thermique
            </button>
          </div>

          {/* ── Gauche : grille ── */}
          <div className="flex flex-col gap-8 min-w-0 lg:col-start-1 lg:row-start-2">
            {/* Grille */}
            <div className="bg-[#F0F2F5] rounded-2xl p-4 grid grid-cols-2 gap-4">
              {products.slice(0, 6).map((product: any, i: number) => (
                <div key={product.id} style={{ animation: `fadeDown 0.45s ease both`, animationDelay: `${i * 0.12}s` }}>
                  <ProductCard product={product} hideImage />
                </div>
              ))}
            </div>

            {/* Bouton "Voir plus" si plus de 6 produits */}
            {products.length > 6 && (
              <div>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 border-2 border-[#4CAF4F] text-[#4CAF4F] text-[15px] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#4CAF4F] hover:text-white transition-all"
                >
                  Voir tous les produits
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* ── Droite : image ── */}
          <div className="w-full h-full lg:col-start-2 lg:row-start-2 lg:self-stretch" style={{ animation: 'fadeDown 0.5s ease both', animationDelay: `${6 * 0.12 + 0.15}s` }}>
            <div className="relative w-full aspect-[4/5] lg:aspect-auto lg:h-full rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/426-Papier-couche-blanc-jet-dencre-premium-160g.jpg"
                alt="Rouleaux thermiques PSI"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 520px"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          QUALITÉ & CONFORMITÉ
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-[#EBF4FF] py-16 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-10 text-center">

          {/* Texte */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[28px] md:text-[32px] font-bold text-[#4D4D4D] leading-snug">
              Notre engagement <span className="text-[#4CAF4F]">qualité & conformité</span>
            </h2>
            <p className="text-[16px] text-[#717171] leading-relaxed max-w-[480px] mx-auto">
              Des produits sélectionnés pour leur fiabilité et leur conformité aux standards européens les plus exigeants.
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-start justify-center gap-10 md:gap-20 flex-wrap">

            {/* Papier Premium */}
            <div className="flex flex-col items-center gap-3 min-w-[100px]">
              <div className="w-14 h-14 bg-white border-2 border-[#C8DFF7] shadow-[0_4px_12px_rgba(171,190,209,0.4)] rounded-xl flex items-center justify-center overflow-hidden">
                <Image src="/Papier-thermique-1920x600.jpg" alt="Papier thermique" width={56} height={56} className="object-cover w-full h-full" />
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#263238] leading-5">55 gr/m²</p>
                <p className="text-[13px] text-[#717171] mt-0.5">Papier Premium</p>
              </div>
            </div>

            {/* Origine Allemagne */}
            <div className="flex flex-col items-center gap-3 min-w-[100px]">
              <div className="w-14 h-14 bg-white border-2 border-[#C8DFF7] shadow-[0_4px_12px_rgba(171,190,209,0.4)] rounded-xl flex items-center justify-center overflow-hidden">
                <svg width="36" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="36" height="8" fill="#1a1a1a"/>
                  <rect y="8" width="36" height="8" fill="#D32F2F"/>
                  <rect y="16" width="36" height="8" fill="#FDD835"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#263238] leading-5">Allemagne</p>
                <p className="text-[13px] text-[#717171] mt-0.5">Origine Europe</p>
              </div>
            </div>

            {/* BPA Free */}
            <div className="flex flex-col items-center gap-3 min-w-[100px]">
              <div className="w-14 h-14 bg-white border-2 border-[#C8DFF7] shadow-[0_4px_12px_rgba(171,190,209,0.4)] rounded-xl flex items-center justify-center overflow-hidden">
                <Image src="/symbole-certifie-sans-bisphenol-bpa_1017-18549.avif" alt="BPA Free" width={48} height={48} className="object-contain" />
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#263238] leading-5">BPA Free</p>
                <p className="text-[13px] text-[#717171] mt-0.5">Sécurité Sanitaire</p>
              </div>
            </div>

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
              {aboutTexte
                ? aboutTexte.split('\n\n').map((para, i) => <p key={i}>{para}</p>)
                : <>
                    <p>PSI (Paper Solutions Industry) est une entreprise algérienne spécialisée dans la transformation et la distribution de papier thermique professionnel. Basée à Alger, nous servons commerces, banques, restaurants et pharmacies à travers tout le territoire national.</p>
                    <p>Nous nous approvisionnons exclusivement auprès de fournisseurs européens certifiés, garantissant à nos clients des produits de qualité supérieure, conformes aux normes sanitaires les plus strictes.</p>
                    <p>Notre mission est d'offrir des solutions papier fiables, rapides et accessibles à tous les professionnels qui en ont besoin, avec un service client réactif et de proximité.</p>
                  </>
              }
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
        </div>
      </section>

    </div>
  );
}
