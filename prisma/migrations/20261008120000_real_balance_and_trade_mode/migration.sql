-- AlterTable
ALTER TABLE "Account" ADD COLUMN "realBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "TradeMode" AS ENUM ('DEMO', 'REAL');

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "mode" "TradeMode" NOT NULL DEFAULT 'DEMO';