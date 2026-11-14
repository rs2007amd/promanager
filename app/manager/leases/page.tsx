import Link from "next/link";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function LeasesPage() {
  await requireManager();

  const leases = await prisma.lease.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    include: {
      tenant: { include: { user: { select: { name: true } } } },
      unit: { include: { property: { select: { name: true } } } },
    },
  });

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leases</h1>
        <Link
          href="/manager/leases/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
        >
          New lease
        </Link>
      </div>

      {leases.length === 0 ? (
        <p className="text-gray-600">No leases yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Tenant</th>
                <th>Property / Unit</th>
                <th>Term</th>
                <th>Rent</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="py-2">{l.tenant.user.name}</td>
                  <td>
                    {l.unit.property.name}, {l.unit.unitNumber}
                  </td>
                  <td>
                    {fmt(l.startDate)} to {fmt(l.endDate)}
                  </td>
                  <td>${Number(l.rentAmount).toLocaleString()}</td>
                  <td>
                    {l.status === "ACTIVE" ? "Active" : l.status === "ENDED" ? "Ended" : "Pending"}
                  </td>
                  <td>
                    <Link
                      href={`/manager/leases/${l.id}`}
                      className="text-blue-600 underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
