import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { sendReminders } from "@/lib/send-reminders";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendReminders();
  return NextResponse.json(result);
}
