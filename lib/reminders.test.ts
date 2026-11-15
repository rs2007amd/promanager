import { describe, expect, it } from "vitest";
import { buildReminderEmail, escapeHtml } from "./reminder-email";
import { daysUntilDue, reminderKindFor } from "./reminders";

const now = new Date(Date.UTC(2026, 10, 13, 15, 0)); // Nov 13, 2026, 3 pm UTC
const due = (day: number) => new Date(Date.UTC(2026, 10, day));

describe("daysUntilDue", () => {
  it("counts whole days and ignores the time of day", () => {
    expect(daysUntilDue(due(16), now)).toBe(3);
    expect(daysUntilDue(due(13), now)).toBe(0);
    expect(daysUntilDue(due(10), now)).toBe(-3);
  });
});

describe("reminderKindFor", () => {
  it("sends the heads-up 1 to 3 days before the due date", () => {
    expect(reminderKindFor(due(16), now)).toBe("BEFORE_DUE");
    expect(reminderKindFor(due(14), now)).toBe("BEFORE_DUE");
  });

  it("sends nothing more than 3 days ahead", () => {
    expect(reminderKindFor(due(17), now)).toBeNull();
  });

  it("sends the due-today reminder on the due date", () => {
    expect(reminderKindFor(due(13), now)).toBe("ON_DUE");
  });

  it("stays quiet for the 2 days after the due date", () => {
    expect(reminderKindFor(due(12), now)).toBeNull();
    expect(reminderKindFor(due(11), now)).toBeNull();
  });

  it("sends the overdue notice 3 to 14 days after the due date", () => {
    expect(reminderKindFor(due(10), now)).toBe("OVERDUE");
    expect(reminderKindFor(new Date(Date.UTC(2026, 9, 30)), now)).toBe("OVERDUE");
  });

  it("ignores charges more than 14 days overdue", () => {
    expect(reminderKindFor(new Date(Date.UTC(2026, 9, 29)), now)).toBeNull();
  });
});

describe("buildReminderEmail", () => {
  const base = {
    tenantName: "Avery Johnson",
    amount: 850,
    monthLabel: "November 2026",
    dueDateLabel: "Nov 16, 2026",
    unitLabel: "Oak Street Apartments, Unit 1A",
    payUrl: "https://example.com/tenant/payments",
  };

  it("writes a friendly heads-up with the amount and link", () => {
    const email = buildReminderEmail({ ...base, kind: "BEFORE_DUE" });
    expect(email.subject).toContain("$850.00");
    expect(email.subject).toContain("Nov 16, 2026");
    expect(email.text).toContain("https://example.com/tenant/payments");
  });

  it("uses different wording for each kind", () => {
    const subjects = (["BEFORE_DUE", "ON_DUE", "OVERDUE"] as const).map(
      (kind) => buildReminderEmail({ ...base, kind }).subject
    );
    expect(new Set(subjects).size).toBe(3);
  });

  it("does not threaten fees in the overdue notice", () => {
    const email = buildReminderEmail({ ...base, kind: "OVERDUE" });
    expect(email.text.toLowerCase()).not.toContain("fee");
    expect(email.text.toLowerCase()).not.toContain("evict");
  });

  it("escapes HTML in names", () => {
    const email = buildReminderEmail({
      ...base,
      kind: "ON_DUE",
      tenantName: "<script>alert(1)</script>",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
    );
  });
});
