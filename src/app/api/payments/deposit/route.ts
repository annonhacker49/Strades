import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ApiError, jsonError, objectBody, requireUser } from "@/lib/api";
import { normalizePhone } from "@/lib/payments/daraja";
import { PaymentUnavailableError, paymentProvider } from "@/lib/payments/provider";
import { finalizePayment } from "@/lib/payments/settle";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user.account) throw new ApiError("ACCOUNT_UNAVAILABLE", "Your trading account is unavailable.", 403);
    const data = objectBody(await request.json());
    const amount = typeof data.amount === "string" ? data.amount : "";
    const phone = typeof data.phone === "string" ? data.phone : "";
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount) || Number(amount) < 1 || Number(amount) > 1000000) {
      throw new ApiError("INVALID_AMOUNT", "Enter a deposit amount between 1 and 1,000,000.");
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) throw new ApiError("INVALID_PHONE", "Enter a valid M-Pesa phone number.");

    if (!paymentProvider.enabled()) {
      throw new ApiError(
        "PAYMENTS_DISABLED",
        "Payments are not configured in this release. Set PAYMENT_PROVIDER and, for live sandbox pushes, the MPESA_* credentials.",
        403,
      );
    }

    const idempotencyKey = typeof data.idempotencyKey === "string" && data.idempotencyKey
      ? data.idempotencyKey.slice(0, 80)
      : crypto.randomUUID();

    const payment = await prisma.payment.create({
      data: { userId: user.id, provider: "SANDBOX", idempotencyKey, amount, currency: "USD", status: "DEPOSIT_PENDING" },
    });

    try {
      const result = await paymentProvider.initializeDeposit({ amount, phone: normalizedPhone, idempotencyKey });
      if (result.status === "DEPOSIT_SUCCESS") {
        await prisma.$transaction(
          (tx) => finalizePayment(tx, payment, "DEPOSIT_SUCCESS", amount, result.reference),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { providerReference: result.reference, status: result.status },
        });
      }
      await prisma.auditLog.create({
        data: { actorId: user.id, action: "DEPOSIT_INITIATED", entityType: "Payment", entityId: payment.id, metadata: { provider: result.reference } },
      });
      return NextResponse.json({
        success: true,
        payment: { id: payment.id, reference: result.reference, status: result.status, note: result.note },
      }, { status: result.status === "DEPOSIT_PENDING" ? 202 : 201 });
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "DEPOSIT_FAILED" } });
      if (error instanceof PaymentUnavailableError) return jsonError(new ApiError(error.code, error.message, 403));
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}