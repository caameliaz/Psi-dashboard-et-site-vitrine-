import { CategoryBrowser } from '@/components/CategoryBrowser';

export default function ProductsPage() {
  return (
    <div className="bg-[#F5F7FA] min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-[#ABBED1]/30 py-14 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-3">
          <span className="text-[13px] font-semibold text-[#4CAF4F] uppercase tracking-widest">
            Catalogue
          </span>
          <h1 className="text-[36px] md:text-[48px] font-bold text-[#263238] leading-tight">
            Nos Produits
          </h1>
          <p className="text-[16px] md:text-[18px] text-[#717171] max-w-[520px] leading-relaxed">
            Rouleaux thermiques de haute qualité pour tous vos besoins professionnels. Origine Europe, conformes aux normes sanitaires.
          </p>
          <div className="flex gap-3 mt-4">
            <span className="bg-[#4CAF4F] text-white text-[13px] font-semibold px-5 py-2 rounded-full shadow-[0_4px_12px_rgba(76,175,79,0.3)]">
              Papier thermique
            </span>
          </div>
        </div>
      </div>

      {/* Catégories (photo + nom) → produits de la catégorie sélectionnée */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-14">
        <CategoryBrowser />

        {/* CTA bas de page */}
        <div className="mt-16 bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <p className="text-[20px] font-bold text-[#263238]">
              Vous ne trouvez pas ce qu&apos;il vous faut&nbsp;?
            </p>
            <p className="text-[15px] text-[#717171]">
              Demandez un devis sur mesure selon vos dimensions et quantités.
            </p>
          </div>
          <a
            href="/quote"
            className="shrink-0 bg-[#4CAF4F] text-white text-[15px] font-semibold px-8 py-3.5 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all whitespace-nowrap"
          >
            Demander un devis →
          </a>
        </div>
      </div>
    </div>
  );
}
