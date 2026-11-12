import { StatusSelect } from "@/components/status-select";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function ManagerMaintenance() {
  await requireManager();

  const requests = await prisma.maintenanceRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenant: { include: { user: { select: { name: true } } } },
      unit: { include: { property: { select: { name: true } } } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Maintenance requests</h1>
      {requests.length === 0 ? (
        <p className="text-gray-600">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Request</th>
                <th>Tenant</th>
                <th>Property / Unit</th>
                <th>Photo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b align-top">
                  <td className="py-2">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-gray-600">{r.description}</div>
                  </td>
                  <td>{r.tenant.user.name}</td>
                  <td>
                    {r.unit.property.name}, {r.unit.unitNumber}
                  </td>
                  <td>
                    {r.photoUrl ? (
                      <a href={r.photoUrl} className="text-blue-600 underline">
                        View
                      </a>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td>
                    <StatusSelect id={r.id} current={r.status} />
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
