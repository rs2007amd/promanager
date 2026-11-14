import Link from "next/link";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createLease } from "../actions";
import { LeaseForm } from "../lease-form";

export default async function NewLeasePage() {
  await requireManager();

  const [tenants, units] = await Promise.all([
    // Only tenants who don't already have an active lease
    prisma.tenant.findMany({
      where: { leases: { none: { status: "ACTIVE" } } },
      orderBy: { user: { name: "asc" } },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.unit.findMany({
      where: { status: "VACANT" },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
      include: { property: { select: { name: true } } },
    }),
  ]);

  const missing =
    tenants.length === 0
      ? { text: "There are no tenants without an active lease.", href: "/manager/tenants/new", link: "Add a tenant" }
      : units.length === 0
        ? { text: "There are no vacant units.", href: "/manager/properties", link: "Add a unit" }
        : null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">New lease</h1>

      {missing ? (
        <p className="text-gray-600">
          {missing.text}{" "}
          <Link href={missing.href} className="text-blue-600 underline">
            {missing.link}
          </Link>{" "}
          first.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Creating a lease marks the unit occupied and adds the first rent
            charge. If the due day has already passed this month, the charge
            will show as overdue.
          </p>
          <LeaseForm
            action={createLease}
            tenants={tenants.map((t) => ({
              value: t.id,
              label: `${t.user.name} (${t.user.email})`,
            }))}
            units={units.map((u) => ({
              value: u.id,
              label: `${u.property.name}, ${u.unitNumber} ($${Number(u.monthlyRent).toLocaleString()}/mo)`,
            }))}
          />
        </>
      )}
    </main>
  );
}
