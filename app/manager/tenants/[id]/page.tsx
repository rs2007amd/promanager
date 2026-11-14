import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { DeleteButton } from "@/components/delete-button";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deleteTenant, resetTenantPassword, updateTenant } from "../actions";
import { TenantForm } from "../tenant-form";

export default async function TenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      leases: {
        orderBy: { startDate: "desc" },
        include: { unit: { include: { property: { select: { name: true } } } } },
      },
    },
  });
  if (!tenant) notFound();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" });

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-6">
      <div>
        <Link href="/manager/tenants" className="text-sm text-blue-600 underline">
          All tenants
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{tenant.user.name}</h1>
      </div>

      <section className="max-w-xl space-y-4">
        <h2 className="text-lg font-medium">Details</h2>
        <TenantForm
          action={updateTenant.bind(null, tenant.id)}
          submitLabel="Save changes"
          defaults={{
            name: tenant.user.name,
            email: tenant.user.email,
            phone: tenant.phone ?? "",
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Leases</h2>
        {tenant.leases.length === 0 ? (
          <p className="text-sm text-gray-600">No leases yet.</p>
        ) : (
          <ul className="space-y-2">
            {tenant.leases.map((l) => (
              <li key={l.id} className="rounded border p-3 text-sm">
                <Link
                  href={`/manager/leases/${l.id}`}
                  className="text-blue-600 underline"
                >
                  {l.unit.property.name}, {l.unit.unitNumber}
                </Link>{" "}
                ({l.status === "ACTIVE" ? "Active" : l.status === "ENDED" ? "Ended" : "Pending"}),{" "}
                {fmt(l.startDate)} to {fmt(l.endDate)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Login</h2>
        <p className="text-sm text-gray-600">
          Tenants can&rsquo;t change their own password yet. Reset it here and
          share the new temporary password.
        </p>
        <ActionButton
          action={resetTenantPassword.bind(null, tenant.id)}
          label="Reset password"
          confirmMessage="Reset this tenant's password? Their current password will stop working."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
        <DeleteButton
          action={deleteTenant.bind(null, tenant.id)}
          label="Delete tenant"
          confirmMessage="Delete this tenant and their login? This cannot be undone."
        />
      </section>
    </main>
  );
}
