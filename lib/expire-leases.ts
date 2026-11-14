import { monthStart } from "@/lib/dates";
import { startOfDayUtc } from "@/lib/expiry";
import { prisma } from "@/lib/prisma";

// Ends every active lease whose end date has passed and frees its unit.
// Safe to run repeatedly: each lease is changed only if it is still ACTIVE.
export async function expireLeases(now = new Date()) {
  const today = startOfDayUtc(now);

  const expired = await prisma.lease.findMany({
    where: { status: "ACTIVE", endDate: { lt: today } },
    select: { id: true, unitId: true },
  });

  let ended = 0;

  for (const lease of expired) {
    // One transaction per lease: either everything changes or nothing does
    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.lease.updateMany({
        where: { id: lease.id, status: "ACTIVE" },
        data: { status: "ENDED" },
      });
      if (result.count === 0) return false; // someone ended it already

      // Only free the unit if no other active lease uses it
      const stillInUse = await tx.lease.count({
        where: { unitId: lease.unitId, status: "ACTIVE" },
      });
      if (stillInUse === 0) {
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { status: "VACANT" },
        });
      }

      // Drop charges for future months. Past unpaid charges stay on record.
      await tx.payment.deleteMany({
        where: {
          leaseId: lease.id,
          status: "PENDING",
          periodMonth: { gt: monthStart(now) },
        },
      });

      return true;
    });

    if (changed) ended++;
  }

  return ended;
}
