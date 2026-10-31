import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';

// ── Alertes « stock faible / rupture » pour les ADMINS ───────────────────────────────────────────
// Un produit fini ou une matière première change de niveau : OK → LOW (sous son seuil) → OUT (à 0). On notifie les
// admins (dans l'app + push) UNIQUEMENT quand le niveau EMPIRE, une seule fois par passage ; quand le stock remonte,
// l'état est simplement réarmé en silence. Le niveau suit exactement le badge de la page Stock (Disponible seulement).
//
// Premier passage sur une référence : on enregistre son niveau actuel SANS notifier — sinon les références jamais
// approvisionnées (à 0 depuis toujours) déclencheraient une rafale d'alertes. Seule une référence dont le niveau se
// dégrade ENSUITE alerte. L'état est tenu dans StockAlertState (verrou atomique : deux appels simultanés = une alerte).
type Level = 'OK' | 'LOW' | 'OUT';
const RANK: Record<Level, number> = { OK: 0, LOW: 1, OUT: 2 };

function levelOf(available: number, threshold: number): Level {
  if (available <= 0) return 'OUT';
  if (threshold > 0 && available <= threshold) return 'LOW';
  return 'OK';
}

type Item = { kind: 'PRODUCT' | 'MATERIAL'; id: string; label: string; unit: string; available: number; threshold: number };

// À appeler après toute action qui change un stock (lecture seule de l'état + écriture de l'état d'alerte).
// Ne lève JAMAIS : une alerte ratée ne doit pas faire échouer l'action de stock qui l'a déclenchée.
// `deps` : base et envoi de notification, injectables pour les tests (par défaut : les vrais).
export async function scanLowStock(deps: { db: typeof prisma; notify: typeof createNotif } = { db: prisma, notify: createNotif }): Promise<void> {
  const { db, notify } = deps;
  try {
    const [products, materials, states] = await Promise.all([
      db.product.findMany({ where: { active: true }, select: { id: true, reference: true, name: true, mode: true, available: true, purchaseThreshold: true, productionThreshold: true } }),
      db.rawMaterial.findMany({ select: { id: true, reference: true, name: true, unit: true, available: true, purchaseThreshold: true } }),
      db.stockAlertState.findMany(),
    ]);
    const known = new Map(states.map((s) => [`${s.kind}:${s.refKey}`, s.level as Level]));

    const items: Item[] = [
      ...products.map((p): Item => ({ kind: 'PRODUCT', id: p.id, label: p.name || p.reference, unit: '', available: p.available, threshold: p.mode === 'ACHETE' ? p.purchaseThreshold : p.productionThreshold })),
      ...materials.map((m): Item => ({ kind: 'MATERIAL', id: m.id, label: m.name || m.reference, unit: ` ${m.unit}`, available: m.available, threshold: m.purchaseThreshold })),
    ];

    for (const it of items) {
      const level = levelOf(it.available, it.threshold);
      const prev = known.get(`${it.kind}:${it.id}`);
      if (prev === undefined) {
        // Première fois qu'on voit cette référence : on mémorise son niveau, sans alerte
        await db.stockAlertState.create({ data: { kind: it.kind, refKey: it.id, level } }).catch(() => {});
        continue;
      }
      if (prev === level) continue;
      // Verrou : un seul appel « gagne » le changement de niveau (évite une double notification)
      const claimed = await db.stockAlertState.updateMany({ where: { kind: it.kind, refKey: it.id, level: prev }, data: { level } });
      if (claimed.count !== 1 || RANK[level] <= RANK[prev]) continue;

      const out = level === 'OUT';
      await notify({
        type: 'ACTION_AUTRE',
        title: out ? 'Rupture de stock' : 'Stock faible',
        message: out
          ? `${it.label} : plus de stock (seuil ${it.threshold}${it.unit}).`
          : `${it.label} : ${it.available}${it.unit} en stock, sous le seuil de ${it.threshold}${it.unit}.`,
        adminOnly: true,
        link: '/admin/stock',
      }).catch(() => {});
    }
  } catch (e) {
    // Table pas encore créée (migration non appliquée) : on ignore sans bruit ; sinon on journalise
    if ((e as { code?: string } | null)?.code !== 'P2021') console.error('[low-stock]', e);
  }
}
