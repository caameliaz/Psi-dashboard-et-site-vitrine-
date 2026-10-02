import { create } from 'zustand';
import { reportCartChange } from '@/lib/cart-tracking';

export interface CartItem {
  productId: string;
  quantity: number;
  reference: string;
  unitPrice: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

// Suivi anonyme (cf. src/lib/cart-tracking.ts) : notifié après chaque changement de
// contenu, avec le nouvel état complet — pas besoin de savoir CE QUI a changé.
const notifyTracking = (items: CartItem[]) => {
  const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  reportCartChange(itemsCount, totalAmount);
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      const items = existing
        ? state.items.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...state.items, item];
      notifyTracking(items);
      return { items };
    }),

  removeItem: (productId) =>
    set((state) => {
      const items = state.items.filter((i) => i.productId !== productId);
      notifyTracking(items);
      return { items };
    }),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      const items = state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
      notifyTracking(items);
      return { items };
    }),

  // Ne notifie PAS le suivi ici : un panier vidé par une commande/devis validé est
  // marqué "converti" via reportCartConverted() (checkout/quote), pas "vide" — sinon
  // la conversion arriverait juste après un "itemsCount: 0" qui aurait déjà supprimé
  // la ligne (cf. /api/cart-tracking POST).
  clearCart: () => set({ items: [] }),

  getTotalItems: () => {
    const state = get();
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getTotalPrice: () => {
    const state = get();
    return state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  },
}));
