// Modes de paiement proposés à la validation d'une commande / d'un devis
export const PAYMENT_METHODS = ['Espèces', 'Chèque', 'Virement', 'Versement', 'À crédit', 'Dépensé', 'Offert'];

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const PAR_CLE = new Map(PAYMENT_METHODS.map((m) => [sansAccent(m), m]));

// Les ventes importées ont « Especes », « Cheque », « offert », « dépensé »… (sans accent / minuscules) :
// on les ramène au libellé officiel pour que filtre, colonne et Excel les traitent pareil.
// Valeur non reconnue (ex. un montant collé par erreur dans la colonne) → null = « non renseigné ».
export function canonPaiement(v: string | null | undefined): string | null {
  if (!v) return null;
  return PAR_CLE.get(sansAccent(v)) ?? null;
}
