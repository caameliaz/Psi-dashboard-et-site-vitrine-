import { prisma } from './prisma';

// ── "Commandes concernées" pour les listes d'achat / production ────────────
// Affiche, pour un produit (ou une matière, via sa recette), TOUTES les commandes/
// devis encore "en cours" (pas livré·e, annulé·e ni retourné·e) qui le concernent —
// qu'ils aient ou non techniquement déclenché la ligne affichée. Un stock bas est
// pertinent pour n'importe quelle commande pas encore livrée sur ce produit, même
// si elle a déjà été entièrement satisfaite depuis le stock disponible : elle reste
// "concernée" tant qu'elle n'est pas partie.

const LINKED_PARENT_SELECT = { ref: true, clientName: true, client: { select: { name: true, company: true } } } as const;
const NOT_TERMINAL_STATUSES = ['LIVRE', 'ANNULE', 'RETOURNE'] as const;
const NOT_TERMINAL = { notIn: [...NOT_TERMINAL_STATUSES] };

export type LinkedParent = { ref: string | null; clientName: string | null; client: { name: string; company: string | null } | null };
export type LinkedOrderItem = { quantity: number; order: LinkedParent };
export type LinkedQuoteItem = { quantity: number; quote: LinkedParent };

export async function openOrdersByProduct(productIds: string[]): Promise<Map<string, { orderItems: LinkedOrderItem[]; quoteItems: LinkedQuoteItem[] }>> {
  const map = new Map<string, { orderItems: LinkedOrderItem[]; quoteItems: LinkedQuoteItem[] }>();
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return map;
  for (const pid of ids) map.set(pid, { orderItems: [], quoteItems: [] });

  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productId: { in: ids }, order: { status: NOT_TERMINAL } },
      select: { productId: true, quantity: true, order: { select: LINKED_PARENT_SELECT } },
    }),
    prisma.quoteItem.findMany({
      where: { productId: { in: ids }, quote: { status: NOT_TERMINAL } },
      select: { productId: true, quantity: true, quote: { select: LINKED_PARENT_SELECT } },
    }),
  ]);

  for (const oi of orderItems) map.get(oi.productId!)?.orderItems.push({ quantity: oi.quantity, order: oi.order });
  for (const qi of quoteItems) map.get(qi.productId!)?.quoteItems.push({ quantity: qi.quantity, quote: qi.quote });
  return map;
}

// Pour une matière première : les produits qui l'utilisent (via la recette), pour pouvoir
// remonter jusqu'aux commandes/devis "en cours" de ces produits.
export async function productIdsUsingMaterial(rawMaterialIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const ids = [...new Set(rawMaterialIds)];
  if (ids.length === 0) return map;
  const recipes = await prisma.recipeItem.findMany({ where: { rawMaterialId: { in: ids } }, select: { rawMaterialId: true, productId: true } });
  for (const r of recipes) map.set(r.rawMaterialId, [...(map.get(r.rawMaterialId) ?? []), r.productId]);
  return map;
}
