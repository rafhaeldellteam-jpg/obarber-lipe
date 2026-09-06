import nodemailer from "nodemailer";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://obarber-lipe.vercel.app";

export const siteUrl = SITE_URL;

let transporter: Awaited<ReturnType<typeof nodemailer.createTransport>> | null =
  null;

function getTransporter(): typeof transporter {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export function emailConfigured(): boolean {
  return getTransporter() !== null;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(
      "[email] SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS). E-mail não enviado:",
      options.subject
    );
    return false;
  }
  try {
    await transport.sendMail({
      from:
        process.env.SMTP_FROM ||
        `Obarber Lipe <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (err) {
    console.error("[email] Falha ao enviar:", (err as Error).message);
    return false;
  }
}

/** Envolve o conteúdo em um template HTML com a identidade da barbearia. */
export function emailTemplate(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#171717;border-radius:20px;border:1px solid #2a2a2a;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:24px;text-align:center;">
                <h1 style="margin:0;color:#0a0a0a;font-size:22px;letter-spacing:1px;">OBARBER LIPE</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;color:#e5e5e5;font-size:15px;line-height:1.6;">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;border-top:1px solid #2a2a2a;color:#737373;font-size:12px;text-align:center;">
                Você recebeu este e-mail porque é cliente da Obarber Lipe.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buttonHtml(url: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#f59e0b,#f97316);">
          <a href="${url}" style="display:inline-block;padding:14px 32px;color:#0a0a0a;font-weight:bold;font-size:15px;text-decoration:none;border-radius:12px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}
