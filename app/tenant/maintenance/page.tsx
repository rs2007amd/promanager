import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RequestForm } from "./request-form";

export default async function TenantMaintenance() {
  const session = await auth();
  if (!session) redirect("/login");

  const requests = await prisma.maintenanceRequest.findMany({
    where: { tenant: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-xl space-y-8 p-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Maintenance request</h1>
        <RequestForm />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Your requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-600">No requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-xs">{r.status.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{r.description}</p>
                {r.photoUrl && (
                  <a
                    href={r.photoUrl}
                    className="mt-1 inline-block text-sm text-blue-600 underline"
                  >
                    View photo
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
