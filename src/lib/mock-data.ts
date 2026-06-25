// Données mock PSI - Produits réels
// TODO: replace with API call

export interface Product {
  id: string;
  reference: string;
  width: number;
  length: number;
  usage: string;
  price: number;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
}

export const categories: Category[] = [
  { id: '1', name: 'Papier thermique' },
];

export const products: Product[] = [
  {
    id: '1',
    reference: '57/40',
    width: 57,
    length: 40,
    usage: 'Terminaux bancaires, TPE',
    price: 450,
    categoryId: '1',
  },
  {
    id: '2',
    reference: '57/50',
    width: 57,
    length: 50,
    usage: 'Terminaux bancaires, caisses',
    price: 550,
    categoryId: '1',
  },
  {
    id: '3',
    reference: '80/80',
    width: 80,
    length: 80,
    usage: 'Imprimantes thermiques, commerces',
    price: 650,
    categoryId: '1',
  },
  {
    id: '4',
    reference: '80/70',
    width: 80,
    length: 70,
    usage: 'Restaurants, hôtels',
    price: 600,
    categoryId: '1',
  },
  {
    id: '5',
    reference: '76/70',
    width: 76,
    length: 70,
    usage: 'Pharmacies, laboratoires',
    price: 580,
    categoryId: '1',
  },
  {
    id: '6',
    reference: '112/50',
    width: 112,
    length: 50,
    usage: 'Banques, grandes surfaces',
    price: 700,
    categoryId: '1',
  },
];
