import { describe, expect, it } from "vitest";
import { generateTempPassword } from "../passwords";
import { dueDateFor, firstChargeMonth } from "../leases";
import { leaseSchema, tenantSchema } from "./tenant-lease";

describe("tenantSchema", () => {
  it("normalises the email and turns an empty phone into null", () => {
    const result = tenantSchema.safeParse({
      name: "Pat Doe",
      email: "  Pat@Example.COM ",
      phone: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("pat@example.com");
      expect(result.data.phone).toBeNull();
    }
  });

  it("rejects an invalid email", () => {
    expect(
      tenantSchema.safeParse({ name: "Pat Doe", email: "nope", phone: "" }).success
    ).toBe(false);
  });
});

describe("leaseSchema", () => {
  const valid = {
    tenantId: "t1",
    unitId: "u1",
    startDate: "2026-11-01",
    endDate: "2027-11-01",
    rentAmount: "1050",
    securityDeposit: "1050",
    dueDay: "1",
  };

  it("converts dates and numbers", () => {
    const result = leaseSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate.toISOString()).toBe("2026-11-01T00:00:00.000Z");
      expect(result.data.rentAmount).toBe(1050);
      expect(result.data.dueDay).toBe(1);
    }
  });

  it("rejects an end date before the start date", () => {
    expect(
      leaseSchema.safeParse({ ...valid, endDate: "2026-10-01" }).success
    ).toBe(false);
  });

  it("rejects a due day after the 28th", () => {
    expect(leaseSchema.safeParse({ ...valid, dueDay: "31" }).success).toBe(false);
  });

  it("rejects a missing tenant", () => {
    expect(leaseSchema.safeParse({ ...valid, tenantId: "" }).success).toBe(false);
  });
});

describe("firstChargeMonth", () => {
  const today = new Date(Date.UTC(2026, 10, 12));

  it("uses the current month when the lease already started", () => {
    const result = firstChargeMonth(new Date(Date.UTC(2026, 4, 1)), today);
    expect(result.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("uses the start month when the lease starts later", () => {
    const result = firstChargeMonth(new Date(Date.UTC(2027, 0, 15)), today);
    expect(result.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("dueDateFor", () => {
  it("puts the due day inside the charge month", () => {
    const period = new Date(Date.UTC(2026, 10, 1));
    expect(dueDateFor(period, 5).toISOString()).toBe("2026-11-05T00:00:00.000Z");
  });
});

describe("generateTempPassword", () => {
  it("makes a 12-character password that differs each time", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).toHaveLength(12);
    expect(a).not.toBe(b);
  });
});
