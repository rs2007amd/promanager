export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

// Sends through Resend's HTTP API. With no RESEND_API_KEY it only logs, so
// the app and the tests can run safely without a mail account.
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[email NOT sent, RESEND_API_KEY is not set] to=${message.to} subject="${message.subject}"`
    );
    return { sent: false };
  }

  const from = process.env.EMAIL_FROM || "PropManager <onboarding@resend.dev>";
  

  const response = await fetch("https://api.resend.com/emails", {
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

  if (!response.ok) {
    throw new Error(`Email provider returned status ${response.status}`);
  }

  return { sent: true };
}
