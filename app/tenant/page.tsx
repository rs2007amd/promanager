import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TenantHome() {
  const session = await auth();
  if (!session) redirect("/login");

  const lease = await prisma.lease.findFirst({
    where: { status: "ACTIVE", tenant: { userId: session.user.id } },
    include: {
      unit: { include: { property: true } },
      payments: {
        where: { status: { in: ["PENDING", "FAILED"] } },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!lease) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-3 text-gray-600">
          You don&rsquo;t have an active lease yet. Contact your property
          manager.
        </p>
      </main>
    );
  }

  const nextDue = lease.payments[0];
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">
        Welcome, {session.user.name ?? "tenant"}
      </h1>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Your lease</h2>
        <p>
          {lease.unit.property.name}, Unit {lease.unit.unitNumber}
        </p>
        <p className="text-sm text-gray-600">
          {lease.unit.property.address}, {lease.unit.property.city},{" "}
          {lease.unit.property.state} {lease.unit.property.zip}
        </p>
        <p className="mt-2 text-sm">
          Rent ${Number(lease.rentAmount).toLocaleString()} per month, due on
          day {lease.dueDay}. Lease runs {fmt(lease.startDate)} to{" "}
          {fmt(lease.endDate)}.
        </p>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Rent</h2>
        {nextDue ? (
          <p>
            ${Number(nextDue.amount).toLocaleString()} due {fmt(nextDue.dueDate)}
            .{" "}
            <Link href="/tenant/payments" className="text-blue-600 underline">
              Pay now
            </Link>
          </p>
        ) : (
          <p className="text-gray-600">You&rsquo;re all paid up.</p>
        )}
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Need a repair?</h2>
        <Link href="/tenant/maintenance" className="text-blue-600 underline">
          Submit a maintenance request
        </Link>
      </section>
    </main>
  );
}
