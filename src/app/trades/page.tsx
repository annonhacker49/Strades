'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from "@/components/site-header";

interface Trade {
  id: string;
  asset: string;
  direction: 'UP' | 'DOWN';
  stake: string;
  payoutRate: string;
  entryPrice: string;
  exitPrice?: string;
  result?: 'WIN' | 'LOSS' | 'TIE';
  status: 'OPEN' | 'SETTLED';
  openedAt: string;
  expiresAt: string;
  closedAt?: string | null;
}

function tradeProfit(trade: Trade): string | null {
  if (trade.status !== "SETTLED" || !trade.result) return null;
  if (trade.result === "TIE") return "0.00";
  const value = Number(trade.stake) * (trade.result === "WIN" ? Number(trade.payoutRate) : -1);
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/trades');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.success) setTrades(data.trades);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const filtered = trades.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'open') return t.status === 'OPEN';
    if (filter === 'settled') return t.status === 'SETTLED';
    if (filter === 'win') return t.result === 'WIN';
    if (filter === 'loss') return t.result === 'LOSS';
    return true;
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-300">Loading trade history…</div>;

  return (
    <>
      <SiteHeader active="trades" />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 text-white sm:px-8">
        <h2 className="text-3xl font-bold mb-2">Trading History</h2>
        <p className="mb-6 text-sm text-slate-400">Demo trades only · outcomes are calculated from entry and expiry prices.</p>

        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'open', 'settled', 'win', 'loss'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded transition ${
                filter === f
                  ? 'border border-cyan-300/30 bg-cyan-400/15 text-cyan-200'
                  : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#101827]">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Date/Time</th>
                <th className="text-left px-4 py-3 font-semibold">Asset</th>
                <th className="text-center px-4 py-3 font-semibold">Direction</th>
                <th className="text-right px-4 py-3 font-semibold">Stake</th>
                <th className="text-right px-4 py-3 font-semibold">Entry</th>
                <th className="text-right px-4 py-3 font-semibold">Exit</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">Result</th>
                <th className="text-right px-4 py-3 font-semibold">Net P/L (virtual)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400">No trades found</td></tr>
              ) : (
                filtered.map((trade) => (
                  <tr key={trade.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">{new Date(trade.openedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{trade.asset}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={trade.direction === 'UP' ? 'text-green-400' : 'text-red-400'}>
                        {trade.direction === 'UP' ? '📈' : '📉'} {trade.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">${trade.stake}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{parseFloat(trade.entryPrice).toFixed(5)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {trade.exitPrice ? parseFloat(trade.exitPrice).toFixed(5) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={trade.status === 'OPEN' ? 'text-yellow-400' : 'text-green-400'}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {trade.result ? (
                        <span className={
                          trade.result === 'WIN' ? 'text-green-400 font-bold' :
                          trade.result === 'LOSS' ? 'text-red-400 font-bold' :
                          'text-gray-400'
                        }>
                          {trade.result}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold ${
                      trade.result === 'WIN' ? 'text-green-400' : trade.result === 'LOSS' ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {tradeProfit(trade) === null ? '—' : `$${tradeProfit(trade)}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
