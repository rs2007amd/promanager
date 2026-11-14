"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { FormState } from "@/lib/form-state";
import { propertySchema, unitSchema } from "@/lib/validation/property";

function toValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

function invalid(formData: FormData, error: z.ZodError): FormState {
  return {
    error: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors,
    values: toValues(formData),
  };
}

function isDuplicate(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

const DUPLICATE_UNIT = {
  error: "Please fix the highlighted fields.",
  fieldErrors: { unitNumber: ["That unit number already exists in this property."] },
};

function refresh(propertyId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/properties");
  if (propertyId) revalidatePath(`/manager/properties/${propertyId}`);
}

// ---------- Properties ----------

export async function createProperty(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();

  const parsed = propertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const property = await prisma.property.create({ data: parsed.data });
  refresh();
  redirect(`/manager/properties/${property.id}`);
}

export async function updateProperty(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();

  const parsed = propertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const exists = await prisma.property.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { error: "Property not found." };

  await prisma.property.update({ where: { id }, data: parsed.data });
  refresh(id);
  return { ok: true };
}

export async function deleteProperty(id: string, _prev: FormState): Promise<FormState> {
  await requireManager();

  const exists = await prisma.property.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { error: "Property not found." };

  // Units with leases or maintenance history must be kept for the records
  const withHistory = await prisma.unit.count({
    where: {
      propertyId: id,
      OR: [{ leases: { some: {} } }, { requests: { some: {} } }],
    },
  });
  if (withHistory > 0) {
    return {
      error: `${withHistory} unit(s) have lease or maintenance history, so this property can't be deleted.`,
    };
  }

  // Remaining units have no history and are removed with the property
  await prisma.property.delete({ where: { id } });
  refresh();
  redirect("/manager/properties");
}

// ---------- Units ----------

export async function createUnit(
  propertyId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();

  const parsed = unitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });
  if (!property) return { error: "Property not found." };

  try {
    await prisma.unit.create({ data: { ...parsed.data, propertyId } });
  } catch (e) {
    if (isDuplicate(e)) return { ...DUPLICATE_UNIT, values: toValues(formData) };
    throw e;
  }

  refresh(propertyId);
  return { ok: true };
}

export async function updateUnit(
  unitId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();

  const parsed = unitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true },
  });
  if (!unit) return { error: "Unit not found." };

  try {
    await prisma.unit.update({ where: { id: unitId }, data: parsed.data });
  } catch (e) {
    if (isDuplicate(e)) return { ...DUPLICATE_UNIT, values: toValues(formData) };
    throw e;
  }

  refresh(unit.propertyId);
  redirect(`/manager/properties/${unit.propertyId}`);
}

export async function deleteUnit(
  propertyId: string,
  unitId: string,
  _prev: FormState
): Promise<FormState> {
  await requireManager();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, propertyId },
    include: { _count: { select: { leases: true, requests: true } } },
  });
  if (!unit) return { error: "Unit not found." };

  if (unit._count.leases > 0 || unit._count.requests > 0) {
    return {
      error: "This unit has lease or maintenance history, so it can't be deleted.",
    };
  }

  await prisma.unit.delete({ where: { id: unitId } });
  refresh(propertyId);
  redirect(`/manager/properties/${propertyId}`);
}
