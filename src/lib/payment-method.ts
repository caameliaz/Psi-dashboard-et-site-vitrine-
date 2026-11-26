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

// Numéro de facture : seul un numéro commençant par « F » (F004-2026…) est une vraie facture.
// « BL… » = bon de livraison, ou tout autre format → compte comme SANS facture.
export function aUneFacture(invoiceNumber: string | null | undefined): boolean {
  return /^f/i.test((invoiceNumber ?? '').trim());
}

// Mode de paiement à afficher/filtrer d'une demande : un numéro en « BL » (bon de livraison)
// vaut toujours « Espèces » ; sinon le mode enregistré, normalisé.
export function paiementDe(r: { paymentMethod?: string | null; invoiceNumber?: string | null }): string | null {
  if (/^bl/i.test((r.invoiceNumber ?? '').trim())) return 'Espèces';
  return canonPaiement(r.paymentMethod);
}
