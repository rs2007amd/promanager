import { describe, expect, it } from "vitest";
import { firstCharge } from "./leases";

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("firstCharge", () => {
  const today = d(2026, 11, 15);

  it("charges a full month when the lease starts on the 1st", () => {
    const c = firstCharge(
      { startDate: d(2026, 12, 1), endDate: d(2027, 11, 30), rentAmount: 1500, dueDay: 1 },
      today
    );
    expect(c.amount).toBe(1500);
    expect(iso(c.periodMonth)).toBe("2026-12-01");
    expect(iso(c.dueDate)).toBe("2026-12-01");
  });

  it("prorates a mid-month start and makes it due on the start date", () => {
    // Nov 20 to Nov 30 is 11 of 30 days: 1500 * 11 / 30 = 550
    const c = firstCharge(
      { startDate: d(2026, 11, 20), endDate: d(2027, 11, 19), rentAmount: 1500, dueDay: 1 },
      today
    );
    expect(c.amount).toBe(550);
    expect(iso(c.periodMonth)).toBe("2026-11-01");
    expect(iso(c.dueDate)).toBe("2026-11-20");
  });

  it("keeps the usual due day when it comes after the start date", () => {
    const c = firstCharge(
      { startDate: d(2026, 11, 16), endDate: d(2027, 11, 15), rentAmount: 1500, dueDay: 25 },
      today
    );
    expect(iso(c.dueDate)).toBe("2026-11-25");
  });

  it("rounds to whole cents", () => {
    // Dec 10 to Dec 31 is 22 of 31 days: 1234.56 * 22 / 31 = 876.139...
    const c = firstCharge(
      { startDate: d(2026, 12, 10), endDate: d(2027, 12, 9), rentAmount: 1234.56, dueDay: 1 },
      today
    );
    expect(c.amount).toBe(876.14);
  });

  it("handles February and leap years", () => {
    // Feb 15 to Feb 29, 2028 is 15 of 29 days: 2900 * 15 / 29 = 1500
    const c = firstCharge(
      { startDate: d(2028, 2, 15), endDate: d(2029, 2, 14), rentAmount: 2900, dueDay: 1 },
      today
    );
    expect(c.amount).toBe(1500);
  });

  it("only charges for the days covered when the lease also ends that month", () => {
    // Nov 20 to Nov 24 is 5 of 30 days: 3000 * 5 / 30 = 500
    const c = firstCharge(
      { startDate: d(2026, 11, 20), endDate: d(2026, 11, 24), rentAmount: 3000, dueDay: 1 },
      today
    );
    expect(c.amount).toBe(500);
  });

  it("charges this month in full for a lease that began in an earlier month", () => {
    const c = firstCharge(
      { startDate: d(2026, 9, 10), endDate: d(2027, 9, 9), rentAmount: 1500, dueDay: 5 },
      today
    );
    expect(c.amount).toBe(1500);
    expect(iso(c.periodMonth)).toBe("2026-11-01");
    expect(iso(c.dueDate)).toBe("2026-11-05");
  });
});
