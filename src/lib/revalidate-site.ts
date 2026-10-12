import { revalidatePath } from 'next/cache';

// Après une modification faite au dashboard (catégorie, produit…), invalide les pages publiques
// rendues côté serveur (accueil, fiches produit) pour que le changement apparaisse sans attendre
// un redéploiement. Sans ça, l'accueil reste figé sur ce qu'il affichait au dernier build.
export function revalidatePublicSite() {
  try {
    revalidatePath('/');
    revalidatePath('/products/[id]', 'page');
  } catch {
    // hors contexte Next (script, test) : sans effet
  }
}
