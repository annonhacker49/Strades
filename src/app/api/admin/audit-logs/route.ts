import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId")?.trim().slice(0, 100) ?? "";
    const action = url.searchParams.get("action")?.trim().slice(0, 60) ?? "";
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 100));
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId ? { actorId: userId } : {}),
        ...(action ? { action } : {}),
      },
      select: {
        id: true, actorId: true, action: true, entityType: true, entityId: true,
        metadata: true, createdAt: true,
        actor: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error) { return jsonError(error); }
}