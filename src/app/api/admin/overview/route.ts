import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [totalUsers, suspendedUsers, admins, accountSums, tradeGroups, depositSums, todayUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { suspendedAt: { not: null } } }),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.account.aggregate({ _sum: { balance: true, realBalance: true } }),
        prisma.trade.groupBy({ by: ["status", "result"], _count: { _all: true } }),
        prisma.payment.aggregate({ where: { status: "DEPOSIT_SUCCESS" }, _sum: { amount: true } }),
        prisma.user.count({ where: { createdAt: { gte: dayStart } } }),
      ]);

    let openTrades = 0;
    let settledTrades = 0;
    let wins = 0;
    for (const group of tradeGroups) {
      const count = group._count._all;
      if (group.status === "OPEN") openTrades += count;
      if (group.status === "SETTLED") settledTrades += count;
      if (group.status === "SETTLED" && group.result === "WIN") wins += count;
    }

    const asNumber = (value: unknown) => Number((value as { toString?: () => string })?.toString?.() ?? 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        suspendedUsers,
        admins,
        todayUsers,
        demoBalance: asNumber(accountSums._sum.balance),
        realBalance: asNumber(accountSums._sum.realBalance),
        depositedAmount: asNumber(depositSums._sum.amount),
        totalTrades: openTrades + settledTrades,
        openTrades,
        settledTrades,
        wins,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}