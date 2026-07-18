import nodemailer from 'nodemailer';

// Point d'entrée unique pour tout envoi d'email. Le reste du code ne doit
// jamais parler directement à Nodemailer/Gmail — passer par sendEmail()
// permet de migrer vers un autre provider (ex. Resend) sans rien changer
// ailleurs.

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
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
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return { success: false, error: 'Configuration email manquante (GMAIL_USER / GMAIL_APP_PASSWORD)' };
  }
  if (!to || !subject || (!html && !text)) {
    return { success: false, error: 'Champs requis manquants (to, subject, html/text)' };
  }

  try {
    await getTransporter().sendMail({
      from: `PSI — Paper Solutions Industry <${process.env.GMAIL_USER}>`,
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
