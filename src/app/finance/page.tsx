"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DepositModal } from "@/components/trade/deposit-modal";
import { WithdrawModal } from "@/components/trade/withdraw-modal";

type Account = {
  balance: string;
  realBalance: string;
  label: string;
  realLabel: string;
  currency: string;
};

type Transaction = {
  id: string;
  type: string;
  amount: string;
  status: string;
  reference: string;
  createdAt: string;
};

const transactionLabels: Record<string, string> = {
  DEMO_INITIAL_BALANCE: "Demo funds added",
  TRADE: "Trade activity",
  PAYMENT: "Payment",
  ADMIN_ADJUSTMENT: "Account adjustment",
};

export default function FinancePage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [accountResponse, transactionResponse] = await Promise.all([
          fetch("/api/user/account"),
          fetch("/api/transactions"),
        ]);
        if (accountResponse.status === 401 || transactionResponse.status === 401) {
          router.push("/login");
          return;
        }
        const [accountData, transactionData] = await Promise.all([
          accountResponse.json(),
          transactionResponse.json(),
        ]);
        if (!accountResponse.ok || !accountData.success) {
          throw new Error(accountData.error?.message ?? "Account balance could not be loaded.");
        }
        if (!transactionResponse.ok || !transactionData.success) {
          throw new Error(transactionData.error?.message ?? "Account activity could not be loaded.");
        }
        if (active) {
          setAccount(accountData.account);
          setTransactions(transactionData.transactions);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Finance information is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  return (
    <>
    <SiteHeader active="finance" />
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6">
      <Link href="/dashboard" className="text-sm text-cyan-300">← Dashboard</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-300">ACCOUNT CENTER</p>
          <h1 className="mt-2 text-3xl font-bold">Finance & activity</h1>
          <p className="mt-2 text-slate-400">Manage your virtual balances and review account history.</p>
        </div>
        <Link href="/trades" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm transition hover:bg-white/[0.07]">Trading history</Link>
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200">{notice}</p>}

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-cyan-400/20 bg-[#101827] p-6">
          <p className="text-sm text-slate-400">Demo account · virtual funds</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {loading ? "Loading…" : account ? `$${account.balance} ${account.currency}` : "Unavailable"}
          </p>
          <p className="mt-2 text-xs text-slate-500">{account?.label ?? "No cash value"}</p>
          <Link href="/trade" className="mt-4 inline-block rounded-xl bg-[#1d9fe8] px-4 py-2.5 text-sm font-bold text-[#081521] transition hover:bg-[#4db8ef]">
            Trade with demo funds →
          </Link>
        </article>
        <article className="rounded-2xl border border-[#65d0ff]/25 bg-[#0d2236] p-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            <p className="text-sm font-semibold text-cyan-200">Real (sandbox) account</p>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "Loading…" : account ? `$${account.realBalance} ${account.currency}` : "Unavailable"}
          </p>
          <p className="mt-2 text-xs text-slate-500">{account?.realLabel ?? "Balances live here"}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Deposit to fund your Real account, then trade in Real mode. Switch to the operational Daraja-provider
            mode when the organization&rsquo;s M-Pesa sandbox credentials are connected.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowDeposit(true)}
              className="rounded-xl bg-[#35a9e6] px-3 py-2.5 text-sm font-bold text-[#081721] transition hover:bg-[#4db8ef]"
            >
              Deposit
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="rounded-xl border border-[#ff6a6a]/60 bg-[#3a1620] px-3 py-2.5 text-sm font-bold text-[#ff8ea5] transition hover:bg-[#4c1c29]"
            >
              Withdraw
            </button>
          </div>
        </article>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#101827]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold">Account activity</h2>
          <p className="mt-1 text-xs text-slate-400">Virtual-fund ledger transactions only; this is not a cash statement.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Activity</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 text-right font-medium">Amount (virtual USD)</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {!loading && transactions.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No account activity yet.</td></tr>
              )}
              {transactions.map((transaction) => {
                const amount = Number(transaction.amount);
                return (
                  <tr key={transaction.id} className="text-slate-300">
                    <td className="whitespace-nowrap px-5 py-4">{new Date(transaction.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-4">{transactionLabels[transaction.type] ?? transaction.type}</td>
                    <td className="max-w-48 truncate px-5 py-4 font-mono text-xs text-slate-500" title={transaction.reference}>{transaction.reference}</td>
                    <td className={`whitespace-nowrap px-5 py-4 text-right font-mono ${amount > 0 ? "text-emerald-300" : amount < 0 ? "text-rose-300" : ""}`}>
                      {amount > 0 ? "+" : ""}{amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right">{transaction.status}</td>
                  </tr>
                );
              })}
              {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading account activity…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <DepositModal open={showDeposit} onClose={() => setShowDeposit(false)} onNotice={(message) => setNotice(message)} />
      <WithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} onNotice={(message) => setNotice(message)} />
    </main>
    </>
  );
}