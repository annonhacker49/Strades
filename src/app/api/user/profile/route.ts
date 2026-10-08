import { NextResponse } from "next/server";
import { ApiError, jsonError, objectBody, requireUser } from "@/lib/api";
import { emailVerificationRequired } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function publicUser(user: {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  role: string; kycStatus: string; emailVerifiedAt: Date | null; twoFactorEnabled: boolean; createdAt: Date;
}) {
  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email,
    phone: user.phone, role: user.role, kycStatus: user.kycStatus,
    emailVerified: Boolean(user.emailVerifiedAt), twoFactorEnabled: user.twoFactorEnabled,
    emailVerificationRequired: emailVerificationRequired(),
    createdAt: user.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ success: true, user: publicUser(user) });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request);
    const data = objectBody(await request.json());
    const firstName = typeof data.firstName === "string" ? data.firstName.trim() : undefined;
    const lastName = typeof data.lastName === "string" ? data.lastName.trim() : undefined;
    if (firstName !== undefined && (firstName.length < 1 || firstName.length > 60)) {
      throw new ApiError("INVALID_INPUT", "First name must be between 1 and 60 characters.");
    }
    if (lastName !== undefined && (lastName.length < 1 || lastName.length > 60)) {
      throw new ApiError("INVALID_INPUT", "Last name must be between 1 and 60 characters.");
    }
    if (firstName === undefined && lastName === undefined) {
      throw new ApiError("INVALID_INPUT", "Nothing to update.");
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
      },
    });
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "PROFILE_UPDATED", entityType: "User", entityId: user.id,
        metadata: { firstName: updated.firstName, lastName: updated.lastName } },
    });
    return NextResponse.json({ success: true, user: publicUser(updated) });
  } catch (error) { return jsonError(error); }
}
