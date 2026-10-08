import { NextResponse } from "next/server";
import { brand } from "@/lib/brand";
import { getMarketSnapshots } from "@/lib/market-data";

export async function GET() {
  try {
    const markets = await getMarketSnapshots();
    return NextResponse.json({ success: true, ...markets, expirySeconds: brand.expirySeconds });
  } catch (error) {
    console.error("Market data unavailable", error);
    return NextResponse.json({
      success: false,
      error: { code: "MARKET_DATA_UNAVAILABLE", message: "Market data is temporarily unavailable." },
    }, { status: 503 });
  }
}
