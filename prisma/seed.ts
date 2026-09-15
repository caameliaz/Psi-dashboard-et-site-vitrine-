import { PrismaClient, OrderSource, RequestStatus, TemplateCategory, AuditEntity, NotifType, ProductMode } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { confirmStock, deliverStock, returnStock } from '../src/lib/order-stock';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed PSI démarré...');

  // ─── NETTOYAGE ───────────────────────────────────────────────────────────────
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
  await prisma.stockAssignment.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.rawMaterial.deleteMany();
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

  const admin = await prisma.user.create({
    data: {
      name: 'Admin PSI',
      email: 'admin@psi.dz',
      password: hash('password'),
      role: 'ADMIN',
      active: true,
    },
  });

  const amira = await prisma.user.create({
    data: {
      name: 'Amira Bensaid',
      email: 'amira@psi.dz',
      password: hash('Amira2026!'),
      role: 'EMPLOYEE',
      active: true,
    },
  });

  const tariq = await prisma.user.create({
    data: {
      name: 'Tariq Meziane',
      email: 'tariq@psi.dz',
      password: hash('Tariq2026!'),
      role: 'EMPLOYEE',
      active: true,
    },
  });

  const samia = await prisma.user.create({
    data: {
      name: 'Samia Oukil',
      email: 'samia@psi.dz',
      password: hash('Samia2026!'),
      role: 'EMPLOYEE',
      active: false,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Youcef',
      email: 'yms211201@gmail.com',
      password: hash('password'),
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('✅ Utilisateurs créés');

  // ─── CHAMPS CUSTOM PRODUITS ───────────────────────────────────────────────────
  const fieldGrammage = await prisma.productFieldDef.create({
    data: { label: 'Grammage', type: 'TEXT', required: false, order: 1 },
  });
  const fieldOrigine = await prisma.productFieldDef.create({
    data: { label: 'Origine', type: 'TEXT', required: false, order: 2 },
  });
  const fieldBPA = await prisma.productFieldDef.create({
    data: { label: 'BPA Free', type: 'BOOLEAN', required: false, order: 3 },
  });

  // ─── CATÉGORIE ───────────────────────────────────────────────────────────────
  const cat = await prisma.category.create({
    data: { name: 'Papier thermique standard', order: 1 },
  });

  // ─── PRODUITS ────────────────────────────────────────────────────────────────
  // mode : ACHETE (revendu tel quel, réassort via liste d'achat) — FABRIQUE
  // (fabriqué en interne via recette de matières premières) — LES_DEUX (les 2
  // voies possibles, ex: dépannage acheté en attendant la prod).
  // ⚠️ Tous en FABRIQUE pour l'instant — le cas ACHETE/LES_DEUX sera retesté plus tard.
  const produitsData = [
    { reference: '80/80', width: 80, length: 79, usage: 'Imprimantes thermiques – Caisse grand format – Commerces',      price: 680, mode: 'FABRIQUE' as ProductMode },
    { reference: '80/75', width: 75, length: 74, usage: 'Imprimantes thermiques – Caisse grand format – Commerce & banque', price: 650, mode: 'FABRIQUE' as ProductMode },
    { reference: '80/60', width: 60, length: 45, usage: 'Usage mixte',                                                    price: 520, mode: 'FABRIQUE' as ProductMode },
    { reference: '57/50', width: 50, length: 30, usage: 'Terminal compact',                                               price: 390, mode: 'FABRIQUE' as ProductMode },
    { reference: '57/40', width: 40, length: 20, usage: 'Restaurant & pharmacie',                                         price: 310, mode: 'FABRIQUE' as ProductMode },
    { reference: '57/30', width: 30, length:  9, usage: 'Petit terminal mobile',                                          price: 220, mode: 'FABRIQUE' as ProductMode },
  ];

  const products: Record<string, { id: string }> = {};

  for (const p of produitsData) {
    const product = await prisma.product.create({
      data: {
        reference: p.reference,
        width: p.width,
        length: p.length,
        usage: p.usage,
        price: p.price,
        mode: p.mode,
        active: true,
        categoryId: cat.id,
        customFields: {
          create: [
            { definitionId: fieldGrammage.id, value: '55 gr/m² Premium' },
            { definitionId: fieldOrigine.id,  value: 'Europe' },
            { definitionId: fieldBPA.id,      value: 'true' },
          ],
        },
      },
    });
    products[p.reference] = product;
  }

  console.log('✅ Produits créés');

  // ─── MATIÈRES PREMIÈRES + RECETTES DE PRODUCTION ─────────────────────────────
  const matieresData = [
    { reference: 'FILM-TPE-57', name: 'Film TPE 57 mm',   unit: 'bobine', price: 850,  stockMax: 40,   purchaseThreshold: 20, available: 120 },
    { reference: 'FILM-TPE-80', name: 'Film TPE 80 mm',   unit: 'bobine', price: 1100, stockMax: 40,   purchaseThreshold: 20, available: 90 },
    { reference: 'COAT-THERM',  name: 'Coating thermique', unit: 'g',      price: 4,    stockMax: 10000, purchaseThreshold: 5000, available: 42000 },
    { reference: 'CORE-57',     name: 'Mandrin 57 mm',    unit: 'unité',  price: 15,   stockMax: 400,  purchaseThreshold: 200, available: 1500 },
    { reference: 'CORE-80',     name: 'Mandrin 80 mm',    unit: 'unité',  price: 20,   stockMax: 400,  purchaseThreshold: 200, available: 1300 },
    // Matière volontairement en stock faible → sert à démontrer le blocage
    // d'une ligne de production (statut BLOQUE) faute de matière première.
    { reference: 'FILM-TPE-30', name: 'Film TPE 30 mm',   unit: 'bobine', price: 700,  stockMax: 40,   purchaseThreshold: 20, available: 8 },
    { reference: 'CORE-30',     name: 'Mandrin 30 mm',    unit: 'unité',  price: 10,   stockMax: 200,  purchaseThreshold: 100, available: 50 },
  ];
  const matieres: Record<string, { id: string }> = {};
  for (const m of matieresData) {
    matieres[m.reference] = await prisma.rawMaterial.create({ data: m });
  }

  // Recette : 1 unité de "57/40" consomme 1 bobine de film 57mm + 50g de coating + 1 mandrin 57mm
  await prisma.recipeItem.createMany({
    data: [
      { productId: products['57/40'].id, rawMaterialId: matieres['FILM-TPE-57'].id, quantity: 1 },
      { productId: products['57/40'].id, rawMaterialId: matieres['COAT-THERM'].id,  quantity: 50 },
      { productId: products['57/40'].id, rawMaterialId: matieres['CORE-57'].id,     quantity: 1 },
      { productId: products['80/80'].id, rawMaterialId: matieres['FILM-TPE-80'].id, quantity: 1 },
      { productId: products['80/80'].id, rawMaterialId: matieres['COAT-THERM'].id,  quantity: 80 },
      { productId: products['80/80'].id, rawMaterialId: matieres['CORE-80'].id,     quantity: 1 },
      // "57/30" : recette dont une matière (FILM-TPE-30) est volontairement
      // en stock trop faible → démontre le statut BLOQUE en liste de production.
      { productId: products['57/30'].id, rawMaterialId: matieres['FILM-TPE-30'].id, quantity: 1 },
      { productId: products['57/30'].id, rawMaterialId: matieres['COAT-THERM'].id,  quantity: 20 },
      { productId: products['57/30'].id, rawMaterialId: matieres['CORE-30'].id,     quantity: 1 },
    ],
  });

  // Stock initial de démo sur les produits finis (tous FABRIQUE) :
  // - 80/80, 57/40 : bien approvisionnés, recette couverte par les matières
  // - 80/75, 57/50, 80/60 : stock partiel, pas de recette définie → production
  //   directe sans réservation de matière (toujours A_PRODUIRE, jamais bloqué)
  // - 57/30 : stock faible, recette dont une matière est rare → démontre le
  //   statut BLOQUE en liste de production (cf. section matières ci-dessus)
  await prisma.product.update({ where: { id: products['57/40'].id }, data: { available: 340, stockMax: 100, productionThreshold: 50 } });
  await prisma.product.update({ where: { id: products['80/80'].id }, data: { available: 210, stockMax: 100, productionThreshold: 50 } });
  await prisma.product.update({ where: { id: products['80/75'].id }, data: { available: 5,   stockMax: 60,  productionThreshold: 30 } });
  await prisma.product.update({ where: { id: products['57/50'].id }, data: { available: 200, stockMax: 60,  productionThreshold: 30 } });
  await prisma.product.update({ where: { id: products['80/60'].id }, data: { available: 40,  stockMax: 40,  productionThreshold: 20 } });
  await prisma.product.update({ where: { id: products['57/30'].id }, data: { available: 10,  stockMax: 60,  productionThreshold: 30 } });

  console.log('✅ Matières premières + recettes créées');

  // ─── CLIENTS ─────────────────────────────────────────────────────────────────
  const clientsData = [
    { name: 'Ahmed Benali',    company: 'TechAlger SARL',      wilaya: 'Alger',       email: 'a.benali@techalger.dz',   phone: '+213 555 010 001' },
    { name: 'Sara Mansouri',   company: 'BuroPro',             wilaya: 'Oran',        email: 's.mansouri@buropro.dz',   phone: '+213 555 010 002' },
    { name: 'Karim Hadji',     company: 'AlgeroShop',          wilaya: 'Constantine', email: 'k.hadji@algeroshop.dz',   phone: '+213 555 010 003' },
    { name: 'Nadia Berber',    company: 'MegaDist',            wilaya: 'Annaba',      email: 'n.berber@megadist.dz',    phone: '+213 555 010 004' },
    { name: 'Mohamed Ziani',   company: 'PrintPlus',           wilaya: 'Blida',       email: 'm.ziani@printplus.dz',    phone: '+213 555 010 005' },
    { name: 'Fatima Bouzid',   company: 'EcoMarket',           wilaya: 'Sétif',       email: 'f.bouzid@ecomarket.dz',   phone: '+213 555 010 006' },
    { name: 'Youssef Amrani',  company: 'DigiStore',           wilaya: 'Tizi Ouzou',  email: 'y.amrani@digistore.dz',   phone: '+213 555 010 007' },
    { name: 'Lynda Cherifi',   company: 'SuperMarché El Amel', wilaya: 'Béjaïa',      email: 'l.cherifi@elamel.dz',     phone: '+213 555 010 008' },
    { name: 'Sofiane Mekki',   company: 'FastPrint',           wilaya: 'Batna',       email: 's.mekki@fastprint.dz',    phone: '+213 555 010 009' },
    { name: 'Rania Touati',    company: 'Papeterie Centrale',  wilaya: 'Tlemcen',     email: 'r.touati@papcentrale.dz', phone: '+213 555 010 010' },
    { name: 'Hocine Belkacem', company: 'AlgerPos',            wilaya: 'Alger',       email: 'h.belkacem@algerpos.dz',  phone: '+213 555 010 011' },
    { name: 'Meriem Saadi',    company: 'MediPharm',           wilaya: 'Oran',        email: 'm.saadi@medipharm.dz',    phone: '+213 555 010 012' },
  ];

  const clients: Record<string, { id: string }> = {};

  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: {
        name: c.name,
        company: c.company,
        wilaya: c.wilaya,
        email: c.email,
        phones: {
          create: [{ number: c.phone, label: 'Principal', primary: true }],
        },
      },
    });
    clients[c.name] = client;
  }

  console.log('✅ Clients créés');

  // ─── COMMANDES ───────────────────────────────────────────────────────────────
  const cmd1 = await prisma.order.create({
    data: {
      clientId: clients['Ahmed Benali'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-06-24T09:42:00'),
      items: {
        create: [
          { productId: products['80/80'].id, quantity: 50, unitPrice: 680 },
          { productId: products['57/40'].id, quantity: 30, unitPrice: 310 },
        ],
      },
    },
  });

  const cmd2 = await prisma.order.create({
    data: {
      clientId: clients['Karim Hadji'].id,
      status: 'CONTACTE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-06-22T11:05:00'),
      items: {
        create: [
          { productId: products['80/80'].id, quantity: 30, unitPrice: 680 },
          { productId: products['80/75'].id, quantity: 10, unitPrice: 650 },
        ],
      },
    },
  });

  const cmd3 = await prisma.order.create({
    data: {
      clientId: clients['Nadia Berber'].id,
      status: 'ANNULE' as RequestStatus,
      source: 'TELEPHONE' as OrderSource,
      cancelReason: 'Client a annulé — changement de fournisseur',
      createdAt: new Date('2026-06-21T16:30:00'),
      items: {
        create: [
          { productId: products['57/40'].id, quantity: 10, unitPrice: 310 },
        ],
      },
    },
  });

  const cmd4 = await prisma.order.create({
    data: {
      clientId: clients['Fatima Bouzid'].id,
      status: 'EN_ATTENTE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-06-29T10:20:00'),
      items: {
        create: [
          { productId: products['57/40'].id, quantity: 24, unitPrice: 310 },
          { productId: products['57/50'].id, quantity: 12, unitPrice: 390 },
        ],
      },
    },
  });

  const cmd5 = await prisma.order.create({
    data: {
      clientId: clients['Hocine Belkacem'].id,
      status: 'EN_ATTENTE' as RequestStatus,
      source: 'WHATSAPP' as OrderSource,
      createdById: amira.id,
      createdAt: new Date('2026-06-30T08:15:00'),
      items: {
        create: [
          { productId: products['80/80'].id, quantity: 100, unitPrice: 680 },
        ],
      },
    },
  });

  console.log('✅ Commandes créées');

  // ─── DEVIS ───────────────────────────────────────────────────────────────────
  const dev1 = await prisma.quote.create({
    data: {
      clientId: clients['Sara Mansouri'].id,
      message: 'Bonjour, nous cherchons un format personnalisé 60mm pour nos terminaux. Pouvez-vous nous faire un devis pour 200 rouleaux ?',
      status: 'EN_ATTENTE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-06-29T14:17:00'),
      items: {
        create: [
          { productId: products['80/60'].id, quantity: 200 },
        ],
      },
    },
  });

  const dev2 = await prisma.quote.create({
    data: {
      clientId: clients['Youssef Amrani'].id,
      message: 'Besoin de 57/40 en grande quantité pour plusieurs points de vente, demande urgente.',
      status: 'CONTACTE' as RequestStatus,
      source: 'SITE' as OrderSource,
      proposedPrice: 58000,
      deliveryDelay: '5 à 7 jours',
      paymentTerms: '50% à la commande',
      createdAt: new Date('2026-06-28T15:30:00'),
      items: {
        create: [
          { productId: products['57/40'].id, quantity: 100 },
          { description: 'Format personnalisé 57mm', quantity: 50 },
        ],
      },
    },
  });

  const dev3 = await prisma.quote.create({
    data: {
      clientId: clients['Sofiane Mekki'].id,
      message: 'Demande de devis pour 500 rouleaux 80/80, livraison sur Batna.',
      status: 'ANNULE' as RequestStatus,
      source: 'SITE' as OrderSource,
      cancelReason: 'Pas de suite donnée après 2 relances',
      createdAt: new Date('2026-06-20T09:00:00'),
      items: {
        create: [
          { productId: products['80/80'].id, quantity: 500 },
        ],
      },
    },
  });

  console.log('✅ Devis créés');

  // ─── SCÉNARIOS STOCK (démo) ────────────────────────────────────────────────────
  // Commandes/devis passés par le vrai moteur de stock (confirmStock / deliverStock /
  // returnStock, cf. src/lib/order-stock.ts) pour peupler des cas concrets à tester :
  //   S1 — produit ACHETE bien stocké  → tout pris sur stock, commande passe PRODUITE
  //   S2 — produit ACHETE en rupture   → partiel stock + reste en liste d'achat
  //   S3 — produit FABRIQUE, matière OK → reste en production (A_PRODUIRE)
  //   S4 — produit FABRIQUE, matière rare → production BLOQUÉE (manque matière)
  //   S5 — commande mixte (ACHETE stocké + LES_DEUX sans recette → production directe)
  //   S6 — cycle complet jusqu'à LIVRÉ
  //   S7 — cycle complet jusqu'à RETOURNÉ
  //   Q1 — devis confirmé qui vient s'ajouter à la même ligne d'achat que S2

  const s1 = await prisma.order.create({
    data: {
      clientId: clients['Ahmed Benali'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-09-01T09:00:00'),
      items: { create: [{ productId: products['57/50'].id, quantity: 20, unitPrice: 390 }] },
    },
  });
  await confirmStock('order', s1.id); // → entièrement pris sur stock → PRODUITE

  const s2 = await prisma.order.create({
    data: {
      clientId: clients['Sara Mansouri'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-09-01T10:00:00'),
      items: { create: [{ productId: products['80/75'].id, quantity: 30, unitPrice: 650 }] },
    },
  });
  await confirmStock('order', s2.id); // → 5 pris sur stock, 25 en liste d'achat

  const s3 = await prisma.order.create({
    data: {
      clientId: clients['Lynda Cherifi'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'WHATSAPP' as OrderSource,
      createdById: amira.id,
      createdAt: new Date('2026-09-02T09:30:00'),
      items: { create: [{ productId: products['57/40'].id, quantity: 400, unitPrice: 310 }] },
    },
  });
  await confirmStock('order', s3.id); // → 340 pris sur stock, 60 en production (matières suffisantes)

  const s4 = await prisma.order.create({
    data: {
      clientId: clients['Nadia Berber'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-09-02T11:00:00'),
      items: { create: [{ productId: products['57/30'].id, quantity: 25, unitPrice: 220 }] },
    },
  });
  await confirmStock('order', s4.id); // → 10 pris sur stock, 15 en production BLOQUÉE (film 30mm insuffisant)

  const s5 = await prisma.order.create({
    data: {
      clientId: clients['Rania Touati'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-09-02T15:00:00'),
      items: {
        create: [
          { productId: products['57/50'].id, quantity: 15, unitPrice: 390 },
          { productId: products['80/60'].id, quantity: 50, unitPrice: 520 },
        ],
      },
    },
  });
  await confirmStock('order', s5.id); // → 57/50 entièrement sur stock, 80/60 : 40 stock + 10 en production directe

  const s6 = await prisma.order.create({
    data: {
      clientId: clients['Sofiane Mekki'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'SITE' as OrderSource,
      createdAt: new Date('2026-09-03T09:00:00'),
      items: { create: [{ productId: products['57/50'].id, quantity: 5, unitPrice: 390 }] },
    },
  });
  await confirmStock('order', s6.id); // → PRODUITE (tout sur stock)
  await deliverStock('order', s6.id);
  await prisma.order.update({
    where: { id: s6.id },
    data: { status: 'LIVRE' as RequestStatus, paymentMethod: 'Espèces', paymentDate: new Date('2026-09-03T15:00:00') },
  });

  const s7 = await prisma.order.create({
    data: {
      clientId: clients['Hocine Belkacem'].id,
      status: 'VALIDE' as RequestStatus,
      source: 'TELEPHONE' as OrderSource,
      createdAt: new Date('2026-09-02T14:00:00'),
      items: { create: [{ productId: products['57/50'].id, quantity: 8, unitPrice: 390 }] },
    },
  });
  await confirmStock('order', s7.id); // → PRODUITE
  await deliverStock('order', s7.id);
  await returnStock('order', s7.id);
  await prisma.order.update({ where: { id: s7.id }, data: { status: 'RETOURNE' as RequestStatus } });

  const q1 = await prisma.quote.create({
    data: {
      clientId: clients['Meriem Saadi'].id,
      message: 'Devis validé — test du circuit stock sur un devis (80/75).',
      status: 'VALIDE' as RequestStatus,
      source: 'SITE' as OrderSource,
      proposedPrice: 7800,
      createdAt: new Date('2026-09-03T10:00:00'),
      items: { create: [{ productId: products['80/75'].id, quantity: 10, unitPrice: 650 }] },
    },
  });
  await confirmStock('quote', q1.id); // → vient s'ajouter à la ligne d'achat 80/75 déjà ouverte par S2

  // Lignes manuelles supplémentaires, pour voir tous les statuts sur les pages
  // Liste d'achat / Liste de production (au-delà de ce que confirmStock a généré).
  await prisma.productionListItem.create({
    data: { productId: products['80/80'].id, neededQuantity: 40, status: 'EN_COURS', auto: false },
  });
  await prisma.productionListItem.create({
    data: { productId: products['57/40'].id, neededQuantity: 60, producedQuantity: 60, status: 'PRODUIT', auto: false },
  });
  await prisma.purchaseListItem.create({
    data: { rawMaterialId: matieres['FILM-TPE-80'].id, neededQuantity: 30, orderedQuantity: 30, status: 'COMMANDE', auto: false },
  });
  await prisma.purchaseListItem.create({
    data: { productId: products['57/50'].id, neededQuantity: 50, orderedQuantity: 50, receivedQuantity: 50, status: 'RECU', auto: false },
  });

  // Stock de produits finis attribué à des commerciaux (transporté sur le terrain).
  await prisma.stockAssignment.createMany({
    data: [
      { productId: products['57/40'].id, employeeId: amira.id, quantity: 25 },
      { productId: products['80/80'].id, employeeId: tariq.id, quantity: 15 },
    ],
  });

  console.log('✅ Scénarios stock créés (commandes S1-S7, devis Q1)');

  // ─── MESSAGES CONTACT ─────────────────────────────────────────────────────────
  await prisma.contactRequest.create({
    data: {
      clientId: clients['Rania Touati'].id,
      message: 'Bonjour, je souhaite obtenir des informations sur vos conditions de livraison vers Tlemcen et vos tarifs pour les grossistes.',
      status: 'EN_ATTENTE',
      createdAt: new Date('2026-06-29T11:00:00'),
    },
  });

  await prisma.contactRequest.create({
    data: {
      clientId: clients['Meriem Saadi'].id,
      message: 'Avez-vous des rouleaux compatibles avec les imprimantes Epson TM-T20 ? Besoin urgent.',
      status: 'TRAITE',
      createdAt: new Date('2026-06-27T14:00:00'),
    },
  });

  console.log('✅ Messages contact créés');

  // ─── NOTES CLIENTS ────────────────────────────────────────────────────────────
  await prisma.clientNote.create({
    data: {
      clientId: clients['Ahmed Benali'].id,
      authorId: admin.id,
      content: 'Client fidèle, commande régulièrement chaque fin de mois. Préfère être contacté par WhatsApp.',
      createdAt: new Date('2026-06-01T10:00:00'),
    },
  });

  await prisma.clientNote.create({
    data: {
      clientId: clients['Mohamed Ziani'].id,
      authorId: amira.id,
      content: 'Demande toujours une facture pro forma avant de payer. Livraison uniquement sur Blida.',
      createdAt: new Date('2026-06-10T09:00:00'),
    },
  });

  console.log('✅ Notes clients créées');

  // ─── TEMPLATES MESSAGES ───────────────────────────────────────────────────────
  await prisma.messageTemplate.createMany({
    data: [
      {
        title: 'Confirmation de commande',
        category: 'CONFIRMATION' as TemplateCategory,
        order: 1,
        content: 'Bonjour [Nom], nous avons bien reçu votre commande [Référence]. Nous allons la traiter dans les plus brefs délais. Merci de votre confiance — PSI Algérie.',
      },
      {
        title: 'Devis reçu',
        category: 'DEVIS' as TemplateCategory,
        order: 2,
        content: 'Bonjour [Nom], merci pour votre demande de devis [Référence]. Nous revenons vers vous très prochainement avec notre meilleure offre. — PSI Algérie.',
      },
      {
        title: 'Annonce de livraison',
        category: 'LIVRAISON' as TemplateCategory,
        order: 3,
        content: 'Bonjour [Nom], votre commande [Référence] est prête et sera livrée prochainement à [Wilaya]. Merci de votre confiance — PSI Algérie.',
      },
      {
        title: 'Relance devis sans réponse',
        category: 'RELANCE' as TemplateCategory,
        order: 4,
        content: 'Bonjour [Nom], nous revenons vers vous concernant votre demande [Référence]. Avez-vous eu l\'occasion d\'examiner notre proposition ? Nous restons disponibles — PSI Algérie.',
      },
      {
        title: 'Relance commande en attente',
        category: 'RELANCE' as TemplateCategory,
        order: 5,
        content: 'Bonjour [Nom], votre commande [Référence] est en attente de confirmation. Pouvez-vous nous confirmer les détails ? — PSI Algérie.',
      },
      {
        title: 'Prise de contact initiale',
        category: 'AUTRE' as TemplateCategory,
        order: 6,
        content: 'Bonjour [Nom], je suis [Agent] de PSI Algérie, spécialiste du papier thermique professionnel. Je vous contacte suite à votre demande. Comment puis-je vous aider ?',
      },
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

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
  const notif1 = await prisma.notification.create({
    data: {
      type: 'SITE_COMMANDE' as NotifType,
      title: 'Nouvelle commande',
      message: 'Fatima Bouzid (EcoMarket) vient de passer une commande.',
      orderId: cmd4.id,
      createdAt: new Date('2026-06-29T10:20:00'),
    },
  });

  const notif2 = await prisma.notification.create({
    data: {
      type: 'SITE_COMMANDE' as NotifType,
      title: 'Nouvelle commande',
      message: 'Hocine Belkacem (AlgerPos) — commande créée manuellement par Amira.',
      orderId: cmd5.id,
      createdAt: new Date('2026-06-30T08:15:00'),
    },
  });

  const notif3 = await prisma.notification.create({
    data: {
      type: 'SITE_DEVIS' as NotifType,
      title: 'Nouveau devis reçu',
      message: 'Sara Mansouri (BuroPro) demande un devis pour format 60mm.',
      quoteId: dev1.id,
      createdAt: new Date('2026-06-29T14:17:00'),
    },
  });

  // Marquer certaines notifs comme lues pour admin
  await prisma.notificationRead.createMany({
    data: [
      { notificationId: notif1.id, userId: admin.id, read: false },
      { notificationId: notif2.id, userId: admin.id, read: false },
      { notificationId: notif3.id, userId: admin.id, read: false },
      { notificationId: notif1.id, userId: amira.id, read: true, readAt: new Date() },
      { notificationId: notif2.id, userId: amira.id, read: true, readAt: new Date() },
    ],
  });

  console.log('✅ Notifications créées');

  // ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'Commande validée',
        entity: 'COMMANDE' as AuditEntity,
        entityId: cmd1.id,
        orderId: cmd1.id,
        detail: 'Statut changé : EN_ATTENTE → VALIDE',
        createdAt: new Date('2026-06-24T10:00:00'),
      },
      {
        userId: amira.id,
        action: 'Commande créée manuellement',
        entity: 'COMMANDE' as AuditEntity,
        entityId: cmd5.id,
        orderId: cmd5.id,
        detail: 'Source : WhatsApp — AlgerPos, Alger',
        createdAt: new Date('2026-06-30T08:15:00'),
      },
      {
        userId: admin.id,
        action: 'Devis annulé',
        entity: 'DEVIS' as AuditEntity,
        entityId: dev3.id,
        quoteId: dev3.id,
        detail: 'Pas de suite donnée après 2 relances',
        createdAt: new Date('2026-06-20T11:00:00'),
      },
    ],
  });

  console.log('✅ Audit logs créés');
  console.log('');
  console.log('🎉 Seed terminé avec succès !');
  console.log('');
  console.log('   Compte admin → email: admin@psi.dz  |  mdp: password');
  console.log('   Amira        → email: amira@psi.dz  |  mdp: Amira2026!');
  console.log('   Tariq        → email: tariq@psi.dz  |  mdp: Tariq2026!');
}

main()
  .catch((e) => { console.error('❌ Erreur seed :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
