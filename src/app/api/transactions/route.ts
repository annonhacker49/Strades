import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100,
    });
    return NextResponse.json({ success: true, transactions });
  } catch (error) { return jsonError(error); }
}
