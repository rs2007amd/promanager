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
