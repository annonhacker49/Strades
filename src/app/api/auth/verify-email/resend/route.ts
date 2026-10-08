import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ApiError, jsonError, objectBody } from "@/lib/api";
import { appUrl, sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { clientAddress, digest, rateLimit } from "@/lib/security";

export async function POST(request: Request) {
  try {
    if (!rateLimit(`verify-email:${clientAddress(request)}`, 5)) {
      throw new ApiError("RATE_LIMITED", "Try again later.", 429);
    }
    const body = objectBody(await request.json());
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254) throw new ApiError("INVALID_INPUT", "Enter a valid email address.");
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt) {
      const token = randomBytes(32).toString("base64url");
      await prisma.emailVerificationToken.create({
        data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
      });
      await sendTransactionalEmail({
        to: user.email,
        subject: "Verify your STRADES email",
        text: `Verify your email within 30 minutes: ${appUrl()}/verify-email?token=${encodeURIComponent(token)}`,
      });
    }
    return NextResponse.json({ success: true, message: "If the account needs verification, an email will be sent." });
  } catch (error) {
    return jsonError(error);
  }
}
