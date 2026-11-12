import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "TENANT") redirect("/login");

  return (
    <>
      <Nav
        title="PropManager"
        userName={session.user.name}
        links={[
          { href: "/tenant", label: "Home" },
          { href: "/tenant/payments", label: "Payments" },
          { href: "/tenant/maintenance", label: "Maintenance" },
        ]}
      />
      {children}
    </>
  );
}
