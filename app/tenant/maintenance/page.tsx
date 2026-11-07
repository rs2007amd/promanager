import { RequestForm } from "./request-form";

export default function TenantMaintenance() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Maintenance request</h1>
      <RequestForm />
    </main>
  );
}
