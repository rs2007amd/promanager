import { requireManager } from "@/lib/authz";
import { getDashboardStats } from "@/lib/dashboard";

export default async function ManagerDashboard() {
  await requireManager();
  const stats = await getDashboardStats();

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Properties" value={stats.totalProperties} />
        <Stat label="Occupied units" value={stats.occupiedUnits} />
        <Stat label="Vacant units" value={stats.vacantUnits} />
        <Stat
          label="Overdue rent"
          value={`$${stats.overdueTotal.toLocaleString()}`}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          Overdue ({stats.overdueCount})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Tenant</th>
                <th>Property / Unit</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {stats.overduePayments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.lease.tenant.user.name}</td>
                  <td>
                    {p.lease.unit.property.name}, {p.lease.unit.unitNumber}
                  </td>
                  <td>
                    {p.periodMonth.toLocaleString("en-US", {
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td>${Number(p.amount).toLocaleString()}</td>
                  <td>
                    {p.dueDate.toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
