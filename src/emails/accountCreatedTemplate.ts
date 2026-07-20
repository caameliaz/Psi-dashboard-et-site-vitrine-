import { wrapEmail } from './shared';

// Deux emails à la création d'un compte utilisateur :
//  1. bienvenue au NOUVEL utilisateur (avec son mot de passe)
//  2. récap aux ADMINS (compte créé)

const ADMIN_URL = process.env.NEXTAUTH_URL ?? 'https://psi-algerie.com';

// ── Email de BIENVENUE au nouvel utilisateur ─────────────────────────────────
export function renderWelcomeEmail(params: {
  name: string; email: string; password: string; role: string;
}): { subject: string; html: string } {
  const { name, email, password, role } = params;
  const roleLabel = role === 'ADMIN' ? 'Administrateur' : 'Employé';

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">Bienvenue chez PSI, ${name} 👋</p>
    <p style="margin:0 0 20px;font-size:13px;color:#8A9BB5">Un compte ${roleLabel} vient d'être créé pour vous sur l'espace d'administration.</p>

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

    <p style="margin:0 0 20px;font-size:12px;color:#8A9BB5">Nous vous conseillons de changer ce mot de passe après votre première connexion, depuis votre profil.</p>

    <a href="${ADMIN_URL}/admin" style="display:inline-block;background:#4CAF4F;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:700">Se connecter →</a>
  `;

  return { subject: 'Bienvenue chez PSI — votre accès à l\'espace admin', html: wrapEmail(body) };
}

// ── Email aux ADMINS : un compte a été créé ──────────────────────────────────
export function renderAccountCreatedAdminEmail(params: {
  name: string; email: string; role: string; createdBy: string;
}): { subject: string; html: string } {
  const { name, email, role, createdBy } = params;
  const roleLabel = role === 'ADMIN' ? 'Administrateur' : 'Employé';

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">Nouveau compte créé</p>
    <p style="margin:0 0 20px;font-size:13px;color:#8A9BB5">${createdBy} a créé un nouveau compte sur l'espace d'administration.</p>

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
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#8A9BB5">Rôle</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#0F172A">${roleLabel}</td>
        </tr>
      </table>
    </div>

    <a href="${ADMIN_URL}/admin/users" style="display:inline-block;background:#4CAF4F;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:700">Voir les utilisateurs →</a>
  `;

  return { subject: `Nouveau compte créé : ${name}`, html: wrapEmail(body) };
}
