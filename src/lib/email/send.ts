import nodemailer from 'nodemailer';

// Point d'entrée unique pour tout envoi d'email. Le reste du code ne doit
// jamais parler directement à Nodemailer/Gmail — passer par sendEmail()
// permet de migrer vers un autre provider (ex. Resend) sans rien changer
// ailleurs.

let transporter: nodemailer.Transporter | null = null;

// L'entreprise utilise Contact@psi.dz (compte Outlook / Office 365).
// Config SMTP Outlook par défaut ; bascule sur Gmail si SMTP_PROVIDER=gmail.
// Variables .env attendues :
//   SMTP_USER = Contact@psi.dz
//   SMTP_PASS = <mot de passe / mot de passe d'application>
//   SMTP_PROVIDER = outlook (défaut) | gmail
// (les anciennes GMAIL_USER / GMAIL_APP_PASSWORD restent acceptées en repli)
function getTransporter() {
  if (!transporter) {
    const user = process.env.SMTP_USER ?? process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD;
    const provider = (process.env.SMTP_PROVIDER ?? 'outlook').toLowerCase();

    if (provider === 'gmail') {
      transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    } else {
      // Outlook / Office 365 (SMTP STARTTLS sur le port 587)
      transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { ciphers: 'TLSv1.2' },
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
      from: `PSI — Paper Solutions Industry <${fromAddress}>`,
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
