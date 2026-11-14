import { z } from "zod";

const number = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, "Required")
    .transform(Number)
    .pipe(z.number().min(min).max(max));

// "2026-11-01" from a date input becomes midnight UTC
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .transform((s) => new Date(`${s}T00:00:00Z`))
  .pipe(z.date());

export const tenantSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(30, "Too long")
    .transform((v) => (v === "" ? null : v)),
});

export const leaseSchema = z
  .object({
    tenantId: z.string().min(1, "Choose a tenant"),
    unitId: z.string().min(1, "Choose a unit"),
    startDate: dateString,
    endDate: dateString,
    rentAmount: number(1, 100000),
    securityDeposit: number(0, 200000),
    dueDay: number(1, 28).pipe(z.number().int("Whole number")),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const PAYMENT_METHODS = ["cash", "check", "bank transfer", "other"] as const;
