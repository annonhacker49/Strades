import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { digest } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = objectBody(await request.json());
    if (typeof body.token !== "string" || body.token.length > 200) {
      throw new ApiError("INVALID_TOKEN", "Verification link is invalid or expired.");
    }
    const verified = await prisma.$transaction(async (tx) => {
      const record = await tx.emailVerificationToken.findUnique({ where: { tokenHash: digest(body.token as string) } });
      if (!record || record.usedAt || record.expiresAt <= new Date()) {
        throw new ApiError("INVALID_TOKEN", "Verification link is invalid or expired.", 400);
      }
      await tx.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
      await tx.auditLog.create({
        data: { actorId: record.userId, action: "EMAIL_VERIFIED", entityType: "User", entityId: record.userId },
      });
      return true;
    });
    return NextResponse.json({ success: verified, message: "Email verified. You can now use your account." });
  } catch (error) {
    return jsonError(error);
  }
}
