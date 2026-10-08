-- CreateEnum
CREATE TYPE "TradeContractType" AS ENUM ('DIRECTION', 'OVER_UNDER');

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "contractType" "TradeContractType" NOT NULL DEFAULT 'DIRECTION',
ADD COLUMN     "targetPrice" DECIMAL(24,10);
