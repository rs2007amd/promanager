import { describe, expect, it } from "vitest";
import { monthStart } from "./dates";

describe("monthStart", () => {
  it("returns midnight UTC on the first day of the month", () => {
    const result = monthStart(new Date(Date.UTC(2026, 10, 17, 15, 30)));
    expect(result.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("handles December correctly", () => {
    const result = monthStart(new Date(Date.UTC(2026, 11, 31, 23, 59)));
    expect(result.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});
