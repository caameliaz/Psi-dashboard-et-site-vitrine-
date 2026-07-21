import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';

// POST /api/clients/import — import en masse depuis un Excel (permission modifier_clients)
// Body : { rows: [{ code?, client, categorie?, commune?, telephone?, commercial?, wilaya?, email?, entreprise? }, ...] }
// - "categorie" → secteur d'activité (créé s'il n'existe pas)
// - "code" + "commercial" → conservés dans une note interne (pas de champ dédié)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) return NextResponse.json({ error: 'Aucune ligne à importer' }, { status: 400 });

    // ─── Résout / crée les secteurs (colonne Catégorie) ───
    const sectorNames = [...new Set(rows.map((r) => String(r.categorie ?? '').trim()).filter(Boolean))];
    const sectorMap = new Map<string, string>(); // nom (lower) → id
    if (sectorNames.length) {
      const existing = await prisma.sector.findMany();
      existing.forEach((s) => sectorMap.set(s.name.toLowerCase(), s.id));
      let order = existing.length;
      for (const name of sectorNames) {
        if (!sectorMap.has(name.toLowerCase())) {
          const created = await prisma.sector.create({ data: { name, order: order++ } });
          sectorMap.set(name.toLowerCase(), created.id);
        }
      }
    }

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const nom = String(r.client ?? '').trim();
      if (!nom) { errors.push(`Ligne ${i + 1} : nom du client manquant`); continue; }

      const categorie = String(r.categorie ?? '').trim();
      const sectorId = categorie ? sectorMap.get(categorie.toLowerCase()) ?? null : null;
      const phone = String(r.telephone ?? '').trim();

      // Note interne pour ne rien perdre (code client + commercial)
      const noteParts: string[] = [];
      if (r.code) noteParts.push(`Code client : ${String(r.code).trim()}`);
      if (r.commercial) noteParts.push(`Commercial : ${String(r.commercial).trim()}`);
      const noteContent = noteParts.join(' · ');

      try {
        await prisma.client.create({
          data: {
            name: nom,
            company: r.entreprise ? String(r.entreprise).trim() : null,
            email: r.email ? String(r.email).trim() : null,
            wilaya: r.wilaya ? String(r.wilaya).trim() : 'Non spécifié',
            commune: r.commune ? String(r.commune).trim() : null,
            sectorId,
            ...(phone ? { phones: { create: [{ number: phone, label: 'Principal', primary: true }] } } : {}),
            ...(noteContent ? { notes: { create: [{ content: noteContent, authorId: session.user.id! }] } } : {}),
          },
        });
        created++;
      } catch (e) {
        console.error(`Import ligne ${i + 1}`, e);
        errors.push(`Ligne ${i + 1} (${nom}) : échec`);
      }
    }

    createAudit({ userId: session.user.id, action: 'Import clients', entity: 'CLIENT', entityId: 'import', detail: `${created} client(s) importé(s)` });
    return NextResponse.json({ success: true, created, total: rows.length, errors });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Échec de l\'import' }, { status: 500 });
  }
}
