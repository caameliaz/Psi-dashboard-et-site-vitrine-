import { prisma } from './prisma';

// Reporte sur la fiche d'un client EXISTANT les infos saisies à la création d'une commande/d'un
// devis (choix "Enregistrer sur la fiche" du pop-up). Le téléphone est ajouté aux numéros du
// client ; l'email et la commune ne sont remplis que s'ils étaient vides — jamais d'écrasement.
export async function saveInfoToClientProfile<C extends { id: string; email: string | null; commune: string | null }>(
  client: C,
  info: { phone?: string; email?: string | null; commune?: string | null },
): Promise<C> {
  const existingPhones = await prisma.clientPhone.findMany({ where: { clientId: client.id }, select: { number: true } });
  if (info.phone && !existingPhones.some((p) => p.number === info.phone)) {
    await prisma.clientPhone.create({
      data: { clientId: client.id, number: info.phone, label: existingPhones.length === 0 ? 'Principal' : 'Autre', primary: existingPhones.length === 0 },
    });
  }
  const patch: { email?: string; commune?: string } = {};
  if (info.email && !client.email) patch.email = info.email;
  if (info.commune && !client.commune) patch.commune = info.commune;
  if (Object.keys(patch).length === 0) return client;
  return (await prisma.client.update({ where: { id: client.id }, data: patch })) as unknown as C;
}
