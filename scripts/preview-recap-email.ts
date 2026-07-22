// Génère le HTML réel des templates de récap (avec des données factices, pas
// de DB) et l'écrit dans des fichiers ouvrables directement dans un
// navigateur — pour visualiser/ajuster le design AVANT de tester un vrai
// envoi Gmail. Le cid:psi-logo (pièce jointe inline, invisible hors client
// mail) est remplacé par une image data-URI pour que le logo s'affiche aussi
// dans l'aperçu navigateur.
//
// Usage : npx tsx scripts/preview-recap-email.ts [dossier-de-sortie]
// Par défaut, écrit dans le dossier courant.

import fs from 'fs';
import path from 'path';
import { dailyRecapTemplate } from '../src/emails/dailyRecapTemplate';
import { weeklyRecapTemplate } from '../src/emails/weeklyRecapTemplate';
import { LOGO_CID, logoAttachment } from '../src/emails/shared';

const outDir = process.argv[2] ?? '.';
fs.mkdirSync(outDir, { recursive: true });

// La pièce jointe expose `content` (Buffer) ou `path` selon l'environnement.
const logoBytes = logoAttachment.content ?? fs.readFileSync(logoAttachment.path!);
const logoDataUri = `data:image/jpeg;base64,${logoBytes.toString('base64')}`;
const forBrowser = (html: string) => html.replaceAll(`cid:${LOGO_CID}`, logoDataUri);

const adminUrl = 'http://localhost:3000/admin/requests';

const mockItems = [
  { ref: 'CMD-16-0042', type: 'Commande' as const, client: 'Papeterie El Fath SARL', statut: 'Confirmé', montant: '128 500 DA' },
  { ref: 'CMD-16-0043', type: 'Commande' as const, client: 'Bureau Vision', statut: 'En attente', montant: '54 000 DA' },
  { ref: 'DEV-31-0011', type: 'Devis' as const, client: 'Import Export Ziani', statut: 'Livré', montant: '312 000 DA' },
  { ref: 'CMD-16-0044', type: 'Commande' as const, client: 'Société Kraft Plus', statut: 'Annulé', montant: '78 200 DA' },
];

const daily = dailyRecapTemplate({
  dateLabel: '15 juillet 2026',
  commandes: { total: 3, breakdown: [{ statut: 'Confirmé', count: 2 }, { statut: 'En attente', count: 1 }] },
  devis: { total: 1, breakdown: [{ statut: 'Livré', count: 1 }] },
  items: mockItems,
  adminUrl,
});

const weekly = weeklyRecapTemplate({
  weekLabel: '7 juil. – 13 juil. 2026',
  commandes: { total: 3, breakdown: [{ statut: 'En attente', count: 1 }, { statut: 'Confirmé', count: 1 }, { statut: 'Annulé', count: 1 }] },
  devis: { total: 1, breakdown: [{ statut: 'Livré', count: 1 }] },
  items: mockItems,
  adminUrl,
});

fs.writeFileSync(path.join(outDir, 'daily-recap-preview.html'), forBrowser(daily.html));
fs.writeFileSync(path.join(outDir, 'weekly-recap-preview.html'), forBrowser(weekly.html));

console.log('Écrit :');
console.log(' -', path.resolve(outDir, 'daily-recap-preview.html'));
console.log(' -', path.resolve(outDir, 'weekly-recap-preview.html'));
console.log('Ouvre ces fichiers dans un navigateur pour voir le rendu (le logo cid: est remplacé par une image visible ici uniquement).');
