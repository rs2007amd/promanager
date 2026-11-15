import Stripe from "stripe";

let client: Stripe | null = null;

// Created on first use, so the app runs (and managers can record payments by
// hand) before Stripe keys are added.
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Online payments aren't set up yet (STRIPE_SECRET_KEY is missing).");
  }
  client ??= new Stripe(key);
  return client;
}

type SessionsApi = Pick<Stripe, "checkout">;

// Makes sure a Checkout session can no longer take money.
// - "closed":    the session is expired (by us now, or earlier), so nobody can pay on it
// - "completed": the tenant already paid on it (or the payment is still processing)
export async function closeCheckoutSession(
  stripe: SessionsApi,
  sessionId: string
): Promise<"closed" | "completed"> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "complete") return "completed";
  if (session.status !== "open") return "closed";

  try {
    await stripe.checkout.sessions.expire(sessionId);
    return "closed";
  } catch {
    // Expiring fails if the tenant finished paying a moment ago, so check again
    const latest = await stripe.checkout.sessions.retrieve(sessionId);
    if (latest.status === "complete") return "completed";
    if (latest.status === "expired") return "closed";
    throw new Error(`Could not close Stripe Checkout session ${sessionId}`);
  }
}
