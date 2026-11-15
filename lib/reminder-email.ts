import type { ReminderKindName } from "./reminders";

export type ReminderEmailInput = {
  kind: ReminderKindName;
  tenantName: string;
  amount: number;
  monthLabel: string; // for example "November 2026"
  dueDateLabel: string; // for example "Nov 5, 2026"
  unitLabel: string; // for example "Oak Street Apartments, Unit 1A"
  payUrl: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildReminderEmail(input: ReminderEmailInput) {
  const money = `$${input.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  let subject: string;
  let intro: string;

  if (input.kind === "BEFORE_DUE") {
    subject = `Rent reminder: ${money} due ${input.dueDateLabel}`;
    intro = `Your rent for ${input.monthLabel} (${money}) is due on ${input.dueDateLabel}.`;
  } else if (input.kind === "ON_DUE") {
    subject = `Rent due today: ${money}`;
    intro = `Your rent for ${input.monthLabel} (${money}) is due today.`;
  } else {
    subject = `Rent payment overdue: ${money} for ${input.monthLabel}`;
    intro = `Our records show your rent for ${input.monthLabel} (${money}), which was due on ${input.dueDateLabel}, has not been paid yet. If you have already paid, please let your property manager know.`;
  }

  const text = [
    `Hello ${input.tenantName},`,
    "",
    intro,
    `Home: ${input.unitLabel}`,
    "",
    `Pay online or view your payments: ${input.payUrl}`,
    "",
    "Contact your property manager if you have any questions.",
  ].join("\n");

  const html = `<div style="font-family: Arial, sans-serif; max-width: 520px; line-height: 1.5;">
<p>Hello ${escapeHtml(input.tenantName)},</p>
<p>${escapeHtml(intro)}</p>
<p>Home: ${escapeHtml(input.unitLabel)}</p>
<p><a href="${escapeHtml(input.payUrl)}">Pay online or view your payments</a></p>
<p style="color: #555;">Contact your property manager if you have any questions.</p>
</div>`;

  return { subject, text, html };
}
