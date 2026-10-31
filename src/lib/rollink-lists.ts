import { prisma } from '@/lib/prisma';

// Listes d'achat / production et RollLink (encore en phase de test) : par défaut, les besoins qui viennent de
// commandes RollLink n'apparaissent PAS dans les listes (même règle que l'interrupteur « RollLink » de la page
// Stock). Avec `?rollink=1` (interrupteur activé) ils sont montrés. Affichage seulement : rien n'est modifié en base.
type Linked = { quantity: number; order?: { ref: string | null } | null };
type ListLine = {
  neededQuantity: number; bufferQuantity: number; manualQuantity: number;
  orderItems: Linked[]; quoteItems: unknown[];
};

export async function withoutRollink<T extends ListLine>(items: T[]): Promise<T[]> {
  const refs = new Set((await prisma.order.findMany({ where: { source: 'ROLLINK' }, select: { ref: true } })).map((o) => o.ref));
  return items.flatMap((line) => {
    const rollink = line.orderItems.filter((o) => o.order?.ref && refs.has(o.order.ref));
    if (rollink.length === 0) return [line];
    const rest = line.orderItems.filter((o) => !rollink.includes(o));
    const needed = Math.max(0, line.neededQuantity - rollink.reduce((n, o) => n + o.quantity, 0));
    // La ligne disparaît si RollLink était sa SEULE raison d'exister (plus de besoin, de rattrapage, d'ajout manuel ni de commande)
    const gardee = needed > 0 || line.bufferQuantity > 0 || line.manualQuantity > 0 || rest.length > 0 || line.quoteItems.length > 0;
    return gardee ? [{ ...line, neededQuantity: needed, orderItems: rest }] : [];
  });
}
