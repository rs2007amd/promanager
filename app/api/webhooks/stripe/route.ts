import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  // Must be the raw text body, not parsed JSON, or signature checks fail
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid") {
        // Only updates rows not already PAID, so repeated events are harmless
        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id, status: { not: "PAID" } },
          data: {
            status: "PAID",
            paidAt: new Date(),
            method: session.payment_method_types?.[0] ?? "card",
          },
        });
      }
      break;
    }

    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
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
