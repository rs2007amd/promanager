import { z } from "zod";

export const PROPERTY_TYPES = [
  "Apartment",
  "Duplex",
  "House",
  "Condo",
  "Townhouse",
  "Other",
] as const;

// Form fields arrive as strings; turn them into numbers with a clear range
const number = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, "Required")
    .transform(Number)
    .pipe(z.number().min(min).max(max));

export const propertySchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(120),
  address: z.string().trim().min(3, "At least 3 characters").max(200),
  city: z.string().trim().min(2, "At least 2 characters").max(100),
  state: z
    .string()
    .trim()
    .length(2, "Use the 2-letter state code, for example AL")
    .transform((s) => s.toUpperCase()),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Use a 5-digit ZIP code"),
  propertyType: z.enum(PROPERTY_TYPES),
});

export const unitSchema = z.object({
  unitNumber: z.string().trim().min(1, "Required").max(20),
  bedrooms: number(0, 20).pipe(z.number().int("Whole number")),
  bathrooms: number(0, 20).pipe(
    z.number().refine((n) => n * 2 === Math.floor(n * 2), "Use steps of 0.5")
  ),
  monthlyRent: number(1, 100000),
});
