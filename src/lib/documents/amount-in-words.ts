// Montant en toutes lettres pour « Arrêtée la présente facture à la somme de : … » (cf. TODO-FACTURES-BL.md).
// Style de la facture PSI : majuscule à chaque mot, sans trait d'union
// (« Trois Cent Cinquante Cinq Mille Deux Cent Quatre Vingt Six Dinars Algérien et 40 Centimes. »).

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

// 0..99
function moinsDeCent(n: number, final: boolean): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d <= 6) {
    if (u === 0) return DIZAINES[d];
    return `${DIZAINES[d]}${u === 1 ? ' et ' : '-'}${UNITES[u]}`;
  }
  if (d === 7) return `soixante${u === 1 ? ' et ' : '-'}${UNITES[10 + u]}`;
  // 80..99
  if (d === 8) return u === 0 ? (final ? 'quatre-vingts' : 'quatre-vingt') : `quatre-vingt-${UNITES[u]}`;
  return `quatre-vingt-${UNITES[10 + u]}`;
}

// 0..999
function moinsDeMille(n: number, final: boolean): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  let out = '';
  if (c > 0) {
    out = c === 1 ? 'cent' : `${UNITES[c]} cent`;
    if (r === 0) return c > 1 && final ? `${out}s` : out;
  }
  if (r > 0) out += (out ? ' ' : '') + moinsDeCent(r, final);
  return out;
}

export function nombreEnLettres(entier: number): string {
  const n = Math.floor(Math.abs(entier));
  if (n === 0) return 'zéro';
  if (n >= 1_000_000_000_000) throw new Error('Nombre trop grand');
  const groupes: [number, string, string][] = [
    [Math.floor(n / 1_000_000_000), 'milliard', 'milliards'],
    [Math.floor((n % 1_000_000_000) / 1_000_000), 'million', 'millions'],
    [Math.floor((n % 1_000_000) / 1000), 'mille', 'mille'],
    [n % 1000, '', ''],
  ];
  const parts: string[] = [];
  groupes.forEach(([val, sing, plur]) => {
    if (val === 0) return;
    if (sing === 'mille') parts.push(val === 1 ? 'mille' : `${moinsDeMille(val, false)} mille`);
    else if (!sing) parts.push(moinsDeMille(val, true));
    else parts.push(`${val === 1 ? 'un' : moinsDeMille(val, true)} ${val > 1 ? plur : sing}`); // « trois cents millions »
  });
  return parts.join(' ');
}

const titre = (s: string) => s.replace(/-/g, ' ').replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1));

// 355286.4 → « Trois Cent Cinquante Cinq Mille Deux Cent Quatre Vingt Six Dinars Algérien et 40 Centimes. »
export function montantEnLettres(montant: number): string {
  const centimesTotal = Math.round(Math.abs(montant) * 100);
  const dinars = Math.floor(centimesTotal / 100);
  const centimes = centimesTotal % 100;
  const dinarsTxt = `${titre(nombreEnLettres(dinars))} Dinars Algérien`;
  return centimes > 0 ? `${dinarsTxt} et ${String(centimes).padStart(2, '0')} Centimes.` : `${dinarsTxt}.`;
}
