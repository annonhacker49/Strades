import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createDemoTrade, settleExpiredTrades } from "@/lib/trade-service";
import { emailVerificationRequired } from "@/lib/email";

type TradeContractType = "DIRECTION" | "OVER_UNDER" | "LAST_DIGIT";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    await settleExpiredTrades();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const take = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const trades = await prisma.trade.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take, take,
    });
    const total = await prisma.trade.count({ where: { userId: user.id } });
    return NextResponse.json({ success: true, trades, page, pages: Math.ceil(total / take), total });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (emailVerificationRequired() && !user.emailVerifiedAt) {
      throw new ApiError("EMAIL_NOT_VERIFIED", "Verify your email before placing a trade.", 403);
    }
    if (!user.account) throw new ApiError("ACCOUNT_UNAVAILABLE", "Your trading account is unavailable.", 403);
    const data = objectBody(await request.json());
    if (data.direction !== "UP" && data.direction !== "DOWN") {
      throw new ApiError("INVALID_DIRECTION", "Select Up/Down or Over/Under.");
    }
    if (data.contractType !== undefined &&
        data.contractType !== "DIRECTION" && data.contractType !== "OVER_UNDER" && data.contractType !== "LAST_DIGIT") {
      throw new ApiError("INVALID_CONTRACT", "Select a supported trading contract.");
    }
    if (typeof data.asset !== "string" || typeof data.stake !== "string" || typeof data.expirySeconds !== "number") {
      throw new ApiError("INVALID_INPUT", "Trade details are incomplete.");
    }
    const contractType = data.contractType as TradeContractType | undefined;
    const mode: "DEMO" | "REAL" = data.mode === "real" ? "REAL" : "DEMO";
    if ((contractType === "LAST_DIGIT" || contractType === "OVER_UNDER") &&
        (typeof data.selectedDigit !== "number" || !Number.isInteger(data.selectedDigit) ||
         data.selectedDigit < 0 || data.selectedDigit > 9)) {
      throw new ApiError("INVALID_DIGIT", "Select a single digit between 0 and 9.");
    }
    const trade = await createDemoTrade({
      userId: user.id, accountId: user.account.id, asset: data.asset,
      direction: data.direction,
      contractType,
      targetPrice: typeof data.targetPrice === "string" ? data.targetPrice : undefined,
      selectedDigit: (contractType === "LAST_DIGIT" || contractType === "OVER_UNDER")
        ? (typeof data.selectedDigit === "number" ? data.selectedDigit : undefined)
        : undefined,
      stake: data.stake, expirySeconds: data.expirySeconds,
      mode,
    });
    return NextResponse.json({ success: true, trade }, { status: 201 });
  } catch (error) { return jsonError(error); }
}