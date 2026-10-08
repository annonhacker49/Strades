"use client";

import { useState } from "react";

const methods = [
  { name: "M-Pesa", subtitle: "Via Safaricom Daraja (sandbox)", icon: "◫", enabled: true },
  { name: "Binance USDT", subtitle: "Unavailable in this demo", icon: "◈", enabled: false },
  { name: "Worldcoin", subtitle: "Unavailable in this demo", icon: "◉", enabled: false },
];

export function DepositModal({ open, onClose, onNotice }: {
  open: boolean;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/payments/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount, phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Deposit could not be started.");
      setMessage(data.payment?.note ?? `Deposit request accepted (${data.payment?.status}).`);
      onNotice(data.payment?.note ?? "Deposit request sent through the M-Pesa sandbox (no real funds).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit could not be started.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b13]/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-[760px] rounded-3xl border border-[#3a5f84] bg-[#0d2236]/95 p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Deposit Funds</h2>
            <p className="mt-2 text-slate-300">A successful sandbox deposit is added to your real (sandbox) account balance so you can trade in Real mode.</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-300" /> M-PESA SANDBOX · VIRTUAL ONLY
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-3xl text-white/70 hover:text-white">×</button>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">{message}</p>}

        <div className="mt-6 space-y-3">
          {methods.map((method) => (
            <button
              key={method.name}
              type="button"
              disabled={!method.enabled}
              className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition ${
                method.enabled
                  ? "border-[#65d0ff] bg-[#102b44]/80 hover:bg-[#13334f]"
                  : "cursor-not-allowed border-[#2d4565] bg-[#10263f]/80 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1d2d47] text-2xl text-cyan-200">{method.icon}</div>
                <div>
                  <div className="text-xl font-bold text-white">{method.name}</div>
                  <div className="text-sm text-slate-400">{method.subtitle}</div>
                </div>
              </div>
              {method.enabled ? <span className="text-2xl text-slate-200">↗</span> : <span className="text-xs text-slate-500">OFF</span>}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Amount (virtual USD)</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="e.g. 100"
              className="field mt-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">M-Pesa phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              placeholder="+2547XXXXXXXX"
              className="field mt-2"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="mt-6 w-full rounded-xl bg-[#35a9e6] px-4 py-3 text-lg font-bold text-[#081721] transition hover:bg-[#4db8ef] disabled:opacity-60"
        >
          {busy ? "Sending STK push…" : "Deposit via M-Pesa sandbox"}
        </button>
      </div>
    </div>
  );
}