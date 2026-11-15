import { describe, expect, it } from "vitest";
import {
  LOGIN_LIMITS,
  clearLoginFailures,
  clientIp,
  isLoginBlocked,
  recordLoginFailure,
} from "./login-limit";

type Row = { key: string; createdAt: Date };
type Where = { key?: string; createdAt?: { gte?: Date; lt?: Date } };

// In-memory stand-in for the LoginAttempt table
function fakeDb() {
  let rows: Row[] = [];
  const matches = (r: Row, w: Where) =>
    (w.key === undefined || r.key === w.key) &&
    (w.createdAt?.gte === undefined || r.createdAt >= w.createdAt.gte) &&
    (w.createdAt?.lt === undefined || r.createdAt < w.createdAt.lt);

  const loginAttempt = {
    count: async ({ where }: { where: Where }) => rows.filter((r) => matches(r, where)).length,
    createMany: async ({ data }: { data: Row[] }) => {
      rows.push(...data);
      return { count: data.length };
    },
    deleteMany: async ({ where }: { where: Where }) => {
      const before = rows.length;
      rows = rows.filter((r) => !matches(r, where));
      return { count: before - rows.length };
    },
  };
  return {
    db: { loginAttempt } as unknown as Parameters<typeof isLoginBlocked>[0],
    rows: () => rows,
  };
}

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 15, 12, minutes));

describe("login limits", () => {
  it("blocks an email after too many failures, from any IP", async () => {
    const { db } = fakeDb();
    for (let i = 0; i < LOGIN_LIMITS.perEmail; i++) {
      await recordLoginFailure(db, "a@x.com", `10.0.0.${i}`, at(0));
    }
    expect(await isLoginBlocked(db, "a@x.com", "10.9.9.9", at(1))).toBe(true);
    expect(await isLoginBlocked(db, "b@x.com", "10.9.9.9", at(1))).toBe(false);
  });

  it("allows one fewer failure than the limit", async () => {
    const { db } = fakeDb();
    for (let i = 0; i < LOGIN_LIMITS.perEmail - 1; i++) {
      await recordLoginFailure(db, "a@x.com", "10.0.0.1", at(0));
    }
    expect(await isLoginBlocked(db, "a@x.com", "10.0.0.1", at(1))).toBe(false);
  });

  it("blocks an IP guessing across many accounts", async () => {
    const { db } = fakeDb();
    for (let i = 0; i < LOGIN_LIMITS.perIp; i++) {
      await recordLoginFailure(db, `user${i}@x.com`, "10.0.0.1", at(0));
    }
    expect(await isLoginBlocked(db, "new@x.com", "10.0.0.1", at(1))).toBe(true);
    expect(await isLoginBlocked(db, "new@x.com", "10.0.0.2", at(1))).toBe(false);
  });

  it("lets attempts through again once the window has passed", async () => {
    const { db } = fakeDb();
    for (let i = 0; i < LOGIN_LIMITS.perEmail; i++) {
      await recordLoginFailure(db, "a@x.com", null, at(0));
    }
    expect(await isLoginBlocked(db, "a@x.com", null, at(14))).toBe(true);
    expect(await isLoginBlocked(db, "a@x.com", null, at(16))).toBe(false);
  });

  it("clears an account's failures after a successful sign-in, but not the IP's", async () => {
    const { db, rows } = fakeDb();
    await recordLoginFailure(db, "a@x.com", "10.0.0.1", at(0));
    await clearLoginFailures(db, "a@x.com");
    expect(rows().map((r) => r.key)).toEqual(["ip:10.0.0.1"]);
  });

  it("deletes failures older than a day", async () => {
    const { db, rows } = fakeDb();
    await recordLoginFailure(db, "old@x.com", null, new Date(Date.UTC(2026, 10, 13)));
    await recordLoginFailure(db, "new@x.com", null, at(0));
    expect(rows().map((r) => r.key)).toEqual(["email:new@x.com"]);
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then null", () => {
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBeNull();
  });
});
