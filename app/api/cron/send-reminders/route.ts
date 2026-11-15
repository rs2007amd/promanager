import { NextResponse } from "next/server";
import { sendReminders } from "@/lib/send-reminders";

export async function GET(req: Request) {
  // Vercel sends this header automatically when CRON_SECRET is set
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendReminders();
  return NextResponse.json(result);
}
