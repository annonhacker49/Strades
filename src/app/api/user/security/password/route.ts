import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { digest, hashPassword, verifyPassword } from "@/lib/security";

function strongPassword(password: string): boolean {
  return password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) &&
    /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const data = objectBody(await request.json());
    const currentPassword = typeof data.currentPassword === "string" ? data.currentPassword : "";
    const newPassword = typeof data.newPassword === "string" ? data.newPassword : "";
    if (!currentPassword || !newPassword || currentPassword.length > 256 || newPassword.length > 128) {
      throw new ApiError("INVALID_INPUT", "Enter your current and new password.");
    }
    if (currentPassword === newPassword) {
      throw new ApiError("INVALID_INPUT", "New password must be different from the current password.");
    }
    if (!strongPassword(newPassword)) {
      throw new ApiError("WEAK_PASSWORD", "Use at least 12 characters with upper- and lowercase letters, a number, and a symbol.");
    }
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!record || !verifyPassword(currentPassword, record.passwordHash)) {
      throw new ApiError("INVALID_CREDENTIALS", "Current password is incorrect.", 403);
    }
    const cookie = request.headers.get("cookie") ?? "";
    const currentToken = cookie.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("tradedemo_session="))
      ?.slice("tradedemo_session=".length);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } }),
      prisma.session.deleteMany({
        where: { userId: user.id, ...(currentToken ? { NOT: { tokenHash: digest(currentToken) } } : {}) },
      }),
      prisma.auditLog.create({
        data: { actorId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id },
      }),
    ]);
    return NextResponse.json({ success: true, message: "Password updated. Other signed-in sessions have been signed out." });
  } catch (error) {
    return jsonError(error);
  }
}