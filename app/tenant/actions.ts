"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLeaseAccess } from "@/lib/authz";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createRentCheckout(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { lease: { include: { unit: { include: { property: true } } } } },
  });
  if (!payment) throw new Error("Charge not found");

  // Permission check against the charge's lease
  await requireLeaseAccess(payment.leaseId);

  if (payment.status === "PAID") throw new Error("Already paid");

  const monthLabel = payment.periodMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          // Amount always comes from the database, never from the client
          unit_amount: Math.round(Number(payment.amount) * 100),
          product_data: {
            name: `Rent for ${monthLabel}`,
            description: `${payment.lease.unit.property.name}, Unit ${payment.lease.unit.unitNumber}`,
          },
        },
      },
    ],
    metadata: { paymentId: payment.id, leaseId: payment.leaseId },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/payments?status=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/payments?status=cancelled`,
  });

  // Reuse the same row for retries; the newest session replaces the old one
  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id, status: "PENDING" },
  });

  // redirect() works by throwing, so keep it outside any try/catch
  redirect(session.url!);
}
