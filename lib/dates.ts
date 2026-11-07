// Always the 1st of the month at 00:00 UTC, so lookups match exactly
export function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
