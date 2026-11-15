import { startOfDayUtc } from "./expiry";

export type ReminderKindName = "BEFORE_DUE" | "ON_DUE" | "OVERDUE";

const DAY_MS = 86_400_000;

// Whole days from today (UTC) until the due date. Negative once it has passed.
export function daysUntilDue(dueDate: Date, now = new Date()): number {
  return Math.round((dueDate.getTime() - startOfDayUtc(now).getTime()) / DAY_MS);
}

// Which reminder, if any, a charge should get today.
// - BEFORE_DUE: 1 to 3 days before the due date
// - ON_DUE:     on the due date
// - OVERDUE:    3 to 14 days after the due date (older charges are left alone,
//               so turning this on never emails about very old balances)
// The reminder log makes sure each kind is sent only once per charge.
export function reminderKindFor(
  dueDate: Date,
  now = new Date()
): ReminderKindName | null {
  const days = daysUntilDue(dueDate, now);
  if (days === 0) return "ON_DUE";
  if (days >= 1 && days <= 3) return "BEFORE_DUE";
  if (days <= -3 && days >= -14) return "OVERDUE";
  return null;
}
