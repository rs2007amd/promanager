import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { expireLeases } from "@/lib/expire-leases";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ended = await expireLeases();
  return NextResponse.json({ ended });
}
