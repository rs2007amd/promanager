import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteUnit, updateUnit } from "../../../actions";
import { UnitForm } from "../../../unit-form";

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  await requireManager();
  const { id, unitId } = await params;

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, propertyId: id },
    include: { property: { select: { name: true } } },
  });
  if (!unit) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <Link href={`/manager/properties/${id}`} className="text-sm text-blue-600 underline">
          Back to {unit.property.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit unit {unit.unitNumber}</h1>
        <p className="text-sm text-gray-600">
          Status: {unit.status === "OCCUPIED" ? "Occupied" : "Vacant"}
        </p>
      </div>

      <UnitForm
        action={updateUnit.bind(null, unit.id)}
        submitLabel="Save changes"
        defaults={{
          unitNumber: unit.unitNumber,
          bedrooms: String(unit.bedrooms),
          bathrooms: String(Number(unit.bathrooms)),
          monthlyRent: String(Number(unit.monthlyRent)),
        }}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
        <DeleteButton
          action={deleteUnit.bind(null, id, unit.id)}
          label="Delete unit"
          confirmMessage="Delete this unit? This cannot be undone."
        />
      </section>
    </main>
  );
}
