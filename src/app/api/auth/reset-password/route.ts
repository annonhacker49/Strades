import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { digest, hashPassword } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = objectBody(await request.json());
    if (typeof body.token !== "string" || body.token.length > 200 ||
        typeof body.password !== "string" || body.password.length > 128) {
      throw new ApiError("INVALID_INPUT", "Password reset link or password is invalid.");
    }
    const password = body.password;
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
        !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new ApiError("WEAK_PASSWORD", "Use at least 12 characters with upper- and lowercase letters, a number, and a symbol.");
    }
    await prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash: digest(body.token as string) } });
      if (!record || record.usedAt || record.expiresAt <= new Date()) {
        throw new ApiError("INVALID_TOKEN", "Reset link is invalid or expired.");
      }
      await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash: hashPassword(password) } });
      await tx.session.deleteMany({ where: { userId: record.userId } });
      await tx.auditLog.create({
        data: { actorId: record.userId, action: "PASSWORD_RESET", entityType: "User", entityId: record.userId },
      });
    });
    return NextResponse.json({ success: true, message: "Password reset. Please sign in again." });
  } catch (error) {
    return jsonError(error);
  }
}
