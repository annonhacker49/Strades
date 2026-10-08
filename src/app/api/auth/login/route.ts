import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, clientAddress, createSession, rateLimit, verifyPassword } from "@/lib/security";
import { decryptTotpSecret, verifyTotp } from "@/lib/totp";
import { emailVerificationRequired } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const data = objectBody(await request.json());
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const twoFactorCode = typeof data.twoFactorCode === "string" ? data.twoFactorCode : "";
    if (!email || !password || email.length > 254 || password.length > 256) {
      throw new ApiError("INVALID_INPUT", "Enter your email and password.");
    }
    const address = clientAddress(request);
    const emailKey = `login-email:${email}`;
    if (!rateLimit(`login-address:${address}`, 120, 5 * 60_000) || !rateLimit(emailKey, 20, 5 * 60_000)) {
      throw new ApiError("RATE_LIMITED", "Too many sign-in attempts. Wait five minutes, then try again.", 429);
    }
    const user = await prisma.user.findUnique({ where: { email }, include: { account: true } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await prisma.auditLog.create({ data: {
        actorId: user?.id, action: "LOGIN_FAILED", entityType: "User", entityId: user?.id,
        ipAddress: clientAddress(request), userAgent: request.headers.get("user-agent"),
      } });
      throw new ApiError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
    }
    if (emailVerificationRequired() && !user.emailVerifiedAt) {
      throw new ApiError("EMAIL_NOT_VERIFIED", "Verify your email before signing in.", 403);
    }
    if (user.suspendedAt) throw new ApiError("ACCOUNT_SUSPENDED", "This account is suspended.", 403);
    if (user.twoFactorEnabled) {
      if (!/^[a-fA-F0-9]{64}$/.test(process.env.TOTP_ENCRYPTION_KEY ?? "")) {
        throw new ApiError("TWO_FACTOR_UNAVAILABLE", "Authenticator sign-in is temporarily unavailable.", 503);
      }
      if (!user.twoFactorSecret || !verifyTotp(decryptTotpSecret(user.twoFactorSecret), twoFactorCode)) {
        throw new ApiError("INVALID_2FA_CODE", "Enter a valid authenticator code.", 401);
      }
    }
    clearRateLimit(emailKey);
    const session = await createSession(user.id);
    await prisma.auditLog.create({ data: {
      actorId: user.id, action: "LOGIN", entityType: "User", entityId: user.id,
      ipAddress: clientAddress(request), userAgent: request.headers.get("user-agent"),
    } });
    const response = NextResponse.json({ success: true, user: { id: user.id, firstName: user.firstName, email: user.email, role: user.role } });
    response.headers.set("Set-Cookie", session.cookie);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
