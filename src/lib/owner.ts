// Compte « propriétaire » : seul destinataire des e-mails d'alerte réservés aux admins (mots de passe
// réinitialisés…) et seul à voir le journal des connexions. Adresse en minuscules.
export const OWNER_EMAIL = 'cameliamerniz@gmail.com';

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}
