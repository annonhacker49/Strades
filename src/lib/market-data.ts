import { brand, type Asset } from "./brand";
import { marketSimulation } from "./market-simulation";

export type MarketQuote = {
  asset: Asset;
  price: number;
  timestamp: string;
  source: "SIMULATED" | "PROVIDER";
};

let snapshotCache: { expiresAt: number; value: Awaited<ReturnType<typeof buildMarketSnapshots>> } | undefined;
let snapshotRequest: Promise<Awaited<ReturnType<typeof buildMarketSnapshots>>> | undefined;

export async function getMarketQuote(asset: Asset): Promise<MarketQuote> {
  const endpoint = process.env.MARKET_DATA_URL;
  if (!endpoint) {
    return {
      asset,
      price: marketSimulation.getPrice(asset),
      timestamp: new Date().toISOString(),
      source: "SIMULATED",
    };
  }
  const apiKey = process.env.MARKET_DATA_API_KEY;
  if (!apiKey) throw new Error("MARKET_DATA_API_KEY is required when a live market endpoint is configured.");
  const url = new URL(endpoint);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("MARKET_DATA_URL must use HTTPS in production.");
  }
  url.searchParams.set("asset", asset);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Market data provider returned HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null) throw new Error("Market provider response is invalid.");
  const data = payload as { asset?: unknown; price?: unknown; timestamp?: unknown };
  const price = typeof data.price === "number" ? data.price
    : typeof data.price === "string" && /^\d+(\.\d+)?$/.test(data.price) ? Number(data.price) : NaN;
  const timestamp = typeof data.timestamp === "string" ? new Date(data.timestamp) : new Date(NaN);
  if (data.asset !== asset || !Number.isFinite(price) || price <= 0 ||
      !Number.isFinite(timestamp.getTime()) || Math.abs(Date.now() - timestamp.getTime()) > 60_000) {
    throw new Error("Market provider returned an invalid or stale quote.");
  }
  return { asset, price, timestamp: timestamp.toISOString(), source: "PROVIDER" };
}

async function buildMarketSnapshots() {
  const quotes = await Promise.all(brand.allowedAssets.map((asset) => getMarketQuote(asset)));
  return {
    label: process.env.MARKET_DATA_URL ? "PROVIDER MARKET DATA" : "SIMULATED MARKET DATA",
    assets: quotes.map((quote) => ({
      ...quote,
      history: quote.source === "SIMULATED"
        ? marketSimulation.getHistory(quote.asset)
        : [{ time: new Date(quote.timestamp).getTime(), price: quote.price }],
    })),
  };
}

export async function getMarketSnapshots() {
  if (snapshotCache && snapshotCache.expiresAt > Date.now()) return snapshotCache.value;
  if (snapshotRequest) return snapshotRequest;
  snapshotRequest = buildMarketSnapshots();
  try {
    const value = await snapshotRequest;
    snapshotCache = { value, expiresAt: Date.now() + 2000 };
    return value;
  } finally {
    snapshotRequest = undefined;
  }
}
