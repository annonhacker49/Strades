'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from "@/components/site-header";

interface Account {
  id: string;
  balance: string;
  label: string;
}

interface User {
  id: string;
  firstName: string;
  email: string;
  role?: string;
  emailVerified: boolean;
  emailVerificationRequired: boolean;
}

interface Trade {
  id: string;
  asset: string;
  direction: 'UP' | 'DOWN';
  stake: string;
  entryPrice: string;
  result?: 'WIN' | 'LOSS' | 'TIE';
  status: 'OPEN' | 'SETTLED';
  openedAt: string;
  expiresAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [stats, setStats] = useState({ totalTrades: 0, wins: 0, losses: 0, winRate: '0%' });

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, accountRes, tradesRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/account'),
          fetch('/api/trades'),
        ]);

        if (userRes.status === 401) {
          router.push('/login');
          return;
        }

        const userData = await userRes.json();
        const accountData = await accountRes.json();
        const tradesData = await tradesRes.json();

        if (userData.success) setUser(userData.user);
        if (accountData.success) setAccount(accountData.account);
        if (tradesData.success) {
          setTrades(tradesData.trades.slice(0, 5));
          const settled = tradesData.trades.filter((t: Trade) => t.status === 'SETTLED');
          const wins = settled.filter((t: Trade) => t.result === 'WIN').length;
          setStats({
            totalTrades: settled.length,
            wins,
            losses: settled.length - wins,
            winRate: settled.length > 0 ? `${Math.round((wins / settled.length) * 100)}%` : '0%',
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    const stream = new EventSource("/api/stream");
    stream.addEventListener("snapshot", (event) => {
      const snapshot = JSON.parse((event as MessageEvent<string>).data);
      if (snapshot.account) {
        setAccount((current) => current
          ? { ...current, balance: snapshot.account.balance }
          : null);
      }
      if (Array.isArray(snapshot.trades)) {
        const latest = snapshot.trades as Trade[];
        setTrades(latest.slice(0, 5));
        const settled = latest.filter((trade) => trade.status === "SETTLED");
        const wins = settled.filter((trade) => trade.result === "WIN").length;
        setStats({
          totalTrades: settled.length,
          wins,
          losses: settled.length - wins,
          winRate: settled.length ? `${Math.round(wins / settled.length * 100)}%` : "0%",
        });
      }
    });
    return () => stream.close();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-300">Loading your demo account…</div>;

  return (
    <>
      <SiteHeader active="dashboard" trailing={
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-300 sm:block">{user?.firstName}</span>
          <button onClick={handleLogout} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]">
            Logout
          </button>
        </div>
      } />

      <main className="mx-auto w-full max-w-7xl px-5 py-8 text-white sm:px-8">
        {user?.emailVerificationRequired && !user.emailVerified && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-300/[0.04] p-4 text-amber-100">
            <p className="font-semibold">Verify your email to protect your account.</p>
            <p className="mt-1 text-sm">You can use demo trading now. Email verification is not required for demo trades.</p>
            <button
              className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm transition hover:bg-amber-300/15"
              onClick={async () => {
                const response = await fetch("/api/auth/verify-email/resend", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email: user.email }),
                });
                const result = await response.json();
                setVerificationMessage(response.ok
                  ? "If verification is enabled, check your email for a link."
                  : result.error?.message ?? "Could not send verification email.");
              }}
            >
              Resend verification link
            </button>
            {verificationMessage && <p role="status" className="mt-2 text-sm">{verificationMessage}</p>}
          </div>
        )}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold mb-2">Welcome back, {user?.firstName}!</h2>
            <p className="text-slate-300">Your demo account is ready for trading with virtual funds</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/trade"
              className="rounded-xl bg-[#1d9fe8] px-5 py-3 text-base font-bold text-[#081521] shadow-[0_0_18px_rgba(29,159,232,0.4)] transition hover:bg-[#4db8ef]"
            >
              Open trading terminal →
            </Link>
            <button
              onClick={() => router.push("/finance")}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
            >
              Finance
            </button>
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                Admin console
              </Link>
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-cyan-400/20 bg-[#101827] p-6">
            <p className="text-slate-300 text-sm mb-2">Demo Balance</p>
            <p className="text-3xl font-bold text-emerald-300">${account?.balance}</p>
            <p className="text-xs text-slate-400 mt-2">{account?.label}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101827] p-6">
            <p className="text-slate-300 text-sm mb-2">Total Trades</p>
            <p className="text-3xl font-bold">{stats.totalTrades}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101827] p-6">
            <p className="text-slate-300 text-sm mb-2">Win Rate</p>
            <p className="text-3xl font-bold text-cyan-300">{stats.winRate}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101827] p-6">
            <p className="text-slate-300 text-sm mb-2">Wins / Losses</p>
            <p className="text-2xl font-bold"><span className="text-green-400">{stats.wins}</span> / <span className="text-red-400">{stats.losses}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-[#101827] p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Recent Trades</h3>
                <Link href="/trades" className="text-cyan-300 hover:text-cyan-200 text-sm">View All</Link>
              </div>
              <div className="space-y-3">
                {trades.length === 0 ? (
                  <p className="text-slate-400">No trades yet. <Link href="/trade" className="text-cyan-300">Start trading</Link></p>
                ) : (
                  trades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <div>
                        <p className="font-semibold">{trade.asset}</p>
                        <p className="text-xs text-slate-400">{new Date(trade.openedAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${trade.direction === 'UP' ? 'text-emerald-300' : 'text-rose-300'}`}>{trade.direction}</p>
                        <p className="text-sm text-slate-300">${trade.stake}</p>
                      </div>
                      <div>
                        {trade.status === 'OPEN' ? (
                          <span className="text-amber-200 text-sm">In progress…</span>
                        ) : (
                          <span className={trade.result === 'WIN' ? 'text-emerald-300 font-bold' : trade.result === 'TIE' ? 'text-slate-400' : 'text-rose-300 font-bold'}>
                            {trade.result}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
