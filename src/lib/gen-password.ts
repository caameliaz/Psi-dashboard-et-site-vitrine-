import crypto from 'crypto';

// Mot de passe SIMPLE à retenir : un mot capitalisé + 3 chiffres (ex: "Papier482").
// Même principe que le générateur de la page Utilisateurs, mais utilisable
// côté serveur (réinitialisation automatique). Tirage cryptographique.
const MOTS = [
  'Papier', 'Soleil', 'Bureau', 'Client', 'Facture', 'Rapide', 'Alger', 'Commande',
  'Produit', 'Livraison', 'Modele', 'Projet', 'Devis', 'Ticket', 'Rouleau', 'Carton',
];

export function genPassword(): string {
  const mot = MOTS[crypto.randomInt(0, MOTS.length)];
  const chiffres = String(crypto.randomInt(100, 1000)); // 100-999
  return `${mot}${chiffres}`;
}
