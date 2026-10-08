import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { decryptTotpSecret, encryptTotpSecret, authenticatorUri, newTotpSecret, verifyTotp } from "@/lib/totp";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!/^[a-fA-F0-9]{64}$/.test(process.env.TOTP_ENCRYPTION_KEY ?? "")) {
      throw new ApiError("TWO_FACTOR_UNAVAILABLE", "Authenticator setup is unavailable until the server encryption key is configured.", 503);
    }
    const body = objectBody(await request.json());
    if (body.action === "begin") {
      if (user.twoFactorEnabled) throw new ApiError("ALREADY_ENABLED", "Two-factor authentication is already enabled.");
      const secret = newTotpSecret();
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: encryptTotpSecret(secret), twoFactorEnabled: false },
      });
      return NextResponse.json({
        success: true,
        secret,
        authenticatorUri: authenticatorUri(secret, user.email),
        message: "Add this key to an authenticator app, then confirm with its current six-digit code.",
      });
    }
    if (body.action === "confirm") {
      if (!user.twoFactorSecret || typeof body.code !== "string" ||
          !verifyTotp(decryptTotpSecret(user.twoFactorSecret), body.code)) {
        throw new ApiError("INVALID_2FA_CODE", "The authenticator code is invalid.");
      }
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
      await prisma.auditLog.create({ data: { actorId: user.id, action: "TWO_FACTOR_ENABLED", entityType: "User", entityId: user.id } });
      return NextResponse.json({ success: true, enabled: true });
    }
    throw new ApiError("INVALID_ACTION", "Unsupported two-factor action.");
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    if (!/^[a-fA-F0-9]{64}$/.test(process.env.TOTP_ENCRYPTION_KEY ?? "")) {
      throw new ApiError("TWO_FACTOR_UNAVAILABLE", "Authenticator settings are unavailable until the server encryption key is configured.", 503);
    }
    const body = objectBody(await request.json());
    if (!user.twoFactorEnabled || !user.twoFactorSecret || typeof body.code !== "string" ||
        !verifyTotp(decryptTotpSecret(user.twoFactorSecret), body.code)) {
      throw new ApiError("INVALID_2FA_CODE", "A valid authenticator code is required to disable two-factor authentication.", 403);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "TWO_FACTOR_DISABLED", entityType: "User", entityId: user.id } });
    return NextResponse.json({ success: true, enabled: false });
  } catch (error) {
    return jsonError(error);
  }
}
