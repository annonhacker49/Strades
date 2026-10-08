import type { Direction, TradeResult } from "./brand";
import { brand } from "./brand";

export type TradeOutcome = {
  result: TradeResult;
  profit: string;
  credit: string;
};

function cents(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Invalid decimal amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

function formatCents(value: bigint): string {
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / BigInt(100)}.${String(abs % BigInt(100)).padStart(2, "0")}`;
}

function decimalUnits(value: string, precision: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error("Invalid decimal price");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > precision) throw new Error("Invalid decimal precision");
  return BigInt(whole) * BigInt(10 ** precision) + BigInt(fraction.padEnd(precision, "0") || "0");
}

function compareDecimals(left: string, right: string): number {
  const precision = Math.max(left.split(".")[1]?.length ?? 0, right.split(".")[1]?.length ?? 0);
  const leftUnits = decimalUnits(left, precision);
  const rightUnits = decimalUnits(right, precision);
  return leftUnits === rightUnits ? 0 : leftUnits > rightUnits ? 1 : -1;
}

export function lastPriceDigit(price: string): number {
  const [whole, fraction = ""] = price.split(".");
  const significant = fraction.replace(/0+$/, "");
  const representative = significant || whole;
  return Number(representative.slice(-1));
}

type ContractType = "DIRECTION" | "OVER_UNDER" | "LAST_DIGIT";

export function resolveTrade(
  direction: Direction,
  stake: string,
  payoutRate: string,
  entryPrice: string,
  exitPrice: string,
  contractType: ContractType = "DIRECTION",
  targetPrice?: string,
  selectedDigit?: number,
): TradeOutcome {
  let result: TradeResult;
  if (contractType === "LAST_DIGIT") {
    if (selectedDigit === undefined || selectedDigit < 0 || selectedDigit > 9) {
      throw new Error("A valid selected digit is required.");
    }
    result = lastPriceDigit(exitPrice) === selectedDigit ? "WIN" : "LOSS";
  } else if (contractType === "OVER_UNDER" && selectedDigit !== undefined) {
    if (selectedDigit < 0 || selectedDigit > 9) {
      throw new Error("A valid selected digit is required.");
    }
    const digit = lastPriceDigit(exitPrice);
    // Over wins when the indicator is at or above the chosen digit (a tie belongs to Over);
    // Under wins when it is strictly below. This yields a 50/50 price for an evenly chosen side.
    result = (direction === "UP") === (digit >= selectedDigit) ? "WIN" : "LOSS";
  } else {
    const comparison = compareDecimals(
      exitPrice,
      contractType === "OVER_UNDER" ? targetPrice ?? "" : entryPrice,
    );
    result = comparison === 0
      ? "TIE"
      : (direction === "UP") === (comparison > 0) ? "WIN" : "LOSS";
  }
  const stakeCents = cents(stake);
  const payoutUnits = decimalUnits(payoutRate, 4);
  const scaledPayout = stakeCents * payoutUnits;
  const payoutCents = (scaledPayout + BigInt(5000)) / BigInt(10000);

  if (result === "WIN") {
    return {
      result,
      profit: formatCents(payoutCents),
      credit: formatCents(stakeCents + payoutCents),
    };
  }
  if (result === "TIE") {
    return { result, profit: "0.00", credit: formatCents(stakeCents) };
  }
  return { result, profit: formatCents(-stakeCents), credit: "0.00" };
}

export function reserveBalance(balance: string, stake: string): string {
  const available = cents(balance);
  const amount = cents(stake);
  if (amount <= BigInt(0)) throw new Error("Stake must be greater than zero");
  if (amount > available) throw new Error("INSUFFICIENT_BALANCE");
  return formatCents(available - amount);
}

export function isAllowedExpiry(seconds: number): boolean {
  return (brand.expirySeconds as readonly number[]).includes(seconds);
}
