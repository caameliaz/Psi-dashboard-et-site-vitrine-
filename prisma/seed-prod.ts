// Seed de PRODUCTION / livraison — base propre pour l'entreprise.
// 2 admins + 2 employés (1 complet, 1 limité) + produits + templates + contenu.
// PAS de clients/commandes/devis : ils seront créés via l'app.
// Lancer : npx dotenv-cli -e .env -- npx tsx prisma/seed-prod.ts
import { PrismaClient, TemplateCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Permissions (doivent correspondre à src/lib/permissions.ts)
const ALL_PERMS = [
  'voir_commandes', 'modifier_statuts', 'assign_commandes', 'reassigner_client', 'voir_clients', 'modifier_clients',
  'voir_produits', 'modifier_produits', 'voir_historique', 'modifier_contenu', 'gerer_utilisateurs',
];
const EMPLOYE_COMPLET = [
  'voir_commandes', 'modifier_statuts', 'voir_clients', 'modifier_clients',
  'voir_produits', 'modifier_produits', 'voir_historique',
];
const EMPLOYE_LIMITE = ['voir_commandes', 'voir_clients', 'voir_produits'];

async function main() {
  console.log('🌱 Seed PRODUCTION démarré...');

  // ─── NETTOYAGE (ordre respectant les dépendances) ───────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.notificationRead.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.clientNote.deleteMany();
  await prisma.clientPhone.deleteMany();
  await prisma.client.deleteMany();
  await prisma.productCustomField.deleteMany();
  await prisma.productFieldDef.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.customStatus.deleteMany();
  await prisma.siteContent.deleteMany();
  await prisma.user.deleteMany();

  // ─── UTILISATEURS ────────────────────────────────────────────────────────────
  const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);
  const PWD = 'psi2026';

  await prisma.user.create({
    data: { name: 'Administrateur 1', email: 'admin1@psi.dz', password: hash(PWD), role: 'ADMIN', active: true, permissions: ALL_PERMS },
  });
  await prisma.user.create({
    data: { name: 'Administrateur 2', email: 'admin2@psi.dz', password: hash(PWD), role: 'ADMIN', active: true, permissions: ALL_PERMS },
  });
  await prisma.user.create({
    data: { name: 'Employé Complet', email: 'employe1@psi.dz', password: hash(PWD), role: 'EMPLOYEE', active: true, permissions: EMPLOYE_COMPLET },
  });
  await prisma.user.create({
    data: { name: 'Employé Limité', email: 'employe2@psi.dz', password: hash(PWD), role: 'EMPLOYEE', active: true, permissions: EMPLOYE_LIMITE },
  });

  console.log('✅ 4 utilisateurs créés (2 admins, 2 employés)');

  // ─── CHAMPS CUSTOM PRODUITS ───────────────────────────────────────────────────
  const fieldGrammage = await prisma.productFieldDef.create({ data: { label: 'Grammage', type: 'TEXT', required: false, order: 1 } });
  const fieldOrigine = await prisma.productFieldDef.create({ data: { label: 'Origine', type: 'TEXT', required: false, order: 2 } });
  const fieldBPA = await prisma.productFieldDef.create({ data: { label: 'BPA Free', type: 'BOOLEAN', required: false, order: 3 } });

  // ─── CATÉGORIE + PRODUITS ─────────────────────────────────────────────────────
  const cat = await prisma.category.create({ data: { name: 'Papier thermique standard', order: 1 } });

  const produitsData = [
    { reference: '80/80', width: 80, length: 79, usage: 'Imprimantes thermiques – Caisse grand format – Commerces',       price: 680 },
    { reference: '80/75', width: 75, length: 74, usage: 'Imprimantes thermiques – Caisse grand format – Commerce & banque', price: 650 },
    { reference: '80/60', width: 60, length: 45, usage: 'Usage mixte',                                                     price: 520 },
    { reference: '57/50', width: 50, length: 30, usage: 'Terminal compact',                                                price: 390 },
    { reference: '57/40', width: 40, length: 20, usage: 'Restaurant & pharmacie',                                          price: 310 },
    { reference: '57/30', width: 30, length:  9, usage: 'Petit terminal mobile',                                           price: 220 },
  ];

  for (const p of produitsData) {
    await prisma.product.create({
      data: {
        reference: p.reference, width: p.width, length: p.length, usage: p.usage, price: p.price,
        active: true, categoryId: cat.id,
        customFields: {
          create: [
            { definitionId: fieldGrammage.id, value: '55 gr/m² Premium' },
            { definitionId: fieldOrigine.id,  value: 'Europe' },
            { definitionId: fieldBPA.id,      value: 'true' },
          ],
        },
      },
    });
  }

  console.log('✅ 6 produits créés');

  // ─── TEMPLATES MESSAGES ───────────────────────────────────────────────────────
  await prisma.messageTemplate.createMany({
    data: [
      { title: 'Confirmation de commande', category: 'CONFIRMATION' as TemplateCategory, order: 1, content: 'Bonjour [Nom],\nNous confirmons la bonne réception de votre commande [Référence].\n[Récapitulatif]\nNotre équipe la prépare et revient vers vous très vite. Merci de votre confiance.\n— L\'équipe PSI Algérie' },
      { title: 'Commande confirmée (détail + livraison à venir)', category: 'CONFIRMATION' as TemplateCategory, order: 2, content: 'Bonjour [Nom],\nVotre commande [Référence] est confirmée. Voici le détail :\n[Récapitulatif]\nNous la préparons et vous recontacterons très bientôt pour convenir de la livraison.\n— L\'équipe PSI Algérie' },
      { title: 'Devis reçu', category: 'DEVIS' as TemplateCategory, order: 3, content: 'Bonjour [Nom],\nMerci pour votre demande de devis [Référence]. Nous étudions votre besoin et revenons vers vous sous 24 à 48h avec notre meilleure offre.\nÀ très bientôt,\n— L\'équipe PSI Algérie' },
      { title: 'Devis chiffré / offre envoyée', category: 'DEVIS' as TemplateCategory, order: 4, content: 'Bonjour [Nom],\nSuite à votre demande, voici notre offre pour le devis [Référence] :\n[Récapitulatif]\nDites-nous si vous souhaitez confirmer.\n— L\'équipe PSI Algérie' },
      { title: 'Demande de devis sans suite', category: 'DEVIS' as TemplateCategory, order: 5, content: 'Bonjour [Nom],\nNous vous remercions pour votre demande de devis [Référence]. Malheureusement, nous ne sommes pas en mesure d\'y donner suite pour le moment. Nous restons à votre disposition pour vos futurs besoins.\nBien cordialement,\n— L\'équipe PSI Algérie' },
      { title: 'Annonce de livraison', category: 'LIVRAISON' as TemplateCategory, order: 6, content: 'Bonjour [Nom],\nBonne nouvelle : votre commande [Référence] est prête et part en livraison vers [Wilaya].\n[Récapitulatif]\nNous vous tiendrons informé. Merci de votre confiance.\n— L\'équipe PSI Algérie' },
      { title: 'Commande livrée / remerciement', category: 'LIVRAISON' as TemplateCategory, order: 7, content: 'Bonjour [Nom],\nVotre commande [Référence] vous a bien été livrée. Nous espérons que tout est conforme à vos attentes.\nMerci de votre confiance — et à bientôt chez PSI Algérie !\n— L\'équipe PSI Algérie' },
      { title: 'Relance devis / commande', category: 'RELANCE' as TemplateCategory, order: 8, content: 'Bonjour [Nom],\nNous revenons vers vous concernant votre commande (ou devis) [Référence]. Avez-vous pu l\'examiner ? Nous restons à votre entière disposition pour toute question ou ajustement.\nBien à vous,\n— L\'équipe PSI Algérie' },
      { title: 'Prise de contact', category: 'AUTRE' as TemplateCategory, order: 9, content: 'Bonjour [Nom],\nPSI Algérie, spécialiste du papier thermique professionnel, se permet de vous contacter pour comprendre votre besoin et vous accompagner.\nQuand seriez-vous disponible pour en discuter ?\n— L\'équipe PSI Algérie' },
      { title: 'Annulation', category: 'AUTRE' as TemplateCategory, order: 10, content: 'Bonjour [Nom],\nNous vous confirmons l\'annulation de votre commande [Référence]. N\'hésitez pas à revenir vers nous pour toute nouvelle demande.\nBien cordialement,\n— L\'équipe PSI Algérie' },
    ],
  });

  console.log('✅ Templates messages créés');

  // ─── CONTENU SITE ─────────────────────────────────────────────────────────────
  await prisma.siteContent.createMany({
    data: [
      { key: 'hero_title',    value: 'Spécialiste du papier thermique professionnel' },
      { key: 'hero_subtitle', value: 'Rouleaux haute qualité BPA Free, livrés partout en Algérie.' },
      { key: 'hero_cta',      value: 'Demander un devis' },
      { key: 'about_title',   value: 'Qui sommes-nous ?' },
      { key: 'about_text',    value: 'PSI (Paper Solutions Industry) est une entreprise algérienne spécialisée dans la distribution de papier thermique professionnel. Basés à Chéraga, Alger, nous fournissons les commerces, restaurants, pharmacies et institutions partout en Algérie.' },
      { key: 'footer_tagline',value: 'Spécialiste du papier thermique professionnel en Algérie' },
    ],
  });

  console.log('✅ Contenu site créé');

  console.log('');
  console.log('🎉 Seed PRODUCTION terminé !');
  console.log('');
  console.log('   COMPTES (mot de passe pour tous : psi2026)');
  console.log('   ├─ admin1@psi.dz     → Admin (toutes permissions)');
  console.log('   ├─ admin2@psi.dz     → Admin (toutes permissions)');
  console.log('   ├─ employe1@psi.dz   → Employé complet');
  console.log('   └─ employe2@psi.dz   → Employé limité (lecture seule)');
  console.log('');
  console.log('   Base SANS clients/commandes/devis — à créer via l\'app.');
}

main()
  .catch((e) => { console.error('❌ Erreur seed :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
