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
  return Boolean(process.env.BREVO_API_KEY) || getTransporter() !== null;
}

/** Remetente: "Nome <email>" → email puro (a API do Brevo quer separado). */
function senderEmail(): string {
  const raw = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  const m = raw.match(/<([^>]+)>/);
  return m ? m[1] : raw;
}

/**
 * Envio via API HTTP do Brevo. É o caminho preferido em serverless:
 * conexões SMTP diretas sofrem falhas de DNS (EBUSY) nas lambdas da
 * Vercel, enquanto HTTPS passa pelo mesmo canal das demais chamadas.
 */
async function sendViaBrevoApi(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY ?? "",
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Obarber Lipe", email: senderEmail() },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 200)}`);
  }
  return true;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const useApi = Boolean(process.env.BREVO_API_KEY);
  const transport = getTransporter();
  if (!useApi && !transport) {
    console.warn(
      "[email] Envio não configurado (BREVO_API_KEY ou SMTP_*). E-mail não enviado:",
      options.subject
    );
    return false;
  }

  // Erros transitórios de rede/DNS merecem retry — a falha não é de configuração.
  const TRANSIENT = /EBUSY|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket|network|fetch failed/i;

  const attempt = async (): Promise<boolean> => {
    if (useApi) return await sendViaBrevoApi(options);
    await transport!.sendMail({
      from:
        process.env.SMTP_FROM ||
        `Obarber Lipe <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  };

  for (let i = 0; i < 3; i++) {
    try {
      return await attempt();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const isLast = i === 2;
      console.error(
        `[email] Falha ao enviar (tentativa ${i + 1}/3):`,
        msg
      );
      if (isLast || !TRANSIENT.test(msg)) return false;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  return false;
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
