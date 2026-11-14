"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { FormState } from "@/lib/form-state";
import { generateTempPassword } from "@/lib/passwords";
import { tenantSchema } from "@/lib/validation/tenant-lease";

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

function duplicateEmail(formData: FormData): FormState {
  return {
    error: "Please fix the highlighted fields.",
    fieldErrors: { email: ["An account with this email already exists."] },
    values: toValues(formData),
  };
}

function refresh(tenantId?: string) {
  revalidatePath("/manager/tenants");
  if (tenantId) revalidatePath(`/manager/tenants/${tenantId}`);
}

export async function createTenant(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();

  const parsed = tenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "TENANT",
        tenant: { create: { phone: parsed.data.phone } },
      },
    });
  } catch (e) {
    if (isDuplicate(e)) return duplicateEmail(formData);
    throw e;
  }

  refresh();
  return {
    ok: true,
    message: `Tenant created. Temporary password: ${tempPassword}  Copy it now and share it with the tenant. It is shown only once.`,
  };
}

export async function updateTenant(
  tenantId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();

  const parsed = tenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { userId: true },
  });
  if (!tenant) return { error: "Tenant not found." };

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: tenant.userId },
        data: { name: parsed.data.name, email: parsed.data.email },
      }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: { phone: parsed.data.phone },
      }),
    ]);
  } catch (e) {
    if (isDuplicate(e)) return duplicateEmail(formData);
    throw e;
  }

  refresh(tenantId);
  return { ok: true };
}

export async function resetTenantPassword(
  tenantId: string,
  _prev: FormState
): Promise<FormState> {
  await requireManager();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { userId: true },
  });
  if (!tenant) return { error: "Tenant not found." };

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: tenant.userId },
    data: { passwordHash: await bcrypt.hash(tempPassword, 12) },
  });

  return {
    message: `New temporary password: ${tempPassword}  Copy it now and share it with the tenant. It is shown only once.`,
  };
}

export async function deleteTenant(
  tenantId: string,
  _prev: FormState
): Promise<FormState> {
  await requireManager();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { leases: true, requests: true } } },
  });
  if (!tenant) return { error: "Tenant not found." };

  if (tenant._count.leases > 0 || tenant._count.requests > 0) {
    return {
      error: "This tenant has lease or maintenance history, so it can't be deleted.",
    };
  }

  // Deleting the user also removes the tenant record
  await prisma.user.delete({ where: { id: tenant.userId } });
  refresh();
  redirect("/manager/tenants");
}
