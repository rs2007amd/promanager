"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManager } from "@/lib/authz";
import { monthStart } from "@/lib/dates";
import { dueDateFor, firstChargeMonth } from "@/lib/leases";
import { prisma } from "@/lib/prisma";
import type { FormState } from "@/lib/form-state";
import { PAYMENT_METHODS, leaseSchema } from "@/lib/validation/tenant-lease";

function toValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

function refresh(leaseId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/leases");
  revalidatePath("/manager/tenants");
  revalidatePath("/manager/properties");
  revalidatePath("/tenant");
  revalidatePath("/tenant/payments");
  if (leaseId) revalidatePath(`/manager/leases/${leaseId}`);
}

export async function createLease(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();
  const values = toValues(formData);

  const parsed = leaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const d = parsed.data;

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  if (d.endDate < today) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { endDate: ["The end date can't be in the past."] },
      values,
    };
  }

  const [tenant, unit, activeLease] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: d.tenantId }, select: { id: true } }),
    prisma.unit.findUnique({ where: { id: d.unitId }, select: { id: true } }),
    prisma.lease.findFirst({
      where: { tenantId: d.tenantId, status: "ACTIVE" },
      select: { id: true },
    }),
  ]);
  if (!tenant) return { error: "Tenant not found.", values };
  if (!unit) return { error: "Unit not found.", values };
  if (activeLease) {
    return { error: "This tenant already has an active lease.", values };
  }

  const lease = await prisma.$transaction(async (tx) => {
    // Claim the unit only if it is still vacant, so two leases can't collide
    const claimed = await tx.unit.updateMany({
      where: { id: d.unitId, status: "VACANT" },
      data: { status: "OCCUPIED" },
    });
    if (claimed.count === 0) return null;

    const created = await tx.lease.create({
      data: {
        tenantId: d.tenantId,
        unitId: d.unitId,
        startDate: d.startDate,
        endDate: d.endDate,
        rentAmount: d.rentAmount,
        securityDeposit: d.securityDeposit,
        dueDay: d.dueDay,
        status: "ACTIVE",
      },
    });

    // First rent charge: this month, or the start month for a future lease
    const period = firstChargeMonth(d.startDate, now);
    await tx.payment.create({
      data: {
        leaseId: created.id,
        amount: d.rentAmount,
        periodMonth: period,
        dueDate: dueDateFor(period, d.dueDay),
        status: "PENDING",
      },
    });

    return created;
  });

  if (!lease) {
    return { error: "That unit is no longer vacant.", values };
  }

  refresh();
  redirect(`/manager/leases/${lease.id}`);
}

export async function endLease(leaseId: string, _prev: FormState): Promise<FormState> {
  await requireManager();

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: { id: true, unitId: true, status: true },
  });
  if (!lease) return { error: "Lease not found." };
  if (lease.status !== "ACTIVE") return { error: "This lease has already ended." };

  const currentMonth = monthStart();

  await prisma.$transaction([
    prisma.lease.update({ where: { id: leaseId }, data: { status: "ENDED" } }),
    prisma.unit.update({ where: { id: lease.unitId }, data: { status: "VACANT" } }),
    // Remove charges for months after this one, which will never be owed
    prisma.payment.deleteMany({
      where: { leaseId, status: "PENDING", periodMonth: { gt: currentMonth } },
    }),
  ]);

  refresh(leaseId);
  return { ok: true, message: "Lease ended. The unit is vacant again." };
}

export async function markPaymentPaid(
  paymentId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();

  const method = z.enum(PAYMENT_METHODS).safeParse(formData.get("method"));
  if (!method.success) return { error: "Choose a payment method." };

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { leaseId: true, status: true },
  });
  if (!payment) return { error: "Charge not found." };
  if (payment.status === "PAID") return { error: "Already marked as paid." };

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: new Date(), method: method.data },
  });

  refresh(payment.leaseId);
  return { ok: true };
}
