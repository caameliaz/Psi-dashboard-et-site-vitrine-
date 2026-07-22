import nodemailer from 'nodemailer';

// Point d'entrée unique pour tout envoi d'email. Le reste du code ne doit
// jamais parler directement à Nodemailer/Gmail — passer par sendEmail()
// permet de migrer vers un autre provider (ex. Resend) sans rien changer
// ailleurs.

let transporter: nodemailer.Transporter | null = null;

// La boîte Contact@psi.dz est hébergée chez ICOSNET (cPanel), PAS chez Microsoft.
// (vérifié : le MX de psi.dz pointe vers 197.140.11.7 et le SPF n'autorise que cette IP)
//
// Variables .env attendues :
//   SMTP_USER = contact@psi.dz
//   SMTP_PASS = <mot de passe de la boîte (réinitialisable depuis cPanel)>
//   SMTP_HOST = mail.psi.dz        (serveur sortant indiqué par cPanel)
//   SMTP_PORT = 465                (465 = SSL direct · 587 = STARTTLS)
//   SMTP_PROVIDER = cpanel (défaut) | brevo | outlook | gmail
// (les anciennes GMAIL_USER / GMAIL_APP_PASSWORD restent acceptées en repli)
//
// ⚠️ BREVO : Icosnet (mail.psi.dz) REFUSE le relais depuis les serveurs Vercel
// (erreur 550 "authorization failed" sur MAIL FROM — l'IP n'est pas autorisée).
// On passe donc par Brevo, qui accepte les envois depuis n'importe où.
// L'expéditeur affiché reste Contact@psi.dz (à valider dans Brevo).
function getTransporter() {
  if (!transporter) {
    const user = process.env.SMTP_USER ?? process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD;
    const provider = (process.env.SMTP_PROVIDER ?? 'cpanel').toLowerCase();

    if (provider === 'gmail') {
      transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    } else if (provider === 'outlook') {
      // Outlook / Office 365 (STARTTLS sur le port 587)
      transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { ciphers: 'TLSv1.2' },
      });
    } else if (provider === 'brevo') {
      // Brevo (ex-Sendinblue) — service d'envoi, fonctionne depuis n'importe quelle IP.
      // SMTP_USER = l'identifiant SMTP Brevo · SMTP_PASS = la clé SMTP Brevo
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: false, // Brevo utilise STARTTLS sur le port 587
        auth: { user, pass },
      });
    } else {
      // cPanel / Icosnet — hôte et port pilotés par le .env pour pouvoir
      // basculer 465 (SSL) <-> 587 (STARTTLS) sans retoucher au code.
      const host = process.env.SMTP_HOST ?? 'mail.psi.dz';
      const port = Number(process.env.SMTP_PORT ?? 465);
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = connexion chiffrée d'emblée ; 587 = STARTTLS
        auth: { user, pass },
      });
    }
  }
  return transporter;
}

function smtpConfigured() {
  return Boolean((process.env.SMTP_USER ?? process.env.GMAIL_USER) && (process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD));
}

export interface SendEmailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  // Optionnel — pour les images inline (cid) type logo, pas besoin d'URL publique.
  attachments?: SendEmailAttachment[];
}

export type SendEmailResult =
  | { success: true }
  | { success: false; error: string };

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailParams): Promise<SendEmailResult> {
  if (!smtpConfigured()) {
    return { success: false, error: 'Configuration email manquante (SMTP_USER / SMTP_PASS)' };
  }
  if (!to || !subject || (!html && !text)) {
    return { success: false, error: 'Champs requis manquants (to, subject, html/text)' };
  }

  try {
    // Expéditeur affiché = adresse officielle de l'entreprise (EMAIL_FROM),
    // par défaut Contact@psi.dz. Le compte technique qui envoie réellement reste
    // GMAIL_USER. Idéalement GMAIL_USER = Contact@psi.dz (compte Workspace) pour
    // que l'envoi parte VRAIMENT de cette adresse sans mention "via".
    const fromAddress = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'Contact@psi.dz';
    await getTransporter().sendMail({
      from: `PSI Paper Solutions Industry <${fromAddress}>`, // sans caractère spécial (mieux accepté par les serveurs)
      to,
      subject,
      html,
      text,
      attachments,
    });
    return { success: true };
  } catch (error) {
    console.error('[sendEmail] Échec de l\'envoi:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}
