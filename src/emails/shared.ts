import path from 'path';
import fs from 'fs';

// Bouts HTML/données partagés entre dailyRecapTemplate et weeklyRecapTemplate :
// l'en-tête (titre à gauche + bouton "Ouvrir l'admin" à droite), les deux
// cartes Commandes/Devis (empilées, répartition par statut à l'intérieur de
// chacune, à droite du total), le tableau détaillé (même design que le
// dashboard, toujours visible), et la coquille (shell) commune à l'email
// (fond blanc, logo en bas).

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface RecapItem {
  ref: string;
  type: 'Commande' | 'Devis';
  client: string;
  statut: string;
  montant: string;
}

export interface StatusBreakdownRow {
  statut: string;
  count: number;
}

export interface RecapCardData {
  total: number;
  breakdown: StatusBreakdownRow[];
}

// ── Logo : embarqué en pièce jointe "inline" (Content-ID), pas d'URL publique
// nécessaire — fonctionne même sans nom de domaine.
export const LOGO_CID = 'psi-logo';

// ⚠️ Sur Vercel (serverless), les fichiers de `public/` ne sont PAS lisibles via
// process.cwd() : ils sont servis par le CDN, pas présents sur le disque de la
// fonction. Nodemailer échouait donc à joindre le logo → AUCUN email envoyé.
// On lit le fichier une fois au démarrage ; s'il est introuvable, on envoie
// l'email SANS logo plutôt que de tout faire échouer.
function readLogo(): Buffer | null {
  const candidats = [
    path.join(process.cwd(), 'public', 'Logo PSI-new.jpeg'),
    path.join(process.cwd(), '.next', 'server', 'public', 'Logo PSI-new.jpeg'),
  ];
  for (const c of candidats) {
    try { return fs.readFileSync(/*turbopackIgnore: true*/ c); } catch { /* essaie le suivant */ }
  }
  return null;
}

const logoBuffer = readLogo();

/** Pièce jointe du logo — tableau vide si le fichier est introuvable (Vercel). */
export const logoAttachments = logoBuffer
  ? [{ filename: 'logo-psi.jpeg', content: logoBuffer, cid: LOGO_CID }]
  : [];

/** Compat : ancien export utilisé dans `attachments: [logoAttachment]`. */
export const logoAttachment: { filename: string; content?: Buffer; path?: string; cid: string } =
  logoAttachments[0] ?? { filename: 'logo-psi.jpeg', content: Buffer.alloc(0), cid: LOGO_CID };

// Couleur par statut, réutilisée pour les pastilles de la répartition.
export const STATUS_COLOR: Record<string, string> = {
  'En attente': '#F59E0B', // jaune
  'Confirmé': '#3B82F6',   // bleu
  'Livré': '#22C55E',      // vert
  'Annulé': '#EF4444',     // rouge
};

// Style commun aux cartes/répartition : blanc, bordure grise claire, coins
// arrondis, légère ombre portée pour le relief.
const CONTAINER_STYLE = 'background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,0.06)';
const SECTION_GAP = 20; // px — espace entre chaque bloc pour qu'ils ne se touchent pas

// Espacement entre sections via un <div> (padding), pas via margin sur un
// <table> — Gmail retire souvent le margin des balises <table>, ce qui
// collait les blocs les uns aux autres.
function section(html: string): string {
  return `<div style="padding-bottom:${SECTION_GAP}px">${html}</div>`;
}

/** En-tête : titre + sous-titre à gauche, bouton "Ouvrir l'admin" en haut à droite. */
export function renderHeader(title: string, subtitle: string, adminUrl: string): string {
  return section(`
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="vertical-align:middle;text-align:left">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">${title}</p>
        <p style="margin:0;font-size:12px;color:#8A9BB5">${subtitle}</p>
      </td>
      <td style="vertical-align:middle;text-align:right;width:1%">
        <a href="${adminUrl}" style="display:inline-block;background:#4CAF4F;color:#fff;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap">Ouvrir l'admin →</a>
      </td>
    </tr>
  </table>`);
}

function renderBreakdown(breakdown: StatusBreakdownRow[]): string {
  if (breakdown.length === 0) return '';
  const rows = breakdown.map((b) => {
    const color = STATUS_COLOR[b.statut] ?? '#8A9BB5';
    return `
    <tr>
      <td style="padding:3px 6px 3px 0;font-size:14px;line-height:1;color:${color}">●</td>
      <td style="padding:3px 10px 3px 0;font-size:14px;font-weight:400;color:#374151;white-space:nowrap">${b.statut}</td>
      <td style="padding:3px 0;font-size:14px;font-weight:700;color:#0F172A;text-align:right">${b.count}</td>
    </tr>`;
  }).join('');
  return `<table style="border-collapse:collapse">${rows}</table>`;
}

/** Une carte (Commandes ou Devis) : titre + gros total à gauche, répartition par statut à droite. */
function renderCard(title: string, color: string, data: RecapCardData): string {
  return section(`
  <div style="${CONTAINER_STYLE};padding:20px">
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="vertical-align:middle">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color}">${title}</p>
          <p style="margin:6px 0 0;font-size:36px;font-weight:900;color:${color};line-height:1">${data.total}</p>
        </td>
        <td style="vertical-align:middle;text-align:right;width:1%">${renderBreakdown(data.breakdown)}</td>
      </tr>
    </table>
  </div>`);
}

/** Les deux cartes Commandes / Devis, empilées verticalement, répartition à l'intérieur de chacune. */
export function renderCards(commandes: RecapCardData, devis: RecapCardData): string {
  return `${renderCard('Commandes', '#166534', commandes)}${renderCard('Devis', '#5B21B6', devis)}`;
}

// ── Styles repris tels quels de src/app/admin/requests/page.tsx (tableau) et
// src/components/ui/StatusPill.tsx, pour que le tableau de l'email ait
// exactement le même look que celui du dashboard.
const TYPE_STYLE: Record<'Commande' | 'Devis', { border: string; bg: string; color: string }> = {
  Commande: { border: '#4CAF4F', bg: '#F0FDF4', color: '#166534' },
  Devis: { border: '#8B5CF6', bg: '#F5F3FF', color: '#5B21B6' },
};

const ITEM_STATUS_STYLE: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  'En attente': { dot: '#F97316', text: '#9A3412', bg: '#FFF7ED', border: '#FED7AA' },
  'Confirmé': { dot: '#8B5CF6', text: '#5B21B6', bg: '#F5F3FF', border: '#DDD6FE' },
  'Livré': { dot: '#22C55E', text: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  'Annulé': { dot: '#6B7280', text: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
};

function renderTypeBadge(type: 'Commande' | 'Devis'): string {
  const s = TYPE_STYLE[type];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;border:2px solid ${s.border};background:${s.bg};color:${s.color}">${type}</span>`;
}

function renderStatusPill(statut: string): string {
  const s = ITEM_STATUS_STYLE[statut] ?? { dot: '#8A9BB5', text: '#374151', bg: '#F9FAFB', border: '#E5E7EB' };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid ${s.border};background:${s.bg};color:${s.text};white-space:nowrap"><span style="color:${s.dot}">●</span> ${statut}</span>`;
}

/**
 * Tableau détaillé (Type/Référence/Client/Statut/Montant), même design que le
 * tableau du dashboard (`/admin/requests`). Toujours affiché directement
 * (pas de repli/bouton pour l'ouvrir).
 */
export function renderItemsTable(items: RecapItem[]): string {
  const count = items.length;
  if (count === 0) return '';

  const rows = items.map((i) => `
    <tr style="border-top:1px solid #F2F4F7">
      <td style="padding:14px 20px">${renderTypeBadge(i.type)}</td>
      <td style="padding:14px 20px;font-family:monospace;font-weight:700;font-size:12px;color:${TYPE_STYLE[i.type].border}">${i.ref}</td>
      <td style="padding:14px 20px;font-size:13px;font-weight:600;color:#0F172A">${i.client}</td>
      <td style="padding:14px 20px">${renderStatusPill(i.statut)}</td>
      <td style="padding:14px 20px;font-size:13px;font-weight:600;color:#0F172A;text-align:right">${i.montant}</td>
    </tr>`).join('');

  return section(`
  <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,0.06);overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F8FAFC">
          <th style="padding:14px 20px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8A9BB5">Type</th>
          <th style="padding:14px 20px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8A9BB5">Référence</th>
          <th style="padding:14px 20px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8A9BB5">Client</th>
          <th style="padding:14px 20px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8A9BB5">Statut</th>
          <th style="padding:14px 20px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8A9BB5">Montant</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`);
}

/** Coquille commune : fond blanc, contenu (titre/cartes/répartition/bouton) + logo en bas, pas de tableau. */
export function wrapEmail(bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F8FAFC;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <div style="background:#ffffff;padding:24px;border-radius:10px;border:1px solid #E2E8F0">
    ${bodyHtml}
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #E2E8F0;text-align:center">
      <img src="cid:${LOGO_CID}" alt="PSI — Paper Solutions Industry" width="72" style="display:block;margin:0 auto;width:72px;height:auto"/>
      <p style="margin:8px 0 0;color:#8A9BB5;font-size:10px">PSI Paper Solutions Industry · Centre El Qods, Niveau M1 — Chéraga, Alger</p>
    </div>
  </div>
</div>
</body></html>`;
}
