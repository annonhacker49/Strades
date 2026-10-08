import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";

export type FinalizeStatus = "DEPOSIT_SUCCESS" | "WITHDRAWAL_SUCCESS";

/**
 * Moves a payment into its final state and settles the real (sandbox)
 * balance pool atomically. Deposit success credits, withdrawal success debits.
 */
export async function finalizePayment(
  tx: Prisma.TransactionClient,
  payment: { id: string; userId: string; amount: Prisma.Decimal },
  status: FinalizeStatus,
  amount: string,
  reference: string,
): Promise<{ balance: string }> {
  const signed = status === "DEPOSIT_SUCCESS"
    ? new Prisma.Decimal(amount)
    : new Prisma.Decimal(amount).negated();
  const account = await tx.account.findUniqueOrThrow({ where: { userId: payment.userId } });

  if (status === "WITHDRAWAL_SUCCESS" && account.realBalance.plus(signed).lt(0)) {
    await tx.payment.updateMany({
      where: { id: payment.id, status: "WITHDRAWAL_PENDING" },
      data: { status: "WITHDRAWAL_FAILED" },
    });
    throw new ApiError(
      "INSUFFICIENT_BALANCE",
      "Your real (sandbox) account balance is too low for that withdrawal.",
      409,
    );
  }

  const balanceAfter = account.realBalance.plus(signed);
  const updated = await tx.account.updateMany({
    where: { id: account.id, realBalance: account.realBalance },
    data: { realBalance: balanceAfter },
  });
  if (!updated.count) throw new Error("PAYMENT_SETTLEMENT_CONFLICT");

  const pending = status === "DEPOSIT_SUCCESS" ? "DEPOSIT_PENDING" : "WITHDRAWAL_PENDING";
  const claimed = await tx.payment.updateMany({
    where: { id: payment.id, status: pending },
    data: { status, providerReference: reference },
  });
  if (!claimed.count) throw new Error("PAYMENT_ALREADY_SETTLED");

  await tx.ledgerEntry.create({
    data: {
      accountId: account.id,
      type: "PAYMENT",
      amount: signed,
      balanceBefore: account.realBalance,
      balanceAfter,
      referenceType: "PAYMENT",
      referenceId: payment.id,
    },
  });
  await tx.transaction.create({
    data: {
      userId: payment.userId,
      accountId: account.id,
      type: "PAYMENT",
      amount: signed,
      reference: `payment:${payment.id}`,
    },
  });
  await tx.auditLog.create({
    data: {
      actorId: payment.userId,
      action: status === "DEPOSIT_SUCCESS" ? "DEPOSIT_CONFIRMED" : "WITHDRAWAL_CONFIRMED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { amount: signed.toFixed(2), provider: reference },
    },
  });
  return { balance: balanceAfter.toFixed(2) };
}

export function parsePaymentAmount(payment: { amount: Prisma.Decimal }, provided?: string): string {
  if (provided && /^\d+\.?\d*$/.test(provided)) return provided;
  return payment.amount.toFixed(2);
}