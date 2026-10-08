import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user.account) return NextResponse.json({ success: false }, { status: 404 });
    return NextResponse.json({ success: true, account: {
      id: user.account.id, balance: user.account.balance.toFixed(2),
      realBalance: user.account.realBalance.toFixed(2),
      status: user.account.status, label: "DEMO ACCOUNT — VIRTUAL FUNDS", currency: "USD",
      realLabel: "REAL ACCOUNT — SANDBOX FUNDS",
    } });
  } catch (error) { return jsonError(error); }
}