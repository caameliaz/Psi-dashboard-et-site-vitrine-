import { wrapEmail } from './shared';
import { OWNER_EMAIL } from '../lib/owner';

// E-mail « erreur résolue » : envoyé MANUELLEMENT (par la propriétaire du compte seulement) à un utilisateur
// qui n'arrivait pas à se connecter à cause d'une erreur de notre côté — avec un nouveau mot de passe.

const ADMIN_URL = process.env.NEXTAUTH_URL ?? 'https://psi-algerie.com';

export function renderLoginFixEmail(params: {
  name: string; email: string; password: string;
}): { subject: string; html: string } {
  const { name, email, password } = params;

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">Problème de connexion résolu ✅</p>
    <p style="margin:0 0 20px;font-size:13px;color:#8A9BB5">Bonjour ${name}, vous avez rencontré une erreur à la connexion (« identifiant ou mot de passe incorrect »). Elle venait de notre côté et vient d'être corrigée. Veuillez-nous en excuser.</p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:20px">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#8A9BB5">Vos identifiants</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8A9BB5;width:120px">Email</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#0F172A">${email}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8A9BB5">Mot de passe</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#0F172A;font-family:monospace">${password}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:12px;color:#8A9BB5">Ce mot de passe remplace les précédents. Après l'avoir saisi, vous recevrez un code à 6 chiffres par e-mail (valable 5 minutes) : saisissez-le pour terminer la connexion. Vous pourrez ensuite modifier votre mot de passe depuis votre profil.</p>

    <p style="margin:0 0 20px;font-size:13px;font-weight:600;color:#0F172A">Merci de réessayer de vous connecter dès maintenant. En cas de problème, contactez <a href="mailto:${OWNER_EMAIL}" style="color:#166534;font-weight:700">${OWNER_EMAIL}</a>.</p>

    <a href="${ADMIN_URL}/admin" style="display:inline-block;background:#4CAF4F;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:700">Se connecter →</a>
  `;

  return { subject: 'PSI — Problème de connexion résolu : votre mot de passe', html: wrapEmail(body) };
}
