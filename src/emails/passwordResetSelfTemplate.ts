import { wrapEmail } from './shared';

// Email envoyé À L'UTILISATEUR qui a demandé "mot de passe oublié" :
// il reçoit directement un nouveau mot de passe, sans qu'un admin ait à agir.

const ADMIN_URL = process.env.NEXTAUTH_URL ?? 'https://psi-algerie.com';

export function renderPasswordResetSelfEmail(params: {
  name: string; email: string; password: string;
}): { subject: string; html: string } {
  const { name, email, password } = params;

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">Votre nouveau mot de passe</p>
    <p style="margin:0 0 20px;font-size:13px;color:#8A9BB5">Bonjour ${name}, voici votre nouveau mot de passe. L'ancien n'est plus valable.</p>

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

    <p style="margin:0 0 20px;font-size:13px;color:#374151">Vous pouvez le modifier à tout moment depuis votre profil.</p>

    <a href="${ADMIN_URL}/admin" style="display:inline-block;background:#4CAF4F;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:700">Se connecter →</a>

    <p style="margin:20px 0 0;font-size:12px;color:#8A9BB5">Si vous n'êtes pas à l'origine de cette demande, prévenez immédiatement un administrateur : votre mot de passe vient d'être changé.</p>
  `;

  return { subject: 'PSI — votre nouveau mot de passe', html: wrapEmail(body) };
}
