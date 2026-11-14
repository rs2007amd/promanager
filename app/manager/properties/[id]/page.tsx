import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createUnit, deleteProperty, updateProperty } from "../actions";
import { PropertyForm } from "../property-form";
import { UnitForm } from "../unit-form";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { units: { orderBy: { unitNumber: "asc" } } },
  });
  if (!property) notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <div>
        <Link href="/manager/properties" className="text-sm text-blue-600 underline">
          All properties
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{property.name}</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Details</h2>
        <div className="max-w-xl">
          <PropertyForm
            action={updateProperty.bind(null, property.id)}
            submitLabel="Save changes"
            defaults={{
              name: property.name,
              address: property.address,
              city: property.city,
              state: property.state,
              zip: property.zip,
              propertyType: property.propertyType,
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Units ({property.units.length})</h2>
        {property.units.length === 0 ? (
          <p className="text-sm text-gray-600">No units yet. Add one below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Unit</th>
                  <th>Beds</th>
                  <th>Baths</th>
                  <th>Rent</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {property.units.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2">{u.unitNumber}</td>
                    <td>{u.bedrooms}</td>
                    <td>{Number(u.bathrooms)}</td>
                    <td>${Number(u.monthlyRent).toLocaleString()}</td>
                    <td>{u.status === "OCCUPIED" ? "Occupied" : "Vacant"}</td>
                    <td>
                      <Link
                        href={`/manager/properties/${property.id}/units/${u.id}`}
                        className="text-blue-600 underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded border p-4">
          <h3 className="mb-3 font-medium">Add a unit</h3>
          <UnitForm
            action={createUnit.bind(null, property.id)}
            submitLabel="Add unit"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
        <DeleteButton
          action={deleteProperty.bind(null, property.id)}
          label="Delete property"
          confirmMessage="Delete this property and its empty units? This cannot be undone."
        />
      </section>
    </main>
  );
}
