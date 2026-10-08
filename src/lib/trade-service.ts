import { Prisma } from "@prisma/client";
import { brand, type Asset } from "./brand";
import { ApiError } from "./api";
import { getMarketQuote } from "./market-data";
import { prisma } from "./prisma";
import { isAllowedExpiry, resolveTrade } from "./trading";

function isAsset(value: string): value is Asset {
  return (brand.allowedAssets as readonly string[]).includes(value);
}

export type TradeMode = "DEMO" | "REAL";
export type TradeContractType = "DIRECTION" | "OVER_UNDER" | "LAST_DIGIT";

function isSelectedDigit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 9;
}

export async function createDemoTrade(input: {
  userId: string;
  accountId: string;
  asset: string;
  direction: "UP" | "DOWN";
  contractType?: TradeContractType;
  targetPrice?: string;
  selectedDigit?: number;
  stake: string;
  expirySeconds: number;
  mode?: TradeMode;
}) {
  if (!isAsset(input.asset)) throw new ApiError("INVALID_ASSET", "Select a supported simulated asset.");
  const mode = input.mode === "REAL" ? "REAL" : "DEMO";
  const contractType = input.contractType ?? "DIRECTION";
  if (contractType !== "DIRECTION" && contractType !== "OVER_UNDER" && contractType !== "LAST_DIGIT") {
    throw new ApiError("INVALID_CONTRACT", "Select a supported demo contract.");
  }
  if ((contractType === "LAST_DIGIT" || contractType === "OVER_UNDER") &&
      !isSelectedDigit(input.selectedDigit)) {
    throw new ApiError("INVALID_DIGIT", "Select a single digit between 0 and 9.");
  }
  if (!isAllowedExpiry(input.expirySeconds)) throw new ApiError("INVALID_EXPIRY", "Select a supported expiry period.");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(input.stake) ||
      new Prisma.Decimal(input.stake).lt(1) || new Prisma.Decimal(input.stake).gt(10000)) {
    throw new ApiError("INVALID_STAKE", "Stake must be between $1 and $10,000.");
  }

  const entryPrice = (await getMarketQuote(input.asset)).price.toFixed(10);
  const targetPrice = contractType === "OVER_UNDER" && input.targetPrice ? input.targetPrice : undefined;
  const payoutRate = brand.defaultPayoutRate;
  const potentialPayout = new Prisma.Decimal(input.stake).mul(payoutRate).toDecimalPlaces(2).toFixed(2);
  const tradeId = crypto.randomUUID();

  try {
    return await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: input.accountId } });
      if (!account || account.status !== "ACTIVE") throw new ApiError("ACCOUNT_UNAVAILABLE", "Your trading account is unavailable.", 403);
      const available = mode === "REAL" ? account.realBalance : account.balance;
      const balanceBefore = available.toFixed(2);
      const updated = mode === "REAL"
        ? await tx.account.updateMany({
          where: { id: account.id, status: "ACTIVE", realBalance: { gte: new Prisma.Decimal(input.stake) } },
          data: { realBalance: { decrement: new Prisma.Decimal(input.stake) } },
        })
        : await tx.account.updateMany({
          where: { id: account.id, status: "ACTIVE", balance: { gte: new Prisma.Decimal(input.stake) } },
          data: { balance: { decrement: new Prisma.Decimal(input.stake) } },
        });
      if (updated.count !== 1) throw new ApiError("INSUFFICIENT_BALANCE", "Insufficient balance for that stake.");
      const balanceAfter = new Prisma.Decimal(balanceBefore).minus(input.stake).toFixed(2);
      const expiresAt = new Date(Date.now() + input.expirySeconds * 1000);
      const trade = await tx.trade.create({
        data: {
          id: tradeId,
          userId: input.userId,
          accountId: account.id,
          asset: input.asset,
          contractType,
          direction: input.direction,
          mode,
          stake: new Prisma.Decimal(input.stake),
          entryPrice: new Prisma.Decimal(entryPrice),
          targetPrice: targetPrice ? new Prisma.Decimal(targetPrice) : null,
          selectedDigit: (contractType === "LAST_DIGIT" || contractType === "OVER_UNDER")
            ? input.selectedDigit : null,
          payoutRate: new Prisma.Decimal(payoutRate),
          potentialPayout: new Prisma.Decimal(potentialPayout),
          expiresAt,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          type: "TRADE_STAKE",
          amount: new Prisma.Decimal(input.stake).negated(),
          balanceBefore,
          balanceAfter,
          referenceType: "TRADE",
          referenceId: trade.id,
        },
      });
      await tx.transaction.create({
        data: {
          userId: input.userId,
          accountId: account.id,
          type: "TRADE",
          amount: new Prisma.Decimal(input.stake).negated(),
          reference: `trade:${trade.id}`,
        },
      });
      await tx.auditLog.create({
        data: { actorId: input.userId, action: "TRADE_CREATED", entityType: "Trade", entityId: trade.id },
      });
      return trade;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new ApiError("TRADE_CONFLICT", "Balance changed during placement. Please retry.", 409);
    }
    throw error;
  }
}

export async function settleExpiredTrades() {
  const expired = await prisma.trade.findMany({
    where: { status: "OPEN", expiresAt: { lte: new Date() } },
    take: 100,
    orderBy: { expiresAt: "asc" },
  });
  for (const trade of expired) {
    const exit = (await getMarketQuote(trade.asset as Asset)).price.toFixed(10);
    const result = resolveTrade(
      trade.direction,
      trade.stake.toFixed(2),
      trade.payoutRate.toFixed(4),
      trade.entryPrice.toString(),
      exit,
      trade.contractType,
      trade.targetPrice?.toString(),
      trade.selectedDigit ?? undefined,
    );
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.trade.updateMany({
        where: { id: trade.id, status: "OPEN" },
        data: { status: "SETTLED", exitPrice: new Prisma.Decimal(exit), closedAt: new Date(),
          result: result.result },
      });
      if (!claimed.count) return;
      const account = await tx.account.findUniqueOrThrow({ where: { id: trade.accountId } });
      const poolBefore = trade.mode === "REAL" ? account.realBalance : account.balance;
      const creditPool = trade.mode === "REAL" ? account.realBalance : account.balance;
      if (result.credit !== "0.00") {
        const updated = trade.mode === "REAL"
          ? await tx.account.updateMany({
            where: { id: account.id },
            data: { realBalance: { increment: new Prisma.Decimal(result.credit) } },
          })
          : await tx.account.updateMany({
            where: { id: account.id },
            data: { balance: { increment: new Prisma.Decimal(result.credit) } },
          });
        if (updated.count !== 1) throw new Error("Settlement account update failed");
      }
      const balanceAfter = result.credit === "0.00"
        ? poolBefore.toFixed(2)
        : creditPool.plus(result.credit).toFixed(2);
      if (result.credit !== "0.00") {
        await tx.ledgerEntry.create({
          data: {
            accountId: account.id,
            type: result.result === "TIE" ? "TRADE_REFUND" : "TRADE_WIN",
            amount: new Prisma.Decimal(result.credit),
            balanceBefore: poolBefore,
            balanceAfter,
            referenceType: "TRADE",
            referenceId: trade.id,
          },
        });
      } else {
        await tx.ledgerEntry.create({
          data: {
            accountId: account.id,
            type: "TRADE_LOSS",
            amount: new Prisma.Decimal("0"),
            balanceBefore: poolBefore,
            balanceAfter,
            referenceType: "TRADE",
            referenceId: trade.id,
          },
        });
      }
      await tx.transaction.create({
        data: {
          userId: trade.userId,
          accountId: account.id,
          type: "TRADE",
          amount: new Prisma.Decimal(result.credit),
          reference: `settlement:${trade.id}`,
        },
      });
      await tx.auditLog.create({
        data: { actorId: trade.userId, action: "TRADE_SETTLED", entityType: "Trade", entityId: trade.id,
          metadata: { result: result.result, exitPrice: exit, mode: trade.mode } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}