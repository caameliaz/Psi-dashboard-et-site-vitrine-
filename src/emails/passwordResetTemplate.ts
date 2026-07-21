import { wrapEmail } from './shared';

// Deux emails autour de la réinitialisation de mot de passe :
//  1. un utilisateur DEMANDE une réinitialisation  → prévient les admins
//  2. un admin A RÉINITIALISÉ le mot de passe      → envoie le nouveau aux admins

const ADMIN_URL = process.env.NEXTAUTH_URL ?? 'https://psi-algerie.com';

// ── 1. DEMANDE de réinitialisation → aux ADMINS ──────────────────────────────
export function renderPasswordResetRequestEmail(params: {
  name: string; email: string;
}): { subject: string; html: string } {
  const { name, email } = params;

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">Mot de passe réinitialisé</p>
    <p style="margin:0 0 20px;font-size:13px;color:#8A9BB5"><strong style="color:#0F172A">${name}</strong> a demandé un nouveau mot de passe. Il lui a été envoyé automatiquement par email — <strong>aucune action de votre part n'est nécessaire</strong>.</p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8A9BB5;width:120px">Nom</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#0F172A">${name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8A9BB5">Email</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#0F172A">${email}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:12px;color:#8A9BB5">Vous recevez cet email à titre d'information. Si cette demande vous semble suspecte, vous pouvez désactiver le compte depuis l'espace d'administration.</p>

    <a href="${ADMIN_URL}/admin/users" style="display:inline-block;background:#4CAF4F;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:700">Voir les utilisateurs →</a>
  `;

  return { subject: `Mot de passe réinitialisé : ${name}`, html: wrapEmail(body) };
}

// ── 2. Mot de passe RÉINITIALISÉ → aux ADMINS (avec le nouveau mot de passe) ──
export function renderPasswordResetDoneEmail(params: {
  name: string; email: string; password: string; resetBy: string;
}): { subject: string; html: string } {
  const { name, email, password, resetBy } = params;

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">Mot de passe réinitialisé</p>
    <p style="margin:0 0 20px;font-size:13px;color:#8A9BB5">${resetBy} a réinitialisé le mot de passe de <strong style="color:#0F172A">${name}</strong>.</p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:20px">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#8A9BB5">Nouveaux identifiants</p>
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

    <p style="margin:0 0 4px;font-size:13px;color:#374151"><strong>À transmettre à ${name}.</strong></p>
    <p style="margin:0;font-size:12px;color:#8A9BB5">Il pourra ensuite le modifier lui-même depuis son profil.</p>
  `;

  return { subject: `Mot de passe réinitialisé : ${name}`, html: wrapEmail(body) };
}
