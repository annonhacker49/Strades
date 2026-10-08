"use client";

import { useEffect, useState } from "react";

type Quote = { asset: string; price: number; source: "SIMULATED" | "PROVIDER" };

function formatPrice(price: number): string {
  const decimals = price < 1000 ? 5 : 2;
  return price.toFixed(decimals);
}

export function Ticker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [previousQuotes, setPreviousQuotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/markets", { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        if (response.ok && data.success && Array.isArray(data.assets)) {
          const items = data.assets as Quote[];
          setPreviousQuotes(Object.fromEntries(items.map((item) => [item.asset, item.price])));
          setQuotes(items);
          setLoading(false);
        }
      } catch { /* keep last state */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const items = quotes.length > 0
    ? quotes.map((quote) => {
        const prev = previousQuotes[quote.asset];
        const delta = prev === undefined || prev === 0 ? 0 : (quote.price - prev) / prev;
        const up = delta >= 0;
        return (
          <li key={quote.asset} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs font-bold tracking-[0.14em] text-[var(--lp-fg)]">{quote.asset}</span>
            <span className="font-mono text-xs text-[var(--lp-muted)]">{formatPrice(quote.price)}</span>
            <span className={`text-[10px] font-bold ${up ? "text-emerald-500" : "text-rose-500"}`}>{up ? "▲" : "▼"}{Math.abs(delta * 100).toFixed(2)}%</span>
            <span className="mx-4 h-1 w-1 rounded-full bg-[var(--lp-line)]" aria-hidden="true" />
          </li>
        );
      })
    : Array.from({ length: 12 }, (_, index) => (
        <li key={index} className="whitespace-nowrap text-xs text-[var(--lp-muted)]">Loading market…</li>
      ));

  return (
    <div className="ticker-paused relative overflow-hidden border-y border-[var(--lp-line)] bg-[var(--lp-deep)] py-3">
      <div className={`flex w-max items-center ${loading ? "" : "animate-ticker"}`}>
        <ul className="flex items-center">{items}</ul>
        {!loading && (
          <ul className="flex items-center" aria-hidden="true">{items}</ul>
        )}
      </div>
    </div>
  );
}