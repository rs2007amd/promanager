import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { closeCheckoutSession } from "./stripe";

export type WebhookDeps = {
  db: Pick<PrismaClient, "payment">;
  stripe: Pick<Stripe, "checkout" | "refunds" | "paymentIntents">;
};

export type PaidOutcome = "recorded" | "duplicate-event" | "refunded" | "unknown-charge";

// Records a successful Checkout payment against its rent charge.
// The charge is found by the paymentId stored in the session's metadata, so a
// payment made on an older Checkout page still counts. If the charge was
// already paid some other way, the extra payment is refunded automatically.
export async function handleCheckoutPaid(
  session: Stripe.Checkout.Session,
  { db, stripe }: WebhookDeps
): Promise<PaidOutcome> {
  const paymentId = session.metadata?.paymentId;
  const payment = paymentId
    ? await db.payment.findUnique({ where: { id: paymentId } })
    : await db.payment.findUnique({ where: { stripeSessionId: session.id } });

  if (!payment) {
    console.error(`[stripe] Paid session ${session.id} matches no rent charge`);
    return "unknown-charge";
  }

  if (payment.status !== "PAID") {
    // Only one update can win if a manager marks it paid at the same moment
    const updated = await db.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        method: await paymentMethodType(stripe, session),
        stripeSessionId: session.id,
      },
    });

    if (updated.count === 1) {
      // A newer Checkout page may still be open for this charge: close it
      if (payment.stripeSessionId && payment.stripeSessionId !== session.id) {
        await closeCheckoutSession(stripe, payment.stripeSessionId).catch((e) =>
          console.error(`[stripe] Could not close session ${payment.stripeSessionId}`, e)
        );
      }
      return "recorded";
    }
  }

  // Stripe sends some events more than once
  const current = await db.payment.findUnique({
    where: { id: payment.id },
    select: { stripeSessionId: true },
  });
  if (current?.stripeSessionId === session.id) return "duplicate-event";

  // The charge was already paid (by hand, or on another Checkout page), so this
  // second payment is refunded. The idempotency key means Stripe retries of
  // this event can never refund twice.
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntent) {
    throw new Error(`[stripe] Paid session ${session.id} has no payment intent to refund`);
  }

  await stripe.refunds.create(
    { payment_intent: paymentIntent, reason: "duplicate" },
    { idempotencyKey: `duplicate-rent-${session.id}` }
  );
  console.warn(
    `[stripe] Refunded duplicate payment: session ${session.id}, charge ${payment.id}`
  );
  return "refunded";
}

// The method the tenant actually used, for example "card" or "us_bank_account"
async function paymentMethodType(
  stripe: WebhookDeps["stripe"],
  session: Stripe.Checkout.Session
): Promise<string> {
  const id =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!id) return "card";
  try {
    const intent = await stripe.paymentIntents.retrieve(id, {
      expand: ["payment_method"],
    });
    const method = intent.payment_method;
    return typeof method === "object" && method ? method.type : "card";
  } catch {
    return "card";
  }
}
