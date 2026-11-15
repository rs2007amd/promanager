import type { PrismaClient } from "@prisma/client";

// Failed sign-ins allowed within the window before further attempts are refused.
// Per email: stops guessing one account's password.
// Per IP:    stops one machine guessing across many accounts.
export const LOGIN_LIMITS = {
  windowMs: 15 * 60_000,
  perEmail: 5,
  perIp: 20,
};

const KEEP_MS = 24 * 60 * 60_000;

type Db = Pick<PrismaClient, "loginAttempt">;

const emailKey = (email: string) => `email:${email}`;
const ipKey = (ip: string) => `ip:${ip}`;

// The client's IP. On Vercel the platform sets x-forwarded-for itself, so the
// first entry can be trusted there.
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

// True when this email or IP has had too many recent failed sign-ins
export async function isLoginBlocked(
  db: Db,
  email: string,
  ip: string | null,
  now = new Date()
): Promise<boolean> {
  const since = new Date(now.getTime() - LOGIN_LIMITS.windowMs);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { key: emailKey(email), createdAt: { gte: since } } }),
    ip
      ? db.loginAttempt.count({ where: { key: ipKey(ip), createdAt: { gte: since } } })
      : Promise.resolve(0),
  ]);
  return byEmail >= LOGIN_LIMITS.perEmail || byIp >= LOGIN_LIMITS.perIp;
}

export async function recordLoginFailure(
  db: Db,
  email: string,
  ip: string | null,
  now = new Date()
): Promise<void> {
  await db.loginAttempt.createMany({
    data: [
      { key: emailKey(email), createdAt: now },
      ...(ip ? [{ key: ipKey(ip), createdAt: now }] : []),
    ],
  });
  // Housekeeping, so the table stays small
  await db.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - KEEP_MS) } },
  });
}

// After a successful sign-in, the account starts fresh. The IP count is kept,
// so one valid account can't be used to reset an attacker's IP limit.
export async function clearLoginFailures(db: Db, email: string): Promise<void> {
  await db.loginAttempt.deleteMany({ where: { key: emailKey(email) } });
}
