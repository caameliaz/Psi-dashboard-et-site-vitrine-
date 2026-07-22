import { wrapEmail } from './shared';

// Email envoyé à chaque connexion admin : code à 6 chiffres à saisir en plus
// du mot de passe (2FA). Valable 5 minutes, usage unique.

export function renderTwoFactorCodeEmail(params: {
  name: string; code: string;
}): { subject: string; html: string } {
  const { name, code } = params;

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0F172A">Votre code de connexion</p>
    <p style="margin:0 0 20px;font-size:13px;color:#8A9BB5">Bonjour ${name}, voici votre code de vérification pour vous connecter au dashboard PSI.</p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:22px;margin-bottom:20px;text-align:center">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8A9BB5">Code de vérification</p>
      <p style="margin:0;font-size:32px;font-weight:800;color:#0F172A;letter-spacing:8px;font-family:monospace">${code}</p>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#374151">Ce code expire dans <strong>5 minutes</strong> et ne peut être utilisé qu'une seule fois.</p>
    <p style="margin:20px 0 0;font-size:12px;color:#8A9BB5">Si vous n'êtes pas à l'origine de cette tentative de connexion, changez votre mot de passe immédiatement et prévenez un administrateur.</p>
  `;

  return { subject: `PSI — votre code de connexion : ${code}`, html: wrapEmail(body) };
}
