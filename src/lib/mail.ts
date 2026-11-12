import "server-only";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Отправляет письмо через Resend, если задан RESEND_API_KEY.
 * Иначе печатает письмо в консоль — так сброс пароля работает локально без почты.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Hyprlyx <no-reply@hyprlyx.com>";

  if (!apiKey) {
    console.log(
      [
        "",
        "─── email not sent: RESEND_API_KEY is missing ───",
        `to:      ${message.to}`,
        `subject: ${message.subject}`,
        "",
        message.text,
        "────────────────────────────────────────────────",
        "",
      ].join("\n")
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend responded ${res.status}: ${body.slice(0, 300)}`);
  }
}
