import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { paymentProvider, PaymentUnavailableError } from "@/lib/payments/provider";
import { finalizePayment, parsePaymentAmount } from "@/lib/payments/settle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function stopRetries(): NextResponse {
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  try {
    let outcome: { reference: string; status: string; amount?: string };
    try {
      outcome = await paymentProvider.handleWebhook(payload);
    } catch (error) {
      if (error instanceof PaymentUnavailableError) return stopRetries();
      console.error("M-Pesa webhook rejected", error);
      return stopRetries();
    }

    const payment = await prisma.payment.findUnique({ where: { providerReference: outcome.reference } });
    if (!payment) {
      console.warn("Payment callback for unknown reference", outcome.reference);
      return stopRetries();
    }

    if ((outcome.status !== "DEPOSIT_SUCCESS" && outcome.status !== "WITHDRAWAL_SUCCESS") ||
        payment.status === outcome.status) {
      return stopRetries();
    }

    const amount = parsePaymentAmount(payment, outcome.amount);
    const successStatus = outcome.status as "DEPOSIT_SUCCESS" | "WITHDRAWAL_SUCCESS";
    await prisma.$transaction(
      (tx) => finalizePayment(tx, payment, successStatus, amount, outcome.reference),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json({ success: true, status: outcome.status });
  } catch (error) {
    console.error("Payment callback processing failed", error);
    return stopRetries();
  }
}