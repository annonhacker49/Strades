import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const search = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
    const users = await prisma.user.findMany({
      where: search ? { OR: [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ] } : {},
      select: { id: true, firstName: true, lastName: true, email: true, role: true, suspendedAt: true, createdAt: true, account: { select: { balance: true, status: true } } },
      orderBy: { createdAt: "desc" }, take: 50,
    });
    return NextResponse.json({ success: true, users });
  } catch (error) { return jsonError(error); }
}
