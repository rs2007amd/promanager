import { monthStart } from "./dates";

// The first rent charge covers the current month, or the start month
// when the lease begins in a later month.
export function firstChargeMonth(startDate: Date, today = new Date()): Date {
  const currentMonth = monthStart(today);
  const startMonth = monthStart(startDate);
  return startMonth > currentMonth ? startMonth : currentMonth;
}

export function dueDateFor(period: Date, dueDay: number): Date {
  return new Date(
    Date.UTC(period.getUTCFullYear(), period.getUTCMonth(), dueDay)
  );
}

const DAY_MS = 86_400_000;

function daysInMonth(period: Date): number {
  return new Date(
    Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

// The lease's first rent charge.
// - A lease that starts on the 1st, or started before this month, pays a full
//   month, due on its usual due day.
// - A lease that starts partway through the month pays only for the days it
//   covers (start date through the end of the month, or the end date if that
//   comes first), due on the start date or the usual due day, whichever is later.
export function firstCharge(
  lease: { startDate: Date; endDate: Date; rentAmount: number; dueDay: number },
  today = new Date()
): { periodMonth: Date; amount: number; dueDate: Date } {
  const periodMonth = firstChargeMonth(lease.startDate, today);
  const usualDue = dueDateFor(periodMonth, lease.dueDay);

  const startsInPeriod = monthStart(lease.startDate).getTime() === periodMonth.getTime();
  if (!startsInPeriod || lease.startDate.getUTCDate() === 1) {
    return { periodMonth, amount: lease.rentAmount, dueDate: usualDue };
  }

  const total = daysInMonth(periodMonth);
  const lastDayOfMonth = new Date(periodMonth.getTime() + (total - 1) * DAY_MS);
  const lastDay = lease.endDate < lastDayOfMonth ? lease.endDate : lastDayOfMonth;
  const days = Math.round((lastDay.getTime() - lease.startDate.getTime()) / DAY_MS) + 1;

  // Work in cents so the amount is always a whole number of cents
  const amount = Math.round((lease.rentAmount * 100 * days) / total) / 100;
  const dueDate = usualDue > lease.startDate ? usualDue : lease.startDate;

  return { periodMonth, amount, dueDate };
}
