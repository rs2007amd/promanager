import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { requireManager } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { endLease, markPaymentPaid } from "../actions";
import { MarkPaidForm } from "./mark-paid-form";

export default async function LeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;

  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
      tenant: { include: { user: { select: { name: true, email: true } } } },
      unit: { include: { property: true } },
      payments: { orderBy: { periodMonth: "desc" } },
    },
  });
  if (!lease) notFound();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" });
  const month = (d: Date) =>
    d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const now = new Date();

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <Link href="/manager/leases" className="text-sm text-blue-600 underline">
          All leases
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {lease.unit.property.name}, Unit {lease.unit.unitNumber}
        </h1>
        <p className="text-sm text-gray-600">
          Status: {lease.status === "ACTIVE" ? "Active" : lease.status === "ENDED" ? "Ended" : "Pending"}
        </p>
      </div>

      <section className="rounded border p-4 text-sm">
        <p>
          Tenant:{" "}
          <Link href={`/manager/tenants/${lease.tenantId}`} className="text-blue-600 underline">
            {lease.tenant.user.name}
          </Link>{" "}
          ({lease.tenant.user.email})
        </p>
        <p>
          Term: {fmt(lease.startDate)} to {fmt(lease.endDate)}
        </p>
        <p>
          Rent: ${Number(lease.rentAmount).toLocaleString()} per month, due on
          day {lease.dueDay}
        </p>
        <p>Security deposit: ${Number(lease.securityDeposit).toLocaleString()}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Rent charges</h2>
        {lease.payments.length === 0 ? (
          <p className="text-sm text-gray-600">No charges yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Month</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Record a payment</th>
                </tr>
              </thead>
              <tbody>
                {lease.payments.map((p) => {
                  const unpaid = p.status === "PENDING" || p.status === "FAILED";
                  const overdue = unpaid && p.dueDate < now;
                  return (
                    <tr key={p.id} className="border-b align-top">
                      <td className="py-2">{month(p.periodMonth)}</td>
                      <td>${Number(p.amount).toLocaleString()}</td>
                      <td>{fmt(p.dueDate)}</td>
                      <td>
                        {p.status === "PAID"
                          ? `Paid${p.method ? ` (${p.method})` : ""}`
                          : overdue
                            ? "Overdue"
                            : "Due"}
                      </td>
                      <td>
                        {unpaid && (
                          <MarkPaidForm action={markPaymentPaid.bind(null, p.id)} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {lease.status === "ACTIVE" && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-red-600">End lease</h2>
          <p className="text-sm text-gray-600">
            Marks the lease ended and the unit vacant. Future unpaid charges are
            removed. Past charges stay on record.
          </p>
          <ActionButton
            action={endLease.bind(null, lease.id)}
            label="End lease"
            confirmMessage="End this lease and mark the unit vacant?"
          />
        </section>
      )}
    </main>
  );
}
