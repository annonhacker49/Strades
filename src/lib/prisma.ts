import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function datasourceOptions(): ConstructorParameters<typeof PrismaClient>[0] {
  const url = process.env.DATABASE_URL;
  if (!url) return {};
  const separator = url.includes("?") ? "&" : "?";
  const target = url.includes("connection_limit") ? url : `${url}${separator}connection_limit=3`;
  return { datasources: { db: { url: target } } };
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...datasourceOptions(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
