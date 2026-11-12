import Link from "next/link";
import { signOut } from "@/auth";

type NavLink = { href: string; label: string };

export function Nav({
  title,
  userName,
  links,
}: {
  title: string;
  userName?: string | null;
  links: NavLink[];
}) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">{title}</span>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="flex items-center gap-3"
        >
          {userName && <span className="text-sm text-gray-600">{userName}</span>}
          <button className="rounded border px-3 py-1 text-sm">Sign out</button>
        </form>
      </div>
    </header>
  );
}
