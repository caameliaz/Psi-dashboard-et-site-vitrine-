import { prisma } from './prisma';

// Prochain numéro disponible pour un préfixe donné (ex: "CMD26-"), déduit du
// MAX des refs existantes portant ce préfixe — pas d'un COUNT global, qui se
// désynchronise dès qu'une ref est absente (import) ou qu'une autre année
// existe (cf. TODO.md §4 — bug historique à l'origine des refs CMD-No-0001).
async function nextNumberForPrefix(
  findMany: (args: { where: { ref: { startsWith: string } }; select: { ref: true } }) => Promise<{ ref: string | null }[]>,
  prefix: string,
): Promise<number> {
  const rows = await findMany({ where: { ref: { startsWith: prefix } }, select: { ref: true } });
  let max = 0;
  for (const r of rows) {
    const m = r.ref?.match(/-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// Format CMD{AA}-{séquence} ex: CMD26-001, CMD26-002… — séquence par année (repart à 1
// chaque nouvelle année), remplace l'ancien format par wilaya (CMD-{wilaya}-{séquence}).
// `wilaya` n'est plus utilisé dans la référence mais le paramètre est gardé pour ne pas
// casser les appelants existants.
export async function generateOrderRef(_wilaya?: string | null): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `CMD${yy}-`;

  // Retry jusqu'à 5 fois pour éviter les collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const num = (await nextNumberForPrefix((a) => prisma.order.findMany(a), prefix)) + attempt;
    const ref = `${prefix}${String(num).padStart(3, '0')}`;

    // Vérifier si la référence existe déjà
    const exists = await prisma.order.findUnique({ where: { ref } });
    if (!exists) return ref;
  }

  // Fallback : utiliser un timestamp si toutes les tentatives échouent
  const timestamp = Date.now().toString().slice(-3);
  return `${prefix}${timestamp}`;
}

// Format DEV{AA}-{séquence} ex: DEV26-001, DEV26-002…
export async function generateQuoteRef(_wilaya?: string | null): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `DEV${yy}-`;

  // Retry jusqu'à 5 fois pour éviter les collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const num = (await nextNumberForPrefix((a) => prisma.quote.findMany(a), prefix)) + attempt;
    const ref = `${prefix}${String(num).padStart(3, '0')}`;

    // Vérifier si la référence existe déjà
    const exists = await prisma.quote.findUnique({ where: { ref } });
    if (!exists) return ref;
  }

  // Fallback : utiliser un timestamp si toutes les tentatives échouent
  const timestamp = Date.now().toString().slice(-3);
  return `${prefix}${timestamp}`;
}
