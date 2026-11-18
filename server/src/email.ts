import nodemailer from 'nodemailer';

interface SendResetEmailParams {
  toEmail: string;
  userName: string;
  resetCode: string;
}

export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 4))}${name.slice(-2)}@${domain}`;
}

export async function sendPasswordResetEmail({
  toEmail,
  userName,
  resetCode,
}: SendResetEmailParams): Promise<{ sent: boolean; devCode?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  // If credentials are configured, send the real email via nodemailer
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #e11d48; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">LLANO SELECTA DEALER</h2>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Authorized Cold-Chain POS &amp; Inventory System</p>
          </div>

          <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #9f1239; font-size: 14px; font-weight: 600;">Password Recovery Request</p>
          </div>

          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            We received a request to recover or reset the password for your account associated with <strong>${toEmail}</strong>.
          </p>

          <div style="margin: 28px 0; text-align: center;">
            <span style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #e11d48; background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 14px 32px; border-radius: 12px;">
              ${resetCode}
            </span>
            <p style="color: #64748b; font-size: 12px; margin-top: 10px;">This 6-digit verification code will expire in <strong>15 minutes</strong>.</p>
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            Enter this code in the password recovery modal on the Llano Selecta POS login screen to set a new password.
          </p>

          <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            If you did not request this password recovery, please contact your Dealership Administrator immediately.
          </p>

          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} Llano Selecta Dealer &bull; Sayre Hwy, Valencia City, Bukidnon
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Llano Selecta POS" <${gmailUser}>`,
        to: toEmail,
        subject: `[Llano Selecta POS] Your Verification Code: ${resetCode}`,
        text: `Hello ${userName},\n\nYour password reset verification code is: ${resetCode}\n\nIt expires in 15 minutes.\n\nLlano Selecta POS`,
        html: htmlContent,
      });

      console.log(`[EMAIL] Password reset email sent successfully to ${toEmail}`);
      return { sent: true };
    } catch (err: any) {
      console.error(`[EMAIL ERROR] Failed to send email via SMTP:`, err.message);
      // Fallback to dev/offline handling so user isn't permanently locked out
      return { sent: false, devCode: resetCode };
    }
  }

  // Dev / Offline fallback
  console.log('----------------------------------------------------');
  console.log(`[OFFLINE / DEV MODE] Password reset code for ${toEmail}: ${resetCode}`);
  console.log('To send real emails, set GMAIL_USER and GMAIL_APP_PASSWORD in server/.env');
  console.log('----------------------------------------------------');
  return { sent: false, devCode: resetCode };
}
