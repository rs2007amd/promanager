import Link from "next/link";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function PropertiesPage() {
  await requireManager();

  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    include: { units: { select: { status: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <Link
          href="/manager/properties/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Add property
        </Link>
      </div>

      {properties.length === 0 ? (
        <p className="text-gray-600">No properties yet. Add your first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Property</th>
                <th>Address</th>
                <th>Type</th>
                <th>Units</th>
                <th>Occupied</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">
                    <Link
                      href={`/manager/properties/${p.id}`}
                      className="text-blue-600 underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td>
                    {p.address}, {p.city}, {p.state} {p.zip}
                  </td>
                  <td>{p.propertyType}</td>
                  <td>{p.units.length}</td>
                  <td>{p.units.filter((u) => u.status === "OCCUPIED").length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
