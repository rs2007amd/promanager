// Midnight UTC at the start of the given day
export function startOfDayUtc(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

// A lease is active through its end date and expires the day after
export function isLeaseExpired(endDate: Date, now = new Date()): boolean {
  return endDate < startOfDayUtc(now);
}
