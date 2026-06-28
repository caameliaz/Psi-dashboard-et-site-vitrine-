// Données mock PSI - Produits réels
// TODO: replace with GET /api/products (Fonctionnalité 2)
import type { Product, Category } from '@/types';

export const categories: Category[] = [
  { id: '1', name: 'Papier thermique', order: 0, createdAt: '2026-01-01' },
];

const cat = categories[0];

export const products: Product[] = [
  { id: '1', reference: '57/40',  width: 57,  length: 40, usage: 'Terminaux bancaires, TPE',          price: 450, photo: null, active: true, category: cat, categoryId: '1', customFields: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: '2', reference: '57/50',  width: 57,  length: 50, usage: 'Terminaux bancaires, caisses',       price: 550, photo: null, active: true, category: cat, categoryId: '1', customFields: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: '3', reference: '80/80',  width: 80,  length: 80, usage: 'Imprimantes thermiques, commerces',  price: 650, photo: null, active: true, category: cat, categoryId: '1', customFields: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: '4', reference: '80/70',  width: 80,  length: 70, usage: 'Restaurants, hôtels',               price: 600, photo: null, active: true, category: cat, categoryId: '1', customFields: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: '5', reference: '76/70',  width: 76,  length: 70, usage: 'Pharmacies, laboratoires',           price: 580, photo: null, active: true, category: cat, categoryId: '1', customFields: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: '6', reference: '112/50', width: 112, length: 50, usage: 'Banques, grandes surfaces',          price: 700, photo: null, active: true, category: cat, categoryId: '1', customFields: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];
