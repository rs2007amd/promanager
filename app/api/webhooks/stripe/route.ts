import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { handleCheckoutPaid } from "@/lib/stripe-webhook";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return NextResponse.json({ error: "Online payments are not set up" }, { status: 503 });
  }
  const stripe = getStripe();

  // Must be the raw text body, not parsed JSON, or signature checks fail
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        // Throws if a refund fails, so Stripe retries the event (safely)
        await handleCheckoutPaid(session, { db: prisma, stripe });
      }
      break;
    }

    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Only the charge's current session counts. Older sessions, closed when
      // the tenant opened a new one, are ignored.
      await prisma.payment.updateMany({
        where: { stripeSessionId: session.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      break;
    }
  }

  // Always return 200 for events you receive, or Stripe keeps retrying
  return NextResponse.json({ received: true });
}
