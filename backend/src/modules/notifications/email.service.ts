// email.service.ts - service d'envoi d'emails (nodemailer)

import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import logger from '../../utils/logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─────────────────────────────────────────────
// Template helpers
// ─────────────────────────────────────────────

function baseLayout(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a56db; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .footer { background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; padding: 12px 24px; background: #1a56db; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .code { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px 20px; font-family: monospace; font-size: 22px; letter-spacing: 4px; text-align: center; margin: 16px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>GED — Plateforme Documentaire</h1></div>
    <div class="body">${content}</div>
    <div class="footer">&copy; ${new Date().getFullYear()} DSI — Minist&egrave;re de l'&Eacute;ducation Nationale. Email automatique, ne pas r&eacute;pondre.</div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────

export const emailTemplates = {
  welcomeUser: (firstName: string, email: string, tempPassword: string): EmailOptions => ({
    to: email,
    subject: 'Bienvenue sur la Plateforme GED',
    html: baseLayout(
      `<p>Bonjour <strong>${firstName}</strong>,</p>
       <p>Votre compte a été créé sur la Plateforme de Gestion Électronique de Documents.</p>
       <p>Vos identifiants de connexion :</p>
       <p><strong>Email :</strong> ${email}</p>
       <div class="code">${tempPassword}</div>
       <div class="warning">Changez votre mot de passe dès votre première connexion.</div>
       <p>Pour accéder à la plateforme, cliquez ci-dessous :</p>
       <a class="btn" href="${process.env['FRONTEND_URL'] ?? '#'}">Se connecter</a>`,
      'Bienvenue sur la GED'
    ),
    text: `Bienvenue ${firstName}. Email: ${email} | Mot de passe temporaire: ${tempPassword}`,
  }),

  loginAlert: (email: string, ipAddress: string): EmailOptions => ({
    to: email,
    subject: 'Nouvelle connexion détectée sur votre compte',
    html: baseLayout(
      `<p>Une nouvelle connexion à votre compte GED a été détectée.</p>
       <p><strong>Adresse IP :</strong> ${ipAddress}</p>
       <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
       <div class="warning">Si vous n'êtes pas à l'origine de cette connexion, contactez immédiatement l'administrateur.</div>`,
      'Alerte de connexion'
    ),
    text: `Nouvelle connexion depuis ${ipAddress} le ${new Date().toLocaleString('fr-FR')}`,
  }),

  accountLocked: (email: string, unlockAt: Date): EmailOptions => ({
    to: email,
    subject: 'Compte temporairement verrouillé',
    html: baseLayout(
      `<p>Votre compte a été temporairement verrouillé suite à plusieurs tentatives de connexion échouées.</p>
       <p>Réessayez après : <strong>${unlockAt.toLocaleString('fr-FR')}</strong></p>
       <div class="warning">Si vous n'êtes pas à l'origine de ces tentatives, contactez l'administrateur.</div>`,
      'Compte verrouillé'
    ),
    text: `Compte verrouillé jusqu'au ${unlockAt.toLocaleString('fr-FR')}`,
  }),

  documentApproved: (to: string, documentTitle: string): EmailOptions => ({
    to,
    subject: `Document approuvé : ${documentTitle}`,
    html: baseLayout(
      `<p>Votre document a été <strong style="color:#059669">approuvé</strong>.</p>
       <p><strong>Titre :</strong> ${documentTitle}</p>
       <p>Connectez-vous à la plateforme pour consulter votre document.</p>
       <a class="btn" href="${process.env['FRONTEND_URL'] ?? '#'}">Voir le document</a>`,
      'Document approuvé'
    ),
    text: `Votre document "${documentTitle}" a été approuvé.`,
  }),

  documentRejected: (to: string, documentTitle: string, reason: string): EmailOptions => ({
    to,
    subject: `Document rejeté : ${documentTitle}`,
    html: baseLayout(
      `<p>Votre document a été <strong style="color:#dc2626">rejeté</strong>.</p>
       <p><strong>Titre :</strong> ${documentTitle}</p>
       <p><strong>Motif :</strong> ${reason}</p>
       <p>Veuillez corriger le document et le soumettre à nouveau.</p>
       <a class="btn" href="${process.env['FRONTEND_URL'] ?? '#'}">Modifier le document</a>`,
      'Document rejeté'
    ),
    text: `Votre document "${documentTitle}" a été rejeté. Motif : ${reason}`,
  }),

  workflowSubmitted: (to: string, documentTitle: string, submitter: string): EmailOptions => ({
    to,
    subject: `Document soumis pour validation : ${documentTitle}`,
    html: baseLayout(
      `<p>Un document a été soumis pour votre validation :</p>
       <p><strong>Titre :</strong> ${documentTitle}</p>
       <p><strong>Soumis par :</strong> ${submitter}</p>
       <a class="btn" href="${process.env['FRONTEND_URL'] ?? '#'}">Examiner le document</a>`,
      'Document soumis'
    ),
    text: `Document "${documentTitle}" soumis par ${submitter} — en attente de validation.`,
  }),

  mfaCode: (to: string, code: string): EmailOptions => ({
    to,
    subject: 'Code de vérification MFA',
    html: baseLayout(
      `<p>Votre code de vérification :</p>
       <div class="code">${code}</div>
       <div class="warning">Ce code expire dans 5 minutes. Ne le partagez avec personne.</div>`,
      'Code MFA'
    ),
    text: `Votre code MFA : ${code} (valable 5 minutes)`,
  }),

  passwordReset: (to: string, resetUrl: string, firstName?: string): EmailOptions => ({
    to,
    subject: 'Réinitialisation de votre mot de passe',
    html: baseLayout(
      `<p>Bonjour${firstName ? ` <strong>${firstName}</strong>` : ''},</p>
       <p>Vous avez demandé la réinitialisation de votre mot de passe sur la Plateforme GED.</p>
       <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
       <a class="btn" href="${resetUrl}">Réinitialiser mon mot de passe</a>
       <div class="warning">Ce lien expire dans <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</div>
       <p style="font-size:12px;color:#6b7280;margin-top:16px;">Lien direct : ${resetUrl}</p>`,
      'Réinitialisation du mot de passe'
    ),
    text: `Réinitialisez votre mot de passe : ${resetUrl} (valable 1 heure)`,
  }),
};

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

class EmailService {
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private initialized = false;

  private init(): boolean {
    if (this.initialized) return this.transporter !== null;

    const smtpHost = process.env['SMTP_HOST'];
    const smtpPort = parseInt(process.env['SMTP_PORT'] ?? '587', 10);
    const smtpUser = process.env['SMTP_USER'] || undefined;
    const smtpPass = process.env['SMTP_PASSWORD'] || process.env['SMTP_PASS'] || undefined;

    if (!smtpHost) {
      logger.warn('[Email] SMTP non configuré (SMTP_HOST manquant) — les emails seront loggués uniquement');
      this.initialized = true;
      return false;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        tls: { rejectUnauthorized: process.env['NODE_ENV'] === 'production' },
      });

      this.initialized = true;
      logger.info('[Email] Service SMTP initialisé');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[Email] Échec d\'initialisation SMTP', { error: message });
      this.initialized = true;
      return false;
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const isReady = this.init();
    const fromName = process.env['SMTP_FROM_NAME'] ?? 'GED Platform';
    const fromEmail = process.env['SMTP_FROM_EMAIL'] ?? process.env['SMTP_USER'] ?? 'noreply@ged.gov.ma';
    const from = `"${fromName}" <${fromEmail}>`;

    if (!isReady || !this.transporter) {
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      logger.info(`[Email] (DEV) To: ${recipients} | Subject: ${options.subject}`);
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`[Email] Envoyé — MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[Email] Échec d\'envoi', { error: message, subject: options.subject });
      return { success: false, error: message };
    }
  }

  async sendMany(emails: EmailOptions[]): Promise<EmailResult[]> {
    return Promise.all(emails.map((e) => this.send(e)));
  }

  async verify(): Promise<boolean> {
    if (!this.init() || !this.transporter) return false;
    try {
      await this.transporter.verify();
      logger.info('[Email] Connexion SMTP vérifiée');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[Email] Vérification SMTP échouée', { error: message });
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;
