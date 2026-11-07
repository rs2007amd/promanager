import { PrismaClient, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// First day of the month, offset by N months (UTC)
function monthStart(offset = 0) {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
}

async function main() {
  // Safety: this script wipes data, so it must never run against production
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production");
  }

  await prisma.maintenanceRequest.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  // Dev-only password. Never reuse it anywhere real.
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  await prisma.user.create({
    data: {
      name: "Morgan Manager",
      email: "manager@example.com",
      passwordHash,
      role: "MANAGER",
    },
  });

  const oak = await prisma.property.create({
    data: {
      name: "Oak Street Apartments",
      address: "120 Oak Street",
      city: "Montgomery",
      state: "AL",
      zip: "36104",
      propertyType: "Apartment",
      units: {
        create: [
          { unitNumber: "1A", bedrooms: 1, bathrooms: 1, monthlyRent: 850 },
          { unitNumber: "1B", bedrooms: 2, bathrooms: 1, monthlyRent: 1050 },
          { unitNumber: "2A", bedrooms: 2, bathrooms: 2, monthlyRent: 1200 },
        ],
      },
    },
    include: { units: true },
  });

  const maple = await prisma.property.create({
    data: {
      name: "Maple Court Duplex",
      address: "48 Maple Court",
      city: "Montgomery",
      state: "AL",
      zip: "36106",
      propertyType: "Duplex",
      units: {
        create: [
          { unitNumber: "A", bedrooms: 3, bathrooms: 2, monthlyRent: 1450 },
          { unitNumber: "B", bedrooms: 3, bathrooms: 2, monthlyRent: 1450 },
          { unitNumber: "C", bedrooms: 1, bathrooms: 1, monthlyRent: 750 },
        ],
      },
    },
    include: { units: true },
  });

  const tenantPlans = [
    { name: "Avery Johnson", email: "avery@example.com", unit: oak.units[0], dueDay: 1, pattern: "ALL_PAID" },
    { name: "Jordan Lee", email: "jordan@example.com", unit: oak.units[1], dueDay: 1, pattern: "CURRENT_UNPAID" },
    { name: "Casey Smith", email: "casey@example.com", unit: maple.units[0], dueDay: 5, pattern: "BEHIND_TWO_MONTHS" },
    { name: "Riley Brown", email: "riley@example.com", unit: maple.units[1], dueDay: 15, pattern: "ALL_PAID" },
  ];

  const tenants = [];

  for (const plan of tenantPlans) {
    const user = await prisma.user.create({
      data: { name: plan.name, email: plan.email, passwordHash, role: "TENANT" },
    });
    const tenant = await prisma.tenant.create({
      data: { userId: user.id, phone: "334-555-0100" },
    });

    const lease = await prisma.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: plan.unit.id,
        startDate: monthStart(-6),
        endDate: monthStart(6),
        rentAmount: plan.unit.monthlyRent,
        securityDeposit: plan.unit.monthlyRent,
        dueDay: plan.dueDay,
        status: "ACTIVE",
      },
    });

    await prisma.unit.update({
      where: { id: plan.unit.id },
      data: { status: "OCCUPIED" },
    });

    for (const offset of [-2, -1, 0]) {
      const periodMonth = monthStart(offset);
      const dueDate = new Date(
        Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth(), plan.dueDay)
      );

      let status: PaymentStatus = "PAID";
      if (plan.pattern === "CURRENT_UNPAID" && offset === 0) status = "PENDING";
      if (plan.pattern === "BEHIND_TWO_MONTHS" && offset !== -2) status = "PENDING";

      await prisma.payment.create({
        data: {
          leaseId: lease.id,
          amount: plan.unit.monthlyRent,
          periodMonth,
          dueDate,
          status,
          paidAt: status === "PAID" ? dueDate : null,
          method: status === "PAID" ? "card" : null,
        },
      });
    }

    tenants.push({ tenant, unitId: plan.unit.id });
  }

  await prisma.maintenanceRequest.createMany({
    data: [
      {
        unitId: tenants[0].unitId,
        tenantId: tenants[0].tenant.id,
        title: "Kitchen faucet dripping",
        description: "The kitchen faucet drips constantly, even when fully closed.",
        status: "OPEN",
      },
      {
        unitId: tenants[1].unitId,
        tenantId: tenants[1].tenant.id,
        title: "AC not cooling",
        description: "The air conditioner runs but the apartment stays warm.",
        status: "IN_PROGRESS",
      },
      {
        unitId: tenants[3].unitId,
        tenantId: tenants[3].tenant.id,
        title: "Broken bedroom blind",
        description: "The cord on the bedroom blind snapped and it won't lift.",
        status: "RESOLVED",
      },
    ],
  });

  console.log("Seeded. Log in as manager@example.com or avery@example.com");
  console.log("Password for all accounts: ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
