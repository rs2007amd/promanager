import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthStart } from "@/lib/dates";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = monthStart();
  const year = period.getUTCFullYear();
  const month = period.getUTCMonth();
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

  // Active leases that cover at least part of this month
  const leases = await prisma.lease.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: monthEnd },
      endDate: { gte: period },
    },
    select: { id: true, rentAmount: true, dueDay: true },
  });

  const result = await prisma.payment.createMany({
    data: leases.map((l) => ({
      leaseId: l.id,
      amount: l.rentAmount,
      periodMonth: period,
      dueDate: new Date(Date.UTC(year, month, l.dueDay)),
      status: "PENDING" as const,
    })),
    skipDuplicates: true, // safe to run twice
  });

  return NextResponse.json({ created: result.count });
}
