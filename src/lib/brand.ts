export const brand = {
  name: "STRADES",
  tagline: "Practice with virtual funds",
  demoStartingBalance: "10000.00",
  defaultPayoutRate: "0.80",
  allowedAssets: [
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "USD/CHF",
    "AUD/USD",
    "USD/CAD",
    "XAU/USD",
    "XAG/USD",
    "BTC/USD",
    "ETH/USD",
    "XRP/USD",
    "SOL/USD",
  ] as const,
  expirySeconds: [10, 15, 30, 60, 120],
} as const;

export type Asset = (typeof brand.allowedAssets)[number];
export type Direction = "UP" | "DOWN";
export type TradeResult = "WIN" | "LOSS" | "TIE";

export const simulatedPrices: Record<string, number> = {
  "EUR/USD": 1.08432,
  "GBP/USD": 1.27186,
  "USD/JPY": 149.428,
  "USD/CHF": 0.87941,
  "AUD/USD": 0.65219,
  "USD/CAD": 1.36355,
  "XAU/USD": 2328.72,
  "XAG/USD": 27.416,
  "BTC/USD": 67254.18,
  "ETH/USD": 3521.44,
  "XRP/USD": 0.5137,
  "SOL/USD": 148.29,
  "Gold/USD": 2328.72,
};