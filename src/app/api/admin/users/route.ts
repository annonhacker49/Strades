import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody, requireAdmin } from "@/lib/api";
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
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        role: true, kycStatus: true, twoFactorEnabled: true,
        suspendedAt: true, createdAt: true,
        account: { select: { balance: true, realBalance: true, status: true } },
      },
      orderBy: { createdAt: "desc" }, take: 50,
    });
    return NextResponse.json({ success: true, users });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const data = objectBody(await request.json());
    const userId = typeof data.userId === "string" ? data.userId : "";
    const action = data.action;
    if (!userId) throw new ApiError("INVALID_INPUT", "userId is required.");
    if (action !== "suspend" && action !== "unsuspend") {
      throw new ApiError("INVALID_INPUT", "action must be either suspend or unsuspend.");
    }
    if (userId === admin.id) throw new ApiError("INVALID_INPUT", "You cannot suspend your own account.");
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new ApiError("NOT_FOUND", "User not found.", 404);

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: action === "suspend" ? { suspendedAt: new Date() } : { suspendedAt: null },
      });
      if (action === "suspend") await tx.session.deleteMany({ where: { userId } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: action === "suspend" ? "ADMIN_SUSPEND_USER" : "ADMIN_UNSUSPEND_USER",
          entityType: "User",
          entityId: userId,
          metadata: { actor: admin.email },
        },
      });
      return user;
    });

    return NextResponse.json({ success: true, user: { id: updated.id, suspendedAt: updated.suspendedAt } });
  } catch (error) { return jsonError(error); }
}
