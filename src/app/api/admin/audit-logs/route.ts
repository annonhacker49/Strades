import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const logs = await prisma.auditLog.findMany({
      select: { id: true, actorId: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error) { return jsonError(error); }
}
