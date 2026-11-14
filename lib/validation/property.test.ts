import { describe, expect, it } from "vitest";
import { propertySchema, unitSchema } from "./property";

describe("propertySchema", () => {
  const valid = {
    name: "Oak Street Apartments",
    address: "120 Oak Street",
    city: "Montgomery",
    state: "al",
    zip: "36104",
    propertyType: "Apartment",
  };

  it("accepts a valid property and upper-cases the state", () => {
    const result = propertySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.state).toBe("AL");
  });

  it("rejects a bad ZIP code", () => {
    expect(propertySchema.safeParse({ ...valid, zip: "123" }).success).toBe(false);
  });

  it("rejects an unknown property type", () => {
    expect(
      propertySchema.safeParse({ ...valid, propertyType: "Castle" }).success
    ).toBe(false);
  });
});

describe("unitSchema", () => {
  const valid = {
    unitNumber: "1A",
    bedrooms: "2",
    bathrooms: "1.5",
    monthlyRent: "1050",
  };

  it("converts form strings to numbers", () => {
    const result = unitSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bedrooms).toBe(2);
      expect(result.data.bathrooms).toBe(1.5);
      expect(result.data.monthlyRent).toBe(1050);
    }
  });

  it("rejects zero or empty rent", () => {
    expect(unitSchema.safeParse({ ...valid, monthlyRent: "0" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...valid, monthlyRent: "" }).success).toBe(false);
  });

  it("rejects bathrooms that are not in steps of 0.5", () => {
    expect(unitSchema.safeParse({ ...valid, bathrooms: "1.3" }).success).toBe(false);
  });

  it("rejects non-numbers", () => {
    expect(unitSchema.safeParse({ ...valid, bedrooms: "abc" }).success).toBe(false);
  });
});
