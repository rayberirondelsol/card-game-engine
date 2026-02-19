import nodemailer from 'nodemailer';

export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendConfirmationEmail(to, token) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const confirmUrl = `${appUrl}/auth/confirm?token=${token}`;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const transporter = createTransport();
  await transporter.sendMail({
    from,
    to,
    subject: 'Card Game Engine – E-Mail-Adresse bestätigen',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0e7490; margin-bottom: 8px;">Registrierung bestätigen</h2>
        <p style="color: #374151;">Bitte klicke auf den folgenden Link, um deine E-Mail-Adresse zu bestätigen:</p>
        <a href="${confirmUrl}"
           style="display:inline-block; margin: 20px 0; padding: 12px 24px; background:#0e7490; color:#fff; border-radius:8px; text-decoration:none; font-weight:600;">
          E-Mail bestätigen
        </a>
        <p style="color: #6b7280; font-size: 13px;">
          Der Link ist 24 Stunden gültig.<br>
          Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
        </p>
        <hr style="border-color:#e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Card Game Engine</p>
      </div>
    `,
    text: `Bitte bestätige deine E-Mail-Adresse:\n\n${confirmUrl}\n\nDer Link ist 24 Stunden gültig.`,
  });
}
