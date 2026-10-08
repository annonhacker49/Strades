import { NextResponse } from "next/server";
import { clearSessionCookie, currentUser, revokeSession } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await currentUser(request);
  await revokeSession(request);
  if (user) await prisma.auditLog.create({ data: { actorId: user.id, action: "LOGOUT", entityType: "User", entityId: user.id } });
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
