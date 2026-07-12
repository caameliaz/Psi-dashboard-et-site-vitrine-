// ─── ENUMS ───────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'EMPLOYEE';
export type RequestStatus = 'EN_ATTENTE' | 'CONTACTE' | 'VALIDE' | 'LIVRE' | 'ANNULE';
export type OrderSource = 'SITE' | 'WHATSAPP' | 'TELEPHONE' | 'AUTRE';
export type FieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN';
export type TemplateCategory = 'CONFIRMATION' | 'RELANCE' | 'LIVRAISON' | 'DEVIS' | 'AUTRE';
export type AuditEntity = 'COMMANDE' | 'DEVIS' | 'PRODUIT' | 'CLIENT' | 'UTILISATEUR' | 'CONTENU' | 'TEMPLATE' | 'STATUT';
export type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_PERSO' | 'ACTION_AUTRE' | 'ANNULATION';
export type ContactStatus = 'EN_ATTENTE' | 'TRAITE';

// Labels français pour affichage
export const STATUS_LABELS: Record<RequestStatus, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE:   'Contacté',
  VALIDE:     'Confirmé',
  LIVRE:      'Livré',
  ANNULE:     'Annulé',
};

export const SOURCE_LABELS: Record<OrderSource, string> = {
  SITE:       'Site web',
  WHATSAPP:   'WhatsApp',
  TELEPHONE:  'Téléphone',
  AUTRE:      'Autre',
};

// ─── CATÉGORIE ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

// ─── PRODUIT ─────────────────────────────────────────────────────────────────

export interface ProductFieldDef {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
}

export interface ProductCustomField {
  id: string;
  productId: string;
  definitionId: string;
  value: string;
  definition: ProductFieldDef;
}

export interface Product {
  id: string;
  reference: string;
  width: number;        // mm
  length: number;       // m
  usage: string;
  price: number;
  photo: string | null;
  active: boolean;
  category: Category;
  categoryId: string;
  customFields: ProductCustomField[];
  createdAt: string;
  updatedAt: string;
}

// ─── CLIENT ──────────────────────────────────────────────────────────────────

export interface ClientPhone {
  id: string;
  number: string;
  label: string;
  primary: boolean;
}

export interface ClientNote {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  wilaya: string;
  address: string | null;
  photo: string | null;
  phones: ClientPhone[];
  notes: ClientNote[];
  contacts?: ContactRequest[];
  createdAt: string;
  updatedAt: string;
  // Agrégats calculés (non stockés, retournés par l'API)
  _count?: {
    orders: number;
    quotes: number;
  };
}

// ─── COMMANDE ────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  product: Product;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  ref: string | null;
  client: Client | null;
  clientId: string | null;
  clientName: string | null;
  clientCompany: string | null;
  clientWilaya: string | null;
  items: OrderItem[];
  status: RequestStatus;
  source: OrderSource | 'ADMIN';
  cancelReason: string | null;
  notes: string | null;
  createdBy: { id: string; name: string } | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── DEVIS ───────────────────────────────────────────────────────────────────

export interface QuoteItem {
  id: string;
  product: Product | null;
  productId: string | null;
  description: string | null;
  width: number | null;
  length: number | null;
  quantity: number;
}

export interface Quote {
  id: string;
  ref: string | null;
  client: Client | null;
  clientId: string | null;
  clientName: string | null;
  clientCompany: string | null;
  clientWilaya: string | null;
  items: QuoteItem[];
  message: string;
  status: RequestStatus;
  source: OrderSource | 'ADMIN';
  cancelReason: string | null;
  proposedPrice: number | null;
  deliveryDelay: string | null;
  paymentTerms: string | null;
  adminRemarks: string | null;
  notes: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────

export interface ContactRequest {
  id: string;
  client: Client;
  clientId: string;
  message: string;
  status: ContactStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── STATUTS PERSONNALISÉS ───────────────────────────────────────────────────

export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
}

// ─── TEMPLATES MESSAGES ──────────────────────────────────────────────────────

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: TemplateCategory;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ─── UTILISATEUR ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  phone: string | null;
  photo: string | null;
  createdAt: string;
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  orderId: string | null;
  quoteId: string | null;
  read: boolean;          // calculé depuis NotificationRead pour l'utilisateur courant
  createdAt: string;
}

// ─── AUDIT LOG ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  user: { id: string; name: string; role: Role };
  action: string;
  entity: AuditEntity;
  entityId: string | null;
  detail: string | null;
  orderId: string | null;
  quoteId: string | null;
  createdAt: string;
}

// ─── CONTENU SITE ────────────────────────────────────────────────────────────

export interface SiteContent {
  key: string;
  value: string;
}
