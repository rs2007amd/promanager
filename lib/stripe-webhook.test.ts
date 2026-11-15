import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { closeCheckoutSession } from "./stripe";
import { handleCheckoutPaid, type WebhookDeps } from "./stripe-webhook";

type Row = { id: string; status: string; stripeSessionId: string | null };

// A tiny in-memory stand-in for the payment table and the Stripe API
function setup(row: Row, sessionStatus: Record<string, string> = {}) {
  const db = {
    payment: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; stripeSessionId?: string } }) => {
        if (where.id === row.id || where.stripeSessionId === row.stripeSessionId) return { ...row };
        return null;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        if (where.id !== row.id || row.status === "PAID") return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
    },
  };
  const stripe = {
    checkout: {
      sessions: {
        retrieve: vi.fn(async (id: string) => ({ id, status: sessionStatus[id] ?? "open" })),
        expire: vi.fn(async (id: string) => {
          sessionStatus[id] = "expired";
          return { id, status: "expired" };
        }),
      },
    },
    refunds: { create: vi.fn(async () => ({ id: "re_1" })) },
    paymentIntents: {
      retrieve: vi.fn(async () => ({ payment_method: { type: "card" } })),
    },
  };
  return { db, stripe, deps: { db, stripe } as unknown as WebhookDeps };
}

const paidSession = (id: string, paymentId = "pay_1") =>
  ({
    id,
    payment_status: "paid",
    payment_intent: `pi_${id}`,
    metadata: { paymentId },
  }) as unknown as Stripe.Checkout.Session;

describe("handleCheckoutPaid", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("records a payment made on the charge's current session", async () => {
    const row = { id: "pay_1", status: "PENDING", stripeSessionId: "cs_new" };
    const { deps, stripe } = setup(row);

    expect(await handleCheckoutPaid(paidSession("cs_new"), deps)).toBe("recorded");
    expect(row.status).toBe("PAID");
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("records a payment made on an older session and closes the newer one", async () => {
    // Tenant opened checkout twice and paid on the first page
    const row = { id: "pay_1", status: "PENDING", stripeSessionId: "cs_new" };
    const { deps, stripe } = setup(row);

    expect(await handleCheckoutPaid(paidSession("cs_old"), deps)).toBe("recorded");
    expect(row).toMatchObject({ status: "PAID", stripeSessionId: "cs_old" });
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_new");
  });

  it("ignores a repeat of the same event", async () => {
    const row = { id: "pay_1", status: "PAID", stripeSessionId: "cs_new" };
    const { deps, stripe } = setup(row);

    expect(await handleCheckoutPaid(paidSession("cs_new"), deps)).toBe("duplicate-event");
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("refunds a payment for a charge a manager already marked paid", async () => {
    const row = { id: "pay_1", status: "PAID", stripeSessionId: null };
    const { deps, stripe } = setup(row);

    expect(await handleCheckoutPaid(paidSession("cs_new"), deps)).toBe("refunded");
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: "pi_cs_new", reason: "duplicate" },
      { idempotencyKey: "duplicate-rent-cs_new" }
    );
  });

  it("refunds a second payment made on another session", async () => {
    const row = { id: "pay_1", status: "PAID", stripeSessionId: "cs_old" };
    const { deps, stripe } = setup(row);

    expect(await handleCheckoutPaid(paidSession("cs_new"), deps)).toBe("refunded");
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
  });

  it("reports a session that matches no charge", async () => {
    const row = { id: "pay_1", status: "PENDING", stripeSessionId: "cs_new" };
    const { deps } = setup(row);

    expect(await handleCheckoutPaid(paidSession("cs_x", "missing"), deps)).toBe(
      "unknown-charge"
    );
  });
});

describe("closeCheckoutSession", () => {
  const api = (status: string, expireFails = false, afterFail = "complete") => ({
    checkout: {
      sessions: {
        retrieve: vi
          .fn()
          .mockResolvedValueOnce({ status })
          .mockResolvedValueOnce({ status: afterFail }),
        expire: expireFails
          ? vi.fn().mockRejectedValue(new Error("not open"))
          : vi.fn().mockResolvedValue({ status: "expired" }),
      },
    },
  }) as unknown as Parameters<typeof closeCheckoutSession>[0];

  it("expires an open session", async () => {
    expect(await closeCheckoutSession(api("open"), "cs_1")).toBe("closed");
  });

  it("reports a session the tenant already paid on", async () => {
    expect(await closeCheckoutSession(api("complete"), "cs_1")).toBe("completed");
  });

  it("treats an already expired session as closed", async () => {
    expect(await closeCheckoutSession(api("expired"), "cs_1")).toBe("closed");
  });

  it("notices a payment that finished just before expiring", async () => {
    expect(await closeCheckoutSession(api("open", true, "complete"), "cs_1")).toBe(
      "completed"
    );
  });
});
