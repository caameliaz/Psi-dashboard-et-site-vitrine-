import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

// POST /api/ventes/import — importe des ventes passées depuis un Excel.
//
// Body : { rows: [{ date, facture, client, commercial, wilaya, reference,
//                   quantite, prixUnitaire, montant, modePaiement, dateReglement }] }
//
// Règles métier (validées avec l'utilisatrice) :
//  • la DATE de l'Excel devient la date de création (surtout pas aujourd'hui)
//  • référence PRÉSENTE au catalogue  → Commande (statut Livré)
//    référence ABSENTE                → Devis (statut Livré, référence libre)
//  • N° facture commençant par "F"    → TVA activée (info seule, aucun calcul)
//  • plusieurs lignes même N° facture → UNE demande avec plusieurs produits
//  • le client est créé s'il n'existe pas
//  • le commercial est mémorisé par son NOM (rattachement aux comptes plus tard)

interface Ligne {
  date?: string;
  facture?: string;
  client?: string;
  commercial?: string;
  wilaya?: string;
  reference?: string;
  quantite?: string | number;
  prixUnitaire?: string | number;
  montant?: string | number;
  modePaiement?: string;
  dateReglement?: string;
}

/** "12/07/2026", "2026-07-12", ou un nombre de série Excel → Date. */
function parseDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  // Nombre de série Excel (jours depuis le 30/12/1899)
  if (typeof v === 'number' || /^\d+([.,]\d+)?$/.test(String(v).trim())) {
    const n = Number(String(v).replace(',', '.'));
    if (n > 20000 && n < 80000) return new Date(Math.round((n - 25569) * 86400 * 1000));
  }
  const s = String(v).trim();
  const fr = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/); // JJ/MM/AAAA
  if (fr) {
    const [, j, m, a] = fr;
    const an = a.length === 2 ? 2000 + Number(a) : Number(a);
    const d = new Date(an, Number(m) - 1, Number(j));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_statuts');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const { rows } = (await request.json()) as { rows: Ligne[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne à importer' }, { status: 400 });
    }

    // Catalogue : sert à décider commande vs devis, et à retrouver la catégorie
    const produits = await prisma.product.findMany({ select: { id: true, reference: true } });
    const parRef = new Map(produits.map((p) => [p.reference.trim().toLowerCase(), p.id]));

    // ── Regroupement : même N° facture = une seule demande à plusieurs produits ──
    const groupes = new Map<string, Ligne[]>();
    rows.forEach((r, i) => {
      const cle = String(r.facture ?? '').trim() || `__ligne_${i}`; // sans n° → ligne isolée
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle)!.push(r);
    });

    let commandes = 0;
    let devis = 0;
    let clientsCrees = 0;
    const erreurs: string[] = [];

    for (const [cle, lignes] of groupes) {
      const premiere = lignes[0];
      const nomClient = String(premiere.client ?? '').trim();
      if (!nomClient) { erreurs.push(`${cle} : client manquant`); continue; }

      const dateVente = parseDate(premiere.date);
      if (!dateVente) { erreurs.push(`${cle} : date invalide (${premiere.date ?? 'vide'})`); continue; }

      // ── Client : recherché par entreprise OU nom, créé si absent ──
      let client = await prisma.client.findFirst({
        where: {
          OR: [
            { company: { equals: nomClient, mode: 'insensitive' } },
            { name: { equals: nomClient, mode: 'insensitive' } },
          ],
        },
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            name: nomClient,
            company: nomClient,
            wilaya: String(premiere.wilaya ?? '').trim() || 'Non spécifié',
          },
        });
        clientsCrees++;
      }

      const facture = String(premiere.facture ?? '').trim();
      // N° de facture commençant par F → vente facturée avec TVA
      const tva = /^f/i.test(facture);
      const commercial = String(premiere.commercial ?? '').trim() || null;
      const modePaiement = String(premiere.modePaiement ?? '').trim() || null;
      const dateReglement = parseDate(premiere.dateReglement);

      // Une demande est une COMMANDE si TOUTES ses références sont au catalogue
      const items = lignes.map((l) => {
        const ref = String(l.reference ?? '').trim();
        return {
          ref,
          productId: parRef.get(ref.toLowerCase()) ?? null,
          quantity: Math.max(1, Math.round(toNumber(l.quantite) || 1)),
          unitPrice: toNumber(l.prixUnitaire),
        };
      });
      const estCommande = items.length > 0 && items.every((i) => i.productId !== null);

      const communs = {
        clientId: client.id,
        clientName: client.name,
        clientCompany: client.company,
        clientWilaya: client.wilaya,
        status: 'LIVRE' as const,
        source: 'AUTRE' as const,
        invoiceNumber: facture || null,
        paymentMethod: modePaiement,
        paymentDate: dateReglement,
        vatEnabled: tva,
        salesRepName: commercial,
        createdById: session.user.id,
        // ⚠️ Date RÉELLE de la vente, pas la date d'import
        createdAt: dateVente,
      };

      if (estCommande) {
        await prisma.order.create({
          data: {
            ...communs,
            items: {
              create: items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
              })),
            },
          },
        });
        commandes++;
      } else {
        await prisma.quote.create({
          data: {
            ...communs,
            message: '',
            // Montant total de la vente (le prix d'un devis est global)
            proposedPrice: lignes.reduce(
              (acc, l) => acc + (toNumber(l.montant) || toNumber(l.prixUnitaire) * (toNumber(l.quantite) || 1)),
              0,
            ),
            items: {
              create: items.map((i) => ({
                productId: i.productId,
                description: i.productId ? null : i.ref,
                quantity: i.quantity,
              })),
            },
          },
        });
        devis++;
      }
    }

    createAudit({
      userId: session.user.id,
      action: 'Import ventes Excel',
      entity: 'COMMANDE',
      detail: `${commandes} commande(s), ${devis} devis, ${clientsCrees} client(s) créé(s)`,
    });

    return NextResponse.json({
      total: groupes.size,
      commandes,
      devis,
      clientsCrees,
      erreurs: erreurs.slice(0, 30),
    });
  } catch (e: unknown) {
    console.error('[POST /api/ventes/import]', e);
    return NextResponse.json({ error: "Échec de l'import" }, { status: 500 });
  }
}
