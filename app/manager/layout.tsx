import { Nav } from "@/components/nav";
import { requireManager } from "@/lib/authz";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireManager();

  return (
    <>
      <Nav
        title="PropManager"
        userName={session.user.name}
        links={[
          { href: "/manager", label: "Dashboard" },
          { href: "/manager/maintenance", label: "Maintenance" },
        ]}
      />
      {children}
    </>
  );
}
