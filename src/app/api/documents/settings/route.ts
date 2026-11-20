import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { guardDocs, isKind } from '@/lib/documents/guard';
import { mergeSettings, mergeTemplate } from '@/lib/documents/calc';
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from '@/lib/documents/defaults';
import { getAllTemplates, getSettings } from '@/lib/documents/service';
import { getLastNumber, setLastNumber } from '@/lib/documents/numbering';
import type { DocumentKind } from '@/lib/documents/types';

// GET /api/documents/settings — réglages + modèles (tout utilisateur qui voit les commandes, pour les fenêtres de création).
// Les admins reçoivent en plus les compteurs, les désignations par catégorie et les valeurs d'origine.
export async function GET() {
  const guard = await guardDocs('BL');
  if (guard.error) return guard.error;
  try {
    const [settings, templates] = await Promise.all([getSettings(), getAllTemplates()]);
    if (!guard.user!.isAdmin) return NextResponse.json({ settings: { vatRate: settings.vatRate, defaultPaymentMethod: settings.defaultPaymentMethod }, templates: { BL: templates.BL } });
    const year = new Date().getFullYear();
    const kinds: DocumentKind[] = ['BL', 'FACTURE', 'PROFORMA'];
    const counters = Object.fromEntries(await Promise.all(kinds.map(async (k) => [k, await getLastNumber(k, year)]))) as Record<DocumentKind, number>;
    const categories = await prisma.category.findMany({ select: { id: true, name: true, documentDesignation: true }, orderBy: { name: 'asc' } });
    return NextResponse.json({ settings, templates, counters, year, categories, defaults: { settings: DEFAULT_SETTINGS, templates: DEFAULT_TEMPLATES } });
  } catch (e) {
    console.error('[documents/settings GET]', e);
    return NextResponse.json({ error: 'Impossible de charger les réglages' }, { status: 500 });
  }
}

// PUT /api/documents/settings — ADMIN. Body (tout est facultatif) :
//   { settings, template: {type, config}, resetTemplate: type, counter: {type, year, lastNumber}, designations: [{categoryId, value}] }
export async function PUT(request: NextRequest) {
  const guard = await guardDocs('ADMIN');
  if (guard.error) return guard.error;
  const userId = guard.user!.id;
  try {
    const body = await request.json();
    const done: string[] = [];

    if (body.settings) {
      const s = mergeSettings(body.settings);
      if (!(s.vatRate >= 0 && s.vatRate <= 100)) return NextResponse.json({ error: 'Taux de TVA invalide' }, { status: 400 });
      const tiers = s.stampDuty.tiers.map((t) => ({ from: Number(t.from) || 0, to: t.to === null || t.to === undefined || (t.to as unknown) === '' ? null : Number(t.to), rate: Number(t.rate) || 0 }));
      const data = { ...s, vatRate: Number(s.vatRate), stampDuty: { tiers, minimum: Number(s.stampDuty.minimum) || 0 } };
      await prisma.documentSettings.upsert({ where: { id: 'default' }, create: { id: 'default', data: data as unknown as Prisma.InputJsonValue, updatedById: userId }, update: { data: data as unknown as Prisma.InputJsonValue, updatedById: userId } });
      done.push('infos PSI / TVA / timbre / formats');
    }
    if (body.template && isKind(body.template.type)) {
      const type = body.template.type as DocumentKind;
      const config = mergeTemplate(type, body.template.config);
      await prisma.documentTemplate.upsert({ where: { type }, create: { type, config: config as unknown as Prisma.InputJsonValue, updatedById: userId }, update: { config: config as unknown as Prisma.InputJsonValue, updatedById: userId } });
      done.push(`modèle ${type}`);
    }
    if (isKind(body.resetTemplate)) {
      await prisma.documentTemplate.deleteMany({ where: { type: body.resetTemplate } });
      done.push(`modèle ${body.resetTemplate} remis d'origine`);
    }
    if (body.counter && isKind(body.counter.type)) {
      const year = Number(body.counter.year) || new Date().getFullYear();
      const n = Number(body.counter.lastNumber);
      if (!Number.isInteger(n) || n < 0) return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
      await setLastNumber(body.counter.type, year, n);
      done.push(`compteur ${body.counter.type} ${year} = ${n}`);
    }
    if (Array.isArray(body.designations)) {
      for (const d of body.designations) {
        if (typeof d?.categoryId !== 'string') continue;
        const value = typeof d.value === 'string' && d.value.trim() ? d.value.trim() : null;
        await prisma.category.update({ where: { id: d.categoryId }, data: { documentDesignation: value } });
      }
      done.push('désignations par catégorie');
    }
    if (done.length) createAudit({ userId, action: 'Réglages documents modifiés', entity: 'DOCUMENT', detail: done.join(' · ') });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[documents/settings PUT]', e);
    return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }
}
