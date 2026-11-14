import { requireManager } from "@/lib/authz";
import { createProperty } from "../actions";
import { PropertyForm } from "../property-form";

export default async function NewPropertyPage() {
  await requireManager();

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Add property</h1>
      <PropertyForm action={createProperty} submitLabel="Create property" />
    </main>
  );
}
