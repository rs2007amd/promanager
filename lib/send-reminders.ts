import { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { startOfDayUtc } from "@/lib/expiry";
import { buildReminderEmail } from "@/lib/reminder-email";
import { reminderKindFor } from "@/lib/reminders";
import { prisma } from "@/lib/prisma";

const DAY_MS = 86_400_000;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" });
const fmtMonth = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// Emails tenants about rent that is coming due, due today, or overdue.
// Safe to run repeatedly: each kind of reminder is sent once per charge.
export async function sendReminders(now = new Date()) {
  const today = startOfDayUtc(now);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      lease: { status: "ACTIVE" },
      // Wide enough for every reminder kind (3 days ahead to 14 days back)
      dueDate: {
        gte: new Date(today.getTime() - 14 * DAY_MS),
        lte: new Date(today.getTime() + 3 * DAY_MS),
      },
    },
    include: {
      reminders: { select: { kind: true } },
      lease: {
        include: {
          tenant: { include: { user: { select: { name: true, email: true } } } },
          unit: { include: { property: { select: { name: true } } } },
        },
      },
    },
  });

  const result = { checked: payments.length, sent: 0, alreadySent: 0, notConfigured: 0, failed: 0 };

  for (const payment of payments) {
    const kind = reminderKindFor(payment.dueDate, now);
    if (!kind) continue;

    if (payment.reminders.some((r) => r.kind === kind)) {
      result.alreadySent++;
      continue;
    }

    // Claim this reminder first. The unique constraint means that if two runs
    // overlap, only one of them gets to send the email.
    try {
      await prisma.reminderLog.create({ data: { paymentId: payment.id, kind } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        result.alreadySent++;
        continue;
      }
      throw e;
    }

    const { tenant, unit } = payment.lease;
    const email = buildReminderEmail({
      kind,
      tenantName: tenant.user.name,
      amount: Number(payment.amount),
      monthLabel: fmtMonth(payment.periodMonth),
      dueDateLabel: fmtDate(payment.dueDate),
      unitLabel: `${unit.property.name}, Unit ${unit.unitNumber}`,
      payUrl: `${baseUrl}/tenant/payments`,
    });

    try {
      const { sent } = await sendEmail({ to: tenant.user.email, ...email });
      if (sent) {
        result.sent++;
      } else {
        // Email isn't set up yet: release the claim so it is tried again later
        await prisma.reminderLog.deleteMany({ where: { paymentId: payment.id, kind } });
        result.notConfigured++;
      }
    } catch {
      // Sending failed: release the claim so the next run retries
      await prisma.reminderLog.deleteMany({ where: { paymentId: payment.id, kind } });
      result.failed++;
    }
  }

  return result;
}
