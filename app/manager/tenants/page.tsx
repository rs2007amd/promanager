import Link from "next/link";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function TenantsPage() {
  await requireManager();

  const tenants = await prisma.tenant.findMany({
    orderBy: { user: { name: "asc" } },
    include: {
      user: { select: { name: true, email: true } },
      leases: {
        where: { status: "ACTIVE" },
        include: { unit: { include: { property: { select: { name: true } } } } },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Link
          href="/manager/tenants/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Add tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <p className="text-gray-600">No tenants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Current unit</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const lease = t.leases[0];
                return (
                  <tr key={t.id} className="border-b">
                    <td className="py-2">
                      <Link
                        href={`/manager/tenants/${t.id}`}
                        className="text-blue-600 underline"
                      >
                        {t.user.name}
                      </Link>
                    </td>
                    <td>{t.user.email}</td>
                    <td>{t.phone ?? ""}</td>
                    <td>
                      {lease
                        ? `${lease.unit.property.name}, ${lease.unit.unitNumber}`
                        : "No active lease"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
