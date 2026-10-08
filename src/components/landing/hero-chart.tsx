"use client";

import { useEffect, useMemo, useState } from "react";

type Quote = { asset: string; price: number; source: "SIMULATED" | "PROVIDER"; history: { time: number; price: number }[] };

function lastDigitOfPrice(price: number): number {
  const stringValue = price.toFixed(5);
  const [whole, fraction = ""] = stringValue.split(".");
  const significant = fraction.replace(/0+$/, "");
  const representative = significant || whole;
  return Number(representative.slice(-1));
}

const MAX_POINTS = 56;

export function HeroChart() {
  const [history, setHistory] = useState<{ asset: string; price: number }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const response = await fetch("/api/markets", { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        if (response.ok && data.success && Array.isArray(data.assets)) {
          const quote = data.assets[0] as Quote;
          setError(false);
          setHistory((current) => [...current.slice(-(MAX_POINTS - 1)), { asset: quote.asset, price: quote.price }]);
        } else {
          setError(true);
        }
      } catch {
        if (active) setError(true);
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const prices = history.map((point) => point.price);
  const asset = history[0]?.asset ?? "EUR/USD";
  const price = history[history.length - 1]?.price ?? 1.08432;
  const first = prices[0] ?? price;
  const change = first > 0 ? ((price - first) / first) * 100 : 0;
  const up = change >= 0;
  const digit = lastDigitOfPrice(price);
  const displayPrice = price.toFixed(price < 1000 ? 5 : 2);
  const ready = prices.length >= 2;

  const geometry = useMemo(() => {
    if (prices.length < 2) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const toY = (value: number) => 92 - ((value - min) / range) * 84;
    const points = prices.map((value, index) => {
      const x = (index / (prices.length - 1)) * 100;
      const y = toY(value);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
    const lastIndex = prices.length - 1;
    return {
      line: points,
      area: `${points} 100,100 0,100`,
      ball: { x: 100, y: toY(prices[lastIndex]) },
    };
  }, [prices]);

  return (
    <div className="relative rounded-3xl border border-[var(--lp-line)] bg-[var(--lp-surface)] p-5 shadow-2xl shadow-cyan-950/20 transition-colors sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--lp-muted)]">Practice terminal · live feed</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xl font-bold text-[var(--lp-fg)]">{asset}</p>
            <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-500">
              {ready ? "LIVE" : "SIMULATED"}
            </span>
          </div>
        </div>
        <span className={`rounded-md px-2 py-1 font-mono text-sm font-semibold ${up ? "bg-emerald-400/10 text-emerald-500" : "bg-rose-400/10 text-rose-500"}`}>
          {up ? "▲" : "▼"} {change.toFixed(2)}%
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-mono text-3xl font-bold text-[var(--lp-fg)]">{displayPrice}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--lp-muted)]">
          Last digit{" "}
          <span className="ml-1 inline-grid h-6 w-6 place-items-center rounded-full bg-cyan-400/15 font-black text-cyan-500">
            {digit}
          </span>
        </p>
      </div>

      <div className="relative mt-5 h-56 overflow-hidden rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-deep)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.1)_1px,transparent_1px)] bg-[size:48px_48px]" aria-hidden="true" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full">
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          {geometry && (
            <>
              <polyline points={geometry.area} fill="url(#hero-area)" />
              <polyline
                points={geometry.line}
                fill="none"
                stroke="url(#hero-line)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
        {geometry && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-500 ease-out"
            style={{ left: `${geometry.ball.x}%`, top: `${geometry.ball.y}%` }}
          >
            <span className="relative grid h-5 w-5 place-items-center rounded-full bg-cyan-400 text-[10px] font-black text-[#062a38] shadow-[0_0_14px_rgba(34,211,238,0.9)] ring-2 ring-cyan-300/30">
              {digit}
              <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/40" />
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {history.length === 0
          ? Array.from({ length: 10 }, (_, index) => (
              <span key={index} className="h-1 w-1 rounded-full bg-[var(--lp-line)]" />
            ))
          : Array.from({ length: 10 }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${index === digit ? "scale-125 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" : "bg-[var(--lp-line)]"}`}
              />
            ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-[var(--lp-muted)]">
        {error
          ? "Waiting for a live feed…"
          : "The chart glides with the live simulated price — the highlighted digit drives each trade result."}
      </p>
    </div>
  );
}