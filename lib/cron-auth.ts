import { createHash, timingSafeEqual } from "node:crypto";

// True only when the request carries "Bearer <CRON_SECRET>".
// Vercel sends this header automatically when CRON_SECRET is set. If the
// secret is missing or too short, every request is refused, so a missing
// setting can never leave the cron jobs open.
export function isCronAuthorized(req: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret || secret.trim().length < 16) {
    console.error("[cron] CRON_SECRET is missing or shorter than 16 characters; refusing request");
    return false;
  }

  const header = req.headers.get("authorization") ?? "";
  // Hashing first gives equal lengths, which timingSafeEqual requires
  const given = createHash("sha256").update(header).digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(given, expected);
}
