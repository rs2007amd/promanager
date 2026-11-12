import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Sends each visitor to the right place for their role
export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect(session.user.role === "MANAGER" ? "/manager" : "/tenant");
}
