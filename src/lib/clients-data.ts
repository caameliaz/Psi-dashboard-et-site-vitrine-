export interface ClientRecord {
  id: number;
  entreprise: string;
  contact: string;
  telephone: string;
  wilaya: string;
  adresse: string;
  email: string;
  photo?: string;
  commandes: number;
  devis: number;
  derniere: string;
  historique: Array<{
    ref: string;
    type: 'Commande' | 'Devis';
    date: string;
    statut: string;
    montant: string;
    produits: string;
  }>;
}

export const clientsData: ClientRecord[] = [
  {
    id: 1, entreprise: 'TechAlger', contact: 'Ahmed Benali',
    telephone: '+213 555 001 001', wilaya: 'Alger', adresse: 'Rue Didouche Mourad, Alger Centre',
    email: 'a.benali@techalger.dz', commandes: 12, devis: 2, derniere: '24/06/2026',
    historique: [
      { ref: 'CMD-001', type: 'Commande', date: '24/06/2026', statut: 'Validé', montant: '54 000 DA', produits: '80/80 × 50, 57/40 × 30' },
      { ref: 'CMD-002', type: 'Commande', date: '10/06/2026', statut: 'Validé', montant: '32 500 DA', produits: '57/50 × 40' },
      { ref: 'DEV-001', type: 'Devis', date: '01/06/2026', statut: 'En attente', montant: 'Sur devis', produits: '112/50 × 200 (spécial)' },
    ],
  },
  {
    id: 2, entreprise: 'BuroPro', contact: 'Sara Mansouri',
    telephone: '+213 555 002 002', wilaya: 'Oran', adresse: 'Bd Millénium, Oran',
    email: 's.mansouri@buropro.dz', commandes: 5, devis: 3, derniere: '23/06/2026',
    historique: [
      { ref: 'CMD-010', type: 'Commande', date: '23/06/2026', statut: 'En attente', montant: '18 000 DA', produits: '57/40 × 20, 80/70 × 15' },
      { ref: 'DEV-005', type: 'Devis', date: '15/06/2026', statut: 'Contacté', montant: 'Sur devis', produits: 'Format personnalisé 60mm' },
    ],
  },
  {
    id: 3, entreprise: 'AlgéroShop', contact: 'Karim Hadji',
    telephone: '+213 555 003 003', wilaya: 'Constantine', adresse: 'Zone Commerciale Ain Smara, Constantine',
    email: 'k.hadji@algeroshop.dz', commandes: 8, devis: 1, derniere: '22/06/2026',
    historique: [
      { ref: 'CMD-020', type: 'Commande', date: '22/06/2026', statut: 'Contacté', montant: '27 200 DA', produits: '80/80 × 30, 76/70 × 10' },
      { ref: 'CMD-021', type: 'Commande', date: '05/06/2026', statut: 'Validé', montant: '15 600 DA', produits: '57/50 × 20' },
    ],
  },
  {
    id: 4, entreprise: 'MegaDist', contact: 'Nadia Berber',
    telephone: '+213 555 004 004', wilaya: 'Annaba', adresse: 'Zone Industrielle El Hadjar, Annaba',
    email: 'n.berber@megadist.dz', commandes: 3, devis: 0, derniere: '21/06/2026',
    historique: [
      { ref: 'CMD-030', type: 'Commande', date: '21/06/2026', statut: 'Annulé', montant: '9 000 DA', produits: '57/40 × 10' },
    ],
  },
  {
    id: 5, entreprise: 'PrintPlus', contact: 'Mohamed Ziani',
    telephone: '+213 555 005 005', wilaya: 'Blida', adresse: 'Cité Bouarfa, Blida',
    email: 'm.ziani@printplus.dz', commandes: 17, devis: 4, derniere: '20/06/2026',
    historique: [
      { ref: 'CMD-040', type: 'Commande', date: '20/06/2026', statut: 'Validé', montant: '73 500 DA', produits: '112/50 × 60, 80/80 × 40' },
      { ref: 'DEV-010', type: 'Devis', date: '12/06/2026', statut: 'Validé', montant: '45 000 DA', produits: 'Lot 500 rouleaux 80/80' },
      { ref: 'CMD-041', type: 'Commande', date: '01/06/2026', statut: 'Validé', montant: '28 000 DA', produits: '76/70 × 30' },
    ],
  },
  {
    id: 6, entreprise: 'EcoMarket', contact: 'Fatima Bouzid',
    telephone: '+213 555 006 006', wilaya: 'Sétif', adresse: 'Centre Commercial Ain Arnat, Sétif',
    email: 'f.bouzid@ecomarket.dz', commandes: 6, devis: 1, derniere: '19/06/2026',
    historique: [
      { ref: 'CMD-050', type: 'Commande', date: '19/06/2026', statut: 'Validé', montant: '21 600 DA', produits: '57/40 × 24, 57/50 × 12' },
      { ref: 'DEV-015', type: 'Devis', date: '10/06/2026', statut: 'En attente', montant: 'Sur devis', produits: 'Commande annuelle personnalisée' },
    ],
  },
];
