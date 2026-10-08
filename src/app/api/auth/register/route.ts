import { NextResponse } from "next/server";
import { brand } from "@/lib/brand";
import { jsonError, ApiError, objectBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { clientAddress, createSession, hashPassword, rateLimit } from "@/lib/security";
import { randomBytes } from "node:crypto";
import { appUrl, emailDeliveryConfigured, emailVerificationRequired, sendTransactionalEmail } from "@/lib/email";
import { digest } from "@/lib/security";

export async function POST(request: Request) {
  try {
    if (!rateLimit(`register:${clientAddress(request)}`, 20, 10 * 60_000)) {
      throw new ApiError("RATE_LIMITED", "Too many accounts have been registered from this network. Wait ten minutes, then try again.", 429);
    }
    const data = objectBody(await request.json());
    const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
    const lastName = typeof data.lastName === "string" ? data.lastName.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const phone = typeof data.phone === "string" ? data.phone.trim() : "";
    const country = typeof data.country === "string" ? data.country.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const dob = typeof data.dateOfBirth === "string" ? new Date(data.dateOfBirth) : new Date("");
    if (firstName.length < 1 || firstName.length > 60 || lastName.length < 1 || lastName.length > 60 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !/^\+[1-9]\d{7,14}$/.test(phone) || country.length < 2 || country.length > 80 ||
        !Number.isFinite(dob.getTime()) || dob >= new Date() ||
        typeof data.termsAccepted !== "boolean" || !data.termsAccepted) {
      throw new ApiError("INVALID_INPUT", "Please check each required registration field.");
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
        !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new ApiError("WEAK_PASSWORD", "Use at least 12 characters with upper- and lowercase letters, a number, and a symbol.");
    }
    const verifyEmail = emailVerificationRequired();
    if (verifyEmail && process.env.NODE_ENV === "production" && !emailDeliveryConfigured()) {
      throw new ApiError(
        "EMAIL_NOT_CONFIGURED",
        "Account registration is temporarily unavailable because verification email is not configured.",
        503,
      );
    }

    const userId = crypto.randomUUID();
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId, firstName, lastName, email, phone, country, dateOfBirth: dob,
          termsAcceptedAt: new Date(), passwordHash: hashPassword(password),
        },
      });
      const account = await tx.account.create({
        data: { userId, balance: brand.demoStartingBalance },
      });
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id, type: "DEMO_INITIAL_BALANCE", amount: brand.demoStartingBalance,
          balanceBefore: "0.00", balanceAfter: brand.demoStartingBalance,
          referenceType: "ACCOUNT", referenceId: account.id,
        },
      });
      await tx.transaction.create({
        data: { userId, accountId: account.id, type: "DEMO_INITIAL_BALANCE",
          amount: brand.demoStartingBalance, reference: `initial:${account.id}` },
      });
      await tx.auditLog.create({ data: { actorId: userId, action: "REGISTER", entityType: "User", entityId: userId,
        ipAddress: clientAddress(request), userAgent: request.headers.get("user-agent") } });
      return { id: user.id, email: user.email, firstName: user.firstName, balance: account.balance.toFixed(2) };
    });
    if (verifyEmail) {
      const verificationToken = randomBytes(32).toString("base64url");
      await prisma.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash: digest(verificationToken),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      try {
        await sendTransactionalEmail({
          to: created.email,
          subject: "Verify your STRADES email",
          text: `Verify your email within 30 minutes: ${appUrl()}/verify-email?token=${encodeURIComponent(verificationToken)}`,
        });
      } catch (error) {
        console.error("Registration created but verification email delivery failed", error);
        await prisma.auditLog.create({
          data: { actorId: created.id, action: "EMAIL_DELIVERY_FAILED", entityType: "User", entityId: created.id },
        });
      }
    }
    const session = await createSession(created.id);
    const response = NextResponse.json({
      success: true,
      user: created,
      accountLabel: "DEMO ACCOUNT — VIRTUAL FUNDS",
      emailVerificationRequired: verifyEmail,
    }, { status: 201 });
    response.headers.set("Set-Cookie", session.cookie);
    return response;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return jsonError(new ApiError("ACCOUNT_EXISTS", "An account already exists with this email or phone.", 409));
    }
    return jsonError(error);
  }
}
