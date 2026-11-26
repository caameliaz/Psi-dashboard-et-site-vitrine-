import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { revalidatePublicSite } from '@/lib/revalidate-site';
import { loadStore, saveTranslation } from '@/lib/i18n/translations';
import { isTrLang, type TrKind } from '@/lib/i18n/translations-shared';

const KINDS: TrKind[] = ['category', 'product', 'fielddef'];

// Accessible à qui gère les produits OU le contenu du site (les usages d'une catégorie se traduisent depuis « Contenu »)
async function guardTranslations() {
  const g = await requirePermission('modifier_produits');
  if (!g.error) return g;
  const alt = await requirePermission('modifier_contenu');
  return alt.error ? g : alt;
}

// GET /api/translations — toutes les traductions du catalogue (formulaires admin : produits, contenu)
export async function GET() {
  const guard = await guardTranslations();
  if (guard.error) return guard.error;
  return NextResponse.json(await loadStore());
}

// PUT /api/translations — enregistre la traduction d'UN élément dans UNE langue.
// Body : { kind: 'category' | 'product' | 'fielddef', id, lang: 'en' | 'ar', data }  (data vide = traduction supprimée)
export async function PUT(request: NextRequest) {
  const guard = await guardTranslations();
  if (guard.error) return guard.error;
  try {
    const body = await request.json();
    if (!KINDS.includes(body.kind) || typeof body.id !== 'string' || !body.id || !isTrLang(body.lang)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    await saveTranslation(body.kind, body.id, body.lang, body.data);
    revalidatePublicSite();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save translation' }, { status: 500 });
  }
}
