import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [totalProperties, occupiedUnits, vacantUnits, overduePayments] =
    await Promise.all([
      prisma.property.count(),
      prisma.unit.count({ where: { status: "OCCUPIED" } }),
      prisma.unit.count({ where: { status: "VACANT" } }),
      prisma.payment.findMany({
        where: {
          status: { in: ["PENDING", "FAILED"] },
          dueDate: { lt: new Date() },
        },
        include: {
          lease: {
            include: {
              tenant: { include: { user: { select: { name: true, email: true } } } },
              unit: { include: { property: { select: { name: true } } } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

  const overdueTotal = overduePayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  return {
    totalProperties,
    occupiedUnits,
    vacantUnits,
    overdueCount: overduePayments.length,
    overdueTotal,
    overduePayments,
  };
}
