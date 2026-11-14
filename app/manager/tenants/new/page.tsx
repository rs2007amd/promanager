import { requireManager } from "@/lib/authz";
import { createTenant } from "../actions";
import { TenantForm } from "../tenant-form";

export default async function NewTenantPage() {
  await requireManager();

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Add tenant</h1>
      <p className="text-sm text-gray-600">
        A login is created with a temporary password, shown once after you save.
      </p>
      <TenantForm action={createTenant} submitLabel="Create tenant" />
    </main>
  );
}
