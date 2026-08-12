'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';
import { type Cat, type Prod } from '@/lib/hardcodedCatalog';

// Grille de catégories : chaque card affiche une image, un nom
// et un carrousel de références (produits de la catégorie) qu'on parcourt à la flèche.
export function CategoryBrowser({ 
  limit, 
  initialCategories, 
  initialProducts 
}: { 
  limit?: number;
  initialCategories?: Cat[];
  initialProducts?: Prod[];
}) {
  const { t } = useTranslation();
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);

  useEffect(() => {
    // Si les données sont passées en props, on les utilise directement (pas de fetch)
    if (initialCategories?.length && initialProducts?.length) {
      setCats(initialCategories);
      setProducts(initialProducts);
      return;
    }
    
    // Sinon comportement actuel : fetch côté client (rétrocompatible)
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then((data: any[]) =>
      setCats(data.map(c => ({ id: c.id, name: c.name, photo: c.photo ?? null, description: c.description ?? null })))
    ).catch(() => {});
    fetch('/api/products').then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, [initialCategories, initialProducts]);

  // Masque les catégories qui n'ont AUCUN produit actif (ex: catégorie entièrement désactivée)
  const catsWithProducts = cats.filter((c) =>
    products.some((p) => p.category?.id === c.id && p.width > 0 && p.length > 0)
  );
  const visibleCats = limit ? catsWithProducts.slice(0, limit) : catsWithProducts;

  return (
    <div className="flex flex-col gap-8">
      {/* Rangée horizontale qui passe à la ligne au besoin — se centre naturellement
          quand il y a peu de catégories, au lieu de rester collée à gauche. */}
      <div className="flex flex-wrap justify-center gap-5 md:gap-6">
        {visibleCats.map((cat) => (
          <div key={cat.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[400px]">
            <CategoryCard
              category={cat}
              products={products.filter(p => p.category?.id === cat.id && p.width > 0 && p.length > 0)}
            />
          </div>
        ))}
      </div>

      {limit && cats.length > limit && (
        <Link
          href="/products"
          className="self-center border-2 border-[#4CAF4F] text-[#4CAF4F] text-[14px] font-semibold px-7 py-3 rounded-full hover:bg-[#4CAF4F] hover:text-white transition-all"
        >
          {t('products_section.cta')}
        </Link>
      )}
    </div>
  );
}

function CategoryCard({ category, products }: { category: Cat; products: Prod[] }) {
  const { t } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);
  
  // Clé pour localStorage spécifique à cette catégorie
  const storageKey = `product-selections-${category.id}`;
  
  // État pour gérer les quantités de chaque produit avec persistance
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    // Essayer de restaurer depuis localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Vérifier que les produits existent toujours
          const validQuantities: Record<string, number> = {};
          products.forEach(p => {
            validQuantities[p.id] = parsed[p.id] || 0;
          });
          return validQuantities;
        }
      } catch (error) {
        console.warn('Erreur lors de la restauration des sélections:', error);
      }
    }
    // Valeur par défaut
    return Object.fromEntries(products.map(p => [p.id, 0]));
  });
  
  // État pour le message d'erreur
  const [errorMessage, setErrorMessage] = useState('');

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(quantities));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des sélections:', error);
      }
    }
  }, [quantities, storageKey]);

  const updateQuantity = (productId: string, newQty: number) => {
    setQuantities(prev => ({ ...prev, [productId]: Math.max(0, newQty) }));
    // Effacer le message d'erreur quand on sélectionne quelque chose
    if (newQty > 0) setErrorMessage('');
  };

  const selectProduct = (productId: string) => {
    const currentQty = quantities[productId] || 0;
    if (currentQty === 0) {
      updateQuantity(productId, 1);
    }
  };

  const addSelectedToCart = () => {
    const hasSelection = Object.values(quantities).some(qty => qty > 0);
    
    if (!hasSelection) {
      setErrorMessage('Aucune réf sélectionnée');
      return;
    }
    
    // Ajouter tous les produits avec quantité > 0 au panier
    Object.entries(quantities).forEach(([productId, qty]) => {
      if (qty > 0) {
        const product = products.find(p => p.id === productId);
        if (product) {
          addItem({
            productId: product.id,
            quantity: qty,
            reference: product.reference,
            unitPrice: product.price
          });
        }
      }
    });
    
    // Réinitialiser les quantités et effacer les messages après ajout
    const resetQuantities = Object.fromEntries(products.map(p => [p.id, 0]));
    setQuantities(resetQuantities);
    setErrorMessage('');
  };

  return (
    // Carte délimitée : bordure grise + fond blanc, pour que chaque produit
    // se distingue nettement du fond de page (surtout sur mobile).
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E4EBF5] bg-white p-3 pb-4 shadow-[0_2px_12px_rgba(171,190,209,0.18)] hover:shadow-[0_6px_24px_rgba(171,190,209,0.35)] transition-shadow">
      {/* Image catégorie — garde son propre container. Avec une vraie photo, elle se fond
          dans le fond de la page (pas de carte blanche/ombre) et reste entière (object-contain). */}
      <Link
        href={`/products/${category.id}`}
        className={`group relative rounded-2xl transition-shadow w-[95%] mx-auto h-72 md:h-80 flex items-center justify-center overflow-hidden ${
          category.photo ? 'p-3' : 'bg-[#F5F7FA] shadow-[0_4px_24px_rgba(171,190,209,0.35)] hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)]'
        }`}
      >
        {category.photo ? (
          <img src={category.photo} alt={category.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:-translate-y-1.5" />
        ) : (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
            <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
          </div>
        )}
        <span className="absolute bottom-3 left-3 text-[12px] font-semibold text-[#4CAF4F] bg-white/90 px-2.5 py-1 rounded-lg shadow-[0_2px_8px_rgba(171,190,209,0.4)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Aperçu
        </span>
      </Link>

      {/* Titre + liste verticale des produits + bouton */}
      <div className="w-[95%] mx-auto flex flex-col gap-3">
        <Link href={`/products/${category.id}`}>
          <h3 className="text-[15px] md:text-[16px] font-bold text-[#263238] leading-tight hover:text-[#4CAF4F] transition-colors truncate" title={category.name}>{category.name}</h3>
        </Link>

        {products.length === 0 ? (
          <p className="text-[13px] text-[#717171]">{t('common.no_products')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Liste verticale des produits */}
            <div className="flex flex-col gap-2">
              {products.map((product) => {
                const qty = quantities[product.id] || 0;
                const isSelected = qty > 0;
                return (
                  <div 
                    key={product.id} 
                    onClick={() => selectProduct(product.id)}
                    className={`flex items-center justify-between gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#4CAF4F] border-2 bg-[#F0FDF4]' 
                        : 'border-[#F0F4F8] bg-[#FAFCFF] hover:border-[#4CAF4F]/50'
                    }`}
                  >
                    {/* Info produit */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] md:text-[13px] font-semibold text-[#263238] truncate">
                        {product.width}/{product.length} mm
                      </p>
                      <p className="text-[11px] md:text-[12px] font-bold text-[#4CAF4F]">
                        {product.price.toFixed(2)} DA
                      </p>
                    </div>

                    {/* Contrôles quantité */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => updateQuantity(product.id, qty === 1 ? 0 : qty - 1)}
                        className="w-6 h-6 md:w-7 md:h-7 rounded-lg border border-[#ABBED1] flex items-center justify-center text-[#4D4D4D] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors text-[14px] leading-none"
                      >−</button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={qty}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          updateQuantity(product.id, Number.isFinite(v) && v >= 0 ? v : 0);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 md:w-12 px-1 py-1 rounded-lg border border-[#ABBED1] text-center text-[11px] md:text-[12px] font-semibold text-[#263238] focus:outline-none focus:border-[#4CAF4F] focus:ring-2 focus:ring-[#4CAF4F]/20 transition-all"
                      />
                      <button
                        onClick={() => updateQuantity(product.id, qty + 1)}
                        className="w-6 h-6 md:w-7 md:h-7 rounded-lg border border-[#ABBED1] flex items-center justify-center text-[#4D4D4D] hover:border-[#4CAF4F] hover:text-[#4CAF4F] transition-colors text-[14px] leading-none"
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <p className="text-[12px] text-red-600 font-medium text-center">{errorMessage}</p>
            )}

            {/* Bouton ajouter au panier */}
            <button
              onClick={addSelectedToCart}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#4CAF4F] px-4 py-2.5 text-white hover:bg-[#43A047] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 2.71v7.58M2.71 6.5h7.58" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span className="text-[13px] font-semibold">{t('common.add_to_cart')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
