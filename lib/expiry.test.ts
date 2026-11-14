import { describe, expect, it } from "vitest";
import { isLeaseExpired, startOfDayUtc } from "./expiry";

const now = new Date(Date.UTC(2026, 10, 12, 15, 30)); // Nov 12, 2026, 3:30 pm UTC

describe("startOfDayUtc", () => {
  it("drops the time of day", () => {
    expect(startOfDayUtc(now).toISOString()).toBe("2026-11-12T00:00:00.000Z");
  });
});

describe("isLeaseExpired", () => {
  it("is expired when the end date was yesterday", () => {
    expect(isLeaseExpired(new Date(Date.UTC(2026, 10, 11)), now)).toBe(true);
  });

  it("is still active on the end date itself", () => {
    expect(isLeaseExpired(new Date(Date.UTC(2026, 10, 12)), now)).toBe(false);
  });

  it("is still active when the end date is in the future", () => {
    expect(isLeaseExpired(new Date(Date.UTC(2026, 10, 13)), now)).toBe(false);
  });
});
