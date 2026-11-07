import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRentCheckout } from "../actions";

export default async function TenantPayments() {
  const session = await auth();
  if (!session) return null;

  const payments = await prisma.payment.findMany({
    where: { lease: { tenant: { userId: session.user.id } } },
    orderBy: { periodMonth: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Rent payments</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Month</th>
            <th>Amount</th>
            <th>Due</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">
                {p.periodMonth.toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </td>
              <td>${Number(p.amount).toLocaleString()}</td>
              <td>{p.dueDate.toLocaleDateString("en-US", { timeZone: "UTC" })}</td>
              <td>{p.status}</td>
              <td>
                {p.status !== "PAID" && (
                  <form action={createRentCheckout.bind(null, p.id)}>
                    <button className="rounded bg-blue-600 px-3 py-1 text-white">
                      Pay rent
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
