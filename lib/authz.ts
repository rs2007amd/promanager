import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireManager() {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireLeaseAccess(leaseId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role === "MANAGER") return session;

  // Tenants may only touch their own lease
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, tenant: { userId: session.user.id } },
    select: { id: true },
  });
  if (!lease) throw new Error("Forbidden");
  return session;
}
