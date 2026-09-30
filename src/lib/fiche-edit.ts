import { validatePhone, normalizePhone } from './validation';

// Modification de la « fiche » d'une commande/d'un devis par un admin (client, facturation,
// dates…) — pas seulement des produits. Même logique pour les deux, appelée par
// PATCH /api/orders/[id] et /api/quotes/[id] via `body.fiche`.

const VALID_SOURCES = ['SITE', 'ADMIN', 'WHATSAPP', 'TELEPHONE', 'AUTRE', 'ROLLINK'];

type Kind = 'order' | 'quote';

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'bool' | 'date' | 'source';
  required?: boolean;
  onlyDelivered?: boolean; // modifiable seulement sur une demande déjà livrée
  onlyOrder?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'clientName', label: 'Nom', type: 'text', required: true },
  { key: 'clientCompany', label: 'Entreprise', type: 'text' },
  { key: 'clientPhone', label: 'Téléphone', type: 'text' },
  { key: 'clientWilaya', label: 'Wilaya', type: 'text' },
  { key: 'clientCommune', label: 'Commune', type: 'text' },
  { key: 'invoiceNumber', label: 'N° facture', type: 'text' },
  { key: 'paymentMethod', label: 'Mode de paiement', type: 'text' },
  { key: 'paymentDate', label: 'Date de règlement', type: 'date' },
  { key: 'vatEnabled', label: 'TVA', type: 'bool', onlyOrder: true }, // pour un devis, la TVA a son propre réglage
  { key: 'source', label: 'Source', type: 'source' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'createdAt', label: 'Date de la demande', type: 'date', onlyDelivered: true },
  { key: 'deliveredAt', label: 'Date de livraison', type: 'date', onlyDelivered: true },
];

const day = (d: unknown) => (d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '');
const show = (v: string) => (v === '' ? '—' : v.length > 60 ? `${v.slice(0, 57)}…` : v);

export type FicheResult =
  | { ok: true; data: Record<string, unknown>; changes: string[] }
  | { ok: false; error: string };

/** Compare `fiche` (valeurs saisies) à `current` (ligne en base) → champs à écrire + libellés « avant → après ». */
export function buildFicheUpdate(kind: Kind, current: Record<string, unknown>, fiche: Record<string, unknown>, isDelivered: boolean): FicheResult {
  const data: Record<string, unknown> = {};
  const changes: string[] = [];

  for (const f of FIELDS) {
    if (!(f.key in fiche)) continue;
    if (f.onlyOrder && kind !== 'order') continue;
    const raw = fiche[f.key];
    const oldRaw = current[f.key];

    if (f.type === 'bool') {
      const next = Boolean(raw);
      if (next !== Boolean(oldRaw)) { data[f.key] = next; changes.push(`${f.label} : ${oldRaw ? 'oui' : 'non'} → ${next ? 'oui' : 'non'}`); }
      continue;
    }

    if (f.type === 'date') {
      const str = String(raw ?? '').trim();
      const oldStr = day(oldRaw);
      if (str === oldStr) continue;
      if (f.onlyDelivered && !isDelivered) return { ok: false, error: 'Les dates ne sont modifiables que sur une demande livrée.' };
      if (str === '') {
        if (f.key !== 'paymentDate') return { ok: false, error: `${f.label} : ne peut pas être vide.` };
        data[f.key] = null;
      } else {
        const d = new Date(str);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(str) || isNaN(d.getTime())) return { ok: false, error: `${f.label} : date invalide.` };
        data[f.key] = d;
      }
      changes.push(`${f.label} : ${show(oldStr)} → ${show(str)}`);
      continue;
    }

    let str = String(raw ?? '').trim();
    if (f.type === 'source') {
      if (!VALID_SOURCES.includes(str)) return { ok: false, error: 'Source invalide.' };
    }
    if (f.key === 'clientPhone' && str) {
      if (validatePhone(str, false)) return { ok: false, error: 'Numéro de téléphone invalide.' };
      str = normalizePhone(str);
    }
    if (f.required && str.length < 2) return { ok: false, error: `${f.label} : 2 caractères minimum.` };
    if (str.length > 300 && f.key !== 'notes') return { ok: false, error: `${f.label} : trop long.` };
    const oldStr = String(oldRaw ?? '').trim();
    if (str === oldStr) continue;
    data[f.key] = str === '' ? null : str;
    changes.push(`${f.label} : ${show(oldStr)} → ${show(str)}`);
  }

  return { ok: true, data, changes };
}
