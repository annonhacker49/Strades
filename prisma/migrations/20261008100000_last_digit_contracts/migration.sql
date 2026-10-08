-- AlterEnum
ALTER TYPE "TradeContractType" ADD VALUE 'LAST_DIGIT';

-- AlterEnum
ALTER TYPE "LedgerType" ADD VALUE 'PAYMENT';

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "selectedDigit" INTEGER;