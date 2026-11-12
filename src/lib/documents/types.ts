// Types des modèles de documents (BL / facture / proforma) — cf. TODO-FACTURES-BL.md §5.1.
// La MISE EN PAGE est fixe (fidèle aux PDF de PSI) ; le modèle décide de ce qui est affiché et des textes.
import type { StampDutyConfig } from './stamp-duty';

export type DocumentKind = 'BL' | 'FACTURE' | 'PROFORMA';

export interface TemplateField {
  id: string; // identifiant technique (ex. 'rc', 'nif') ou 'custom_xxx' pour un champ ajouté
  label: string; // libellé imprimé (ex. « RC: »)
  enabled: boolean;
  custom?: boolean; // champ ajouté par un admin
  defaultValue?: string; // valeur proposée pour un champ ajouté
}

export interface TemplateColumn {
  id: string; // 'ref' | 'designation' | 'laize' | 'metrage' | 'quantity' | 'unitPrice' | 'amount' | 'observation' | 'custom_xxx'
  label: string;
  enabled: boolean;
  custom?: boolean;
}

export interface DocumentTemplateConfig {
  title: string; // « BON DE LIVRAISON », « FACTURE », « FACTURE PROFORMA »
  showLogo: boolean;
  showQr: boolean; // QR « Valider la réception » (BL) — décochable aussi à chaque impression
  headerFields: TemplateField[]; // bloc à droite du titre : N°, date, échéance, mode de règlement…
  partyA: { enabled: boolean; title: string; fields: TemplateField[] }; // Fournisseur / Entreprise
  partyB: { enabled: boolean; title: string; fields: TemplateField[] }; // Client
  orderLine: { enabled: boolean; label: string }; // « Commande du jj/mm/aaaa »
  columns: TemplateColumn[];
  totals: { enabled: boolean; labelHt: string; labelVat: string; labelTtc: string; labelStamp: string };
  amountInWords: { enabled: boolean; label: string }; // facture / proforma
  deliveryInfo: { enabled: boolean; dateLabel: string; placeLabel: string }; // BL
  signatures: { enabled: boolean; leftLabel: string; rightLabel: string }; // BL
  notes: { enabled: boolean; text: string }; // conditions / mentions libres
  footer: { enabled: boolean; lines: string[] }; // pied de page (mentions légales), modifiable par les admins
  customFields: TemplateField[]; // champs ajoutés (apparaissent sous le tableau)
}

export interface PsiInfo {
  name: string;
  addressHeader: string;
  city: string;
  addressFooter: string;
  phone: string;
  rc: string;
  nif: string;
  nis: string;
  rib: string;
}

export interface DocumentSettingsData {
  psi: PsiInfo;
  vatRate: number; // 19
  defaultPaymentMethod: string; // « Virement/Chèque »
  stampDuty: StampDutyConfig; // paliers du timbre (paiement en espèces)
  numberFormats: Record<DocumentKind, string>; // ex. « F {seq:3}/{year} »
  defaultDesignation: string; // texte par défaut si ni le produit ni sa catégorie n'en ont
}
