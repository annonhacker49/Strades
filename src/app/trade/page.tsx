"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { Logo } from "@/components/logo";
import { DigitBoard, type DigitOutcome } from "@/components/trade/digit-board";
import { DepositModal } from "@/components/trade/deposit-modal";
import { WithdrawModal } from "@/components/trade/withdraw-modal";
import { AccountSettingsModal } from "@/components/trade/account-settings-modal";

type Quote = { asset: string; price: number; source: "SIMULATED" | "PROVIDER"; history: { time: number; price: number }[] };
type Trade = {
  id: string;
  asset: string;
  direction: "UP" | "DOWN";
  contractType: "DIRECTION" | "OVER_UNDER" | "LAST_DIGIT";
  mode: "DEMO" | "REAL";
  selectedDigit: number | null;
  status: "OPEN" | "SETTLED";
  result: "WIN" | "LOSS" | "TIE" | null;
  stake: string;
  entryPrice: string;
  exitPrice: string | null;
  potentialPayout: string;
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
};
type AccountMode = "demo" | "real";
type ContractType = "DIRECTION" | "OVER_UNDER" | "LAST_DIGIT";

const quickStake = [1, 5, 10, 25, 50, 100];
const payoutRate = Number(brand.defaultPayoutRate);
const expiryOptions = brand.expirySeconds;

function lastDigitOfPrice(price: number): number {
  const stringValue = price.toFixed(5);
  const [whole, fraction = ""] = stringValue.split(".");
  const significant = fraction.replace(/0+$/, "");
  const representative = significant || whole;
  return Number(representative.slice(-1));
}

export default function TradePage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [balance, setBalance] = useState("0.00");
  const [realBalance, setRealBalance] = useState("0.00");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [asset, setAsset] = useState("");
  const [direction, setDirection] = useState<"UP" | "DOWN">("UP");
  const [contractType, setContractType] = useState<ContractType>("DIRECTION");
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [stake, setStake] = useState("100");
  const [expiry, setExpiry] = useState(30);
  const [followLatest, setFollowLatest] = useState(true);
  const [chartStart, setChartStart] = useState(0);
  const chartWindowSize = 120;
  const [accountMode, setAccountMode] = useState<AccountMode>("demo");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoDone, setAutoDone] = useState(0);
  const [tradeMode, setTradeMode] = useState<"manual" | "auto">("manual");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const autoBusy = useRef(false);
  const autoCount = useRef(0);
  const chartBoxRef = useRef<HTMLDivElement | null>(null);
  const chartDragRef = useRef<{ startX: number; startIndex: number; moved: boolean } | null>(null);
  const defaultChartOptions = { grid: true, area: true, markers: true, pulse: true };
  const [chartOptions, setChartOptions] = useState<{ grid: boolean; area: boolean; markers: boolean; pulse: boolean }>(() => {
    try {
      const stored = localStorage.getItem("strades-chart-options");
      return stored ? { ...defaultChartOptions, ...JSON.parse(stored) } : defaultChartOptions;
    } catch {
      return defaultChartOptions;
    }
  });

  useEffect(() => {
    try { localStorage.setItem("strades-chart-options", JSON.stringify(chartOptions)); } catch { /* non-fatal */ }
  }, [chartOptions]);

  const toggleChartOption = (key: keyof typeof defaultChartOptions) =>
    setChartOptions((current) => ({ ...current, [key]: !current[key] }));

  useEffect(() => {
    let active = true;
    async function load() {
      const [marketResponse, accountResponse, tradesResponse, profileResponse] = await Promise.all([
        fetch("/api/markets"),
        fetch("/api/user/account"),
        fetch("/api/trades"),
        fetch("/api/user/profile"),
      ]);
      if (accountResponse.status === 401) setAuthenticated(false);
      else setAuthenticated(accountResponse.ok);

      const market = await marketResponse.json().catch(() => ({ success: false }));
      const account = await accountResponse.json().catch(() => ({ success: false }));
      const tradeData = await tradesResponse.json().catch(() => ({ success: false }));
      const profile = await profileResponse.json().catch(() => ({ success: false }));

      if (!active) return;
      if (market.success) {
        setQuotes(market.assets);
        setAsset((current) => current || market.assets[0]?.asset || "");
      } else setError(market.error?.message ?? "Market data is unavailable.");
      if (account.success) {
        setBalance(account.account.balance);
        setRealBalance(account.account.realBalance ?? "0.00");
      }
      if (tradeData.success) setTrades(tradeData.trades);
      if (profile.success) setUser(profile.user);
    }
    load().catch(() => setError("Unable to load trading data."));
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!authenticated) {
      const updateQuotes = async () => {
        try {
          const response = await fetch("/api/markets", { cache: "no-store" });
          const market = await response.json();
          if (response.ok && market.success) setQuotes(market.assets);
        } catch {
          setError("Market data update unavailable. Retrying…");
        }
      };
      const timer = window.setInterval(() => void updateQuotes(), 2000);
      return () => window.clearInterval(timer);
    }
    const stream = new EventSource("/api/stream");
    stream.addEventListener("snapshot", (event) => {
      const snapshot = JSON.parse((event as MessageEvent<string>).data);
      if (snapshot.account?.balance) setBalance(snapshot.account.balance);
      if (typeof snapshot.account?.realBalance === "string") setRealBalance(snapshot.account.realBalance);
      if (Array.isArray(snapshot.markets?.assets)) setQuotes(snapshot.markets.assets);
      if (Array.isArray(snapshot.trades)) setTrades(snapshot.trades as Trade[]);
    });
    return () => stream.close();
  }, [authenticated]);

  const submitTrade = useCallback(async (values: {
    asset: string;
    direction: "UP" | "DOWN";
    contractType: ContractType;
    targetPrice?: string;
    selectedDigit?: number;
    stake: string;
    expirySeconds: number;
    mode: AccountMode;
  }) => {
    if (!authenticated) {
      router.push("/login?next=%2Ftrade");
      return false;
    }
    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Trade could not be placed.");
      if (result.trade?.expiresAt) {
        const accountWord = values.mode === "real" ? "Real" : "Demo";
        const sideWord = values.direction === "UP" ? "Up" : "Down";
        const contractWord = values.contractType === "LAST_DIGIT"
          ? `Digit ${values.selectedDigit}`
          : values.contractType === "OVER_UNDER"
            ? `${values.direction === "UP" ? "Over" : "Under"} ${values.selectedDigit}`
            : sideWord;
        setNotice(`${accountWord} ${contractWord} accepted. It expires at ${new Date(result.trade.expiresAt).toLocaleTimeString()} — watch the marker on the chart.`);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade could not be placed.");
      return false;
    }
  }, [authenticated, router]);

  async function placeTrade(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const base = {
        asset,
        direction,
        stake,
        expirySeconds: expiry,
        mode: accountMode,
      };
      if (contractType === "LAST_DIGIT" || contractType === "OVER_UNDER") {
        if (selectedDigit === null) {
          setError(contractType === "OVER_UNDER"
            ? "Select a digit to compare against, then choose Over or Under."
            : "Select a digit on the tracker below the chart to place a digit match trade.");
          return;
        }
        await submitTrade({ ...base, contractType, selectedDigit });
      } else {
        await submitTrade({ ...base, contractType });
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!autoRunning || !authenticated || accountMode === "real") return;
    let stopped = false;
    const autoExpirySeconds = 15;
    const runAutoTrade = async () => {
      if (stopped || autoBusy.current || autoCount.current >= 5) return;
      autoBusy.current = true;
      try {
        const response = await fetch("/api/markets");
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message ?? "Market data is unavailable.");
        const quote = result.assets.find((item: Quote) => item.asset === asset);
        if (!quote) throw new Error("Selected asset price is unavailable.");
        const random = new Uint32Array(2);
        window.crypto.getRandomValues(random);
        const randomSide: "UP" | "DOWN" = random[0] % 2 === 0 ? "UP" : "DOWN";
        const digitForTrade = contractType === "LAST_DIGIT" || contractType === "OVER_UNDER"
          ? random[1] % 10
          : undefined;
        if (stopped) return;
        const accepted = await submitTrade({
          asset,
          direction: randomSide,
          contractType,
          selectedDigit: digitForTrade,
          stake,
          expirySeconds: autoExpirySeconds,
          mode: "demo",
        });
        if (!accepted) throw new Error("Auto demo stopped because a trade could not be placed.");
        autoCount.current += 1;
        setAutoDone(autoCount.current);
        if (autoCount.current >= 5) {
          setNotice("Auto demo finished after 5 trades — mixed sides and digits, so results vary. Review the chart markers before starting again.");
          setAutoRunning(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Auto demo stopped.");
        setAutoRunning(false);
      } finally {
        autoBusy.current = false;
      }
    };
    void runAutoTrade();
    const timer = window.setInterval(() => void runAutoTrade(), (autoExpirySeconds + 3) * 1000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [autoRunning, authenticated, accountMode, asset, contractType, stake, submitTrade]);

  const selected = quotes.find((quote) => quote.asset === asset);
  const openTradeCount = trades.filter((trade) => trade.status === "OPEN").length;
  const fullHistory = selected?.history ?? [];
  const maxStart = Math.max(0, fullHistory.length - chartWindowSize);
  const effectiveStart = Math.min(maxStart, followLatest ? maxStart : chartStart);
  const chartHistory = fullHistory.slice(effectiveStart, effectiveStart + chartWindowSize);
  const chartPrices = chartHistory.map((tick) => tick.price);
  const chartMin = chartPrices.length ? Math.min(...chartPrices) : 0;
  const chartMax = chartPrices.length ? Math.max(...chartPrices) : 1;
  const chartRange = chartMax - chartMin || 1;
  const currentPrice = selected?.price ?? 0;
  const currentPriceText = currentPrice ? currentPrice.toFixed(5) : "—";
  const liveDigit = currentPrice ? lastDigitOfPrice(currentPrice) : 0;
  const totalPayout = Number(stake) * (1 + payoutRate);
  const netProfit = Number(stake) * payoutRate;
  const activeBalance = accountMode === "real" ? realBalance : balance;
  const balanceDisplay = Number(activeBalance).toFixed(2);
  const realFunds = Number(realBalance);
  const realUnfunded = accountMode === "real" && realFunds < Number(stake);

  const openTrades = trades.filter((trade) => trade.status === "OPEN");
  const recentSettled = trades.filter((trade) => trade.status === "SETTLED").slice(0, 6);

  const openTradeProgress = (trade: Trade): { label: string; tone: "win" | "lose" | "flat" } => {
    const entry = Number(trade.entryPrice);
    if (trade.contractType === "LAST_DIGIT") {
      return liveDigit === trade.selectedDigit
        ? { label: `Digit ${trade.selectedDigit} — matching now`, tone: "win" }
        : { label: `Digit ${trade.selectedDigit} — not matched (live ${liveDigit})`, tone: "lose" };
    }
    if (trade.contractType === "OVER_UNDER") {
      const hitting = (trade.direction === "UP") === (liveDigit >= (trade.selectedDigit ?? 0));
      return hitting
        ? { label: `${trade.direction === "UP" ? "Over" : "Under"} ${trade.selectedDigit} — winning now (live ${liveDigit})`, tone: "win" }
        : { label: `${trade.direction === "UP" ? "Over" : "Under"} ${trade.selectedDigit} — losing now (live ${liveDigit})`, tone: "lose" };
    }
    const runningUp = Number(currentPrice) >= entry;
    const flat = Number(currentPrice) === entry;
    const winning = trade.direction === "UP" ? runningUp : !runningUp;
    return flat
      ? { label: "Flat at entry", tone: "flat" }
      : { label: `${trade.direction === "UP" ? "Up" : "Down"} — ${winning ? "winning" : "losing"} now`, tone: winning ? "win" : "lose" };
  };

  const toY = (price: number) => 95 - ((price - chartMin) / chartRange) * 90;
  const fullIndexAtTime = (time: number): number => {
    if (fullHistory.length === 0) return 0;
    let nearest = 0;
    let best = Infinity;
    for (let index = 0; index < fullHistory.length; index += 1) {
      const delta = Math.abs(fullHistory[index].time - time);
      if (delta < best) { best = delta; nearest = index; }
    }
    return nearest;
  };
  const toX = (time: number) =>
    Math.min(100, Math.max(0, ((fullIndexAtTime(time) - effectiveStart) / Math.max(1, chartHistory.length - 1)) * 100));
  const points = chartHistory.map((tick, index) =>
    `${(index / Math.max(1, chartHistory.length - 1)) * 100},${toY(tick.price)}`
  ).join(" ");
  const lastTick = chartHistory[chartHistory.length - 1];
  const ballPosition = lastTick ? { x: toX(lastTick.time), y: toY(lastTick.price) } : null;
  const openMarkers = openTrades.map((trade) => ({
    trade,
    x: toX(new Date(trade.openedAt).getTime()),
    y: toY(Number(trade.entryPrice)),
  }));
  const settledMarkers = recentSettled
    .map((trade) => ({
      trade,
      x: toX(new Date(trade.closedAt ?? trade.expiresAt).getTime()),
      y: toY(Number(trade.exitPrice ?? trade.entryPrice)),
    }))
    .filter((marker) => marker.x >= 0 && marker.x <= 100);

  const isViewingHistory = !followLatest;
  const chartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target || target.closest?.("button") || target.closest?.("a") || target.closest?.("input") || event.button !== 0) return;
    const box = chartBoxRef.current?.getBoundingClientRect();
    if (!box) return;
    chartDragRef.current = { startX: event.clientX, startIndex: effectiveStart, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer already released. */ }
  };
  const chartPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = chartDragRef.current;
    const box = chartBoxRef.current?.getBoundingClientRect();
    if (!drag || !box) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      if (followLatest) setFollowLatest(false);
    }
    if (!drag.moved) return;
    const tickWidth = Math.max(1, box.width / Math.max(1, chartHistory.length - 1));
    const deltaTicks = Math.round(dx / tickWidth);
    setChartStart(Math.max(0, Math.min(maxStart, drag.startIndex - deltaTicks)));
  };
  const chartPointerEnd = () => {
    const drag = chartDragRef.current;
    if (drag?.moved) {
      const snapped = Math.max(0, Math.min(maxStart, effectiveStart));
      if (snapped >= maxStart) setFollowLatest(true);
      else setChartStart(snapped);
    }
    chartDragRef.current = null;
  };

  const settledOutcomes: DigitOutcome[] = trades
    .filter((trade) => trade.status === "SETTLED" && trade.result !== null && trade.exitPrice)
    .slice(0, 24)
    .map((trade) => ({
      digit: lastDigitOfPrice(Number(trade.exitPrice)),
      win: trade.result === "WIN",
    }));

  function startAuto() {
    if (!authenticated) {
      router.push("/login?next=%2Ftrade");
      return;
    }
    if (accountMode === "real") {
      setError("Auto demo trades only run on the Demo account. Switch to Demo first.");
      return;
    }
    if (tradeMode !== "auto") setTradeMode("auto");
    autoCount.current = 0;
    setAutoDone(0);
    setError("");
    setAutoRunning(true);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const balanceLabel = accountMode === "demo" ? "DEMO ACCOUNT — VIRTUAL FUNDS" : "REAL ACCOUNT — SANDBOX VIRTUAL FUNDS";

  return (
    <>
      <div className="min-h-screen bg-[#071724] text-white">
        <div className="mx-auto max-w-[1680px] px-3 py-3">
          <header className="flex flex-wrap items-center gap-4 rounded-[18px] border border-[#244f82]/50 bg-[#091b2d]/95 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Link href="/" className="block"><Logo className="h-10 w-10" /></Link>
              <span className="text-sm font-bold uppercase tracking-[0.18em] sm:text-base">STRADES</span>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <button onClick={() => setShowDeposit(true)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
                Deposit
              </button>
              <button onClick={() => setShowWithdraw(true)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
                Withdraw
              </button>
              <Link href="/trades" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
                History
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="flex items-center overflow-hidden rounded-xl border border-[#3d5d83] bg-[#112942]">
                <button
                  type="button"
                  onClick={() => setAccountMode("demo")}
                  className={`px-3 py-2 text-xs font-bold transition ${accountMode === "demo" ? "bg-[#1d9fe8] text-[#081521]" : "text-slate-300 hover:text-white"}`}
                >
                  DEMO
                </button>
                <button
                  type="button"
                  onClick={() => setAccountMode("real")}
                  className={`px-3 py-2 text-xs font-bold transition ${accountMode === "real" ? "bg-[#35d6a4] text-[#06221a]" : "text-slate-300 hover:text-white"}`}
                >
                  REAL
                </button>
              </div>

              <button className="flex items-center gap-2 rounded-xl border border-[#4279b4] bg-[#112942] px-3 py-2 text-sm font-medium text-slate-200">
                <span className="font-mono">{accountMode === "demo" ? "D" : "R"}</span>
                <span>USD</span>
                <span className="font-mono text-cyan-200">{balanceDisplay}</span>
              </button>

              <button onClick={() => setShowDeposit(true)} className="rounded-xl bg-[#1d9fe8] px-4 py-2.5 text-sm font-bold text-[#081521] shadow-[0_0_12px_rgba(29,159,232,0.65)]">
                Deposit
              </button>

              <div className="relative">
                <button onClick={() => setShowAccountMenu((value) => !value)} className="grid h-11 w-11 place-items-center rounded-full border border-slate-600 bg-[#10253f] text-lg text-slate-200">
                  {(user?.firstName?.[0] ?? "U").toUpperCase()}
                </button>
                {showAccountMenu && (
                  <div className="absolute right-0 top-[52px] min-w-[280px] rounded-2xl border border-slate-700/80 bg-[#0f1e2c]/95 p-4 shadow-2xl backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-3 border-b border-slate-700/80 pb-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1a3b54] text-sm font-bold text-cyan-300">
                        {(user?.firstName?.[0] ?? "U").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold">{user ? `${user.firstName} ${user.lastName}` : "Signed-in user"}</div>
                        <div className="truncate text-xs text-slate-400">{user?.email ?? "demo"}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-left text-base text-slate-200">
                      <button type="button" onClick={() => { setShowAccountMenu(false); setShowAccountSettings(true); }} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5">
                        <span>✎</span> Edit Profile / Settings
                      </button>
                      <Link href="/profile" onClick={() => setShowAccountMenu(false)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5">
                        <span>◫</span> Two-Factor Auth
                      </Link>
                      <Link href="/finance" onClick={() => setShowAccountMenu(false)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5">
                        <span>◍</span> Finance & Activity
                      </Link>
                      <button type="button" onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-red-300 hover:bg-red-500/10">
                        <span>↩</span> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {accountMode === "real" && realUnfunded && (
            <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm leading-6 text-amber-200">
              Your Real (sandbox) account is unfunded (${balanceDisplay}). Deposit first to place a Real trade.
              <button onClick={() => setShowDeposit(true)} className="ml-2 rounded-lg bg-[#35a9e6] px-3 py-1 text-xs font-bold text-[#081721]">Deposit now</button>
            </div>
          )}

          <div className="mt-4 grid min-h-[860px] grid-cols-1 gap-4 xl:grid-cols-[370px_minmax(0,1fr)_360px]">
            <aside className="rounded-2xl border border-[#1d3456] bg-[#091d2d]/90 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-6 border-b border-white/10 pb-2 text-sm text-slate-400">
                <span className="pb-2 text-left font-semibold text-[#4fe0a3]">Open ({openTradeCount})</span>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-white/10 bg-[#0f2333] px-3 py-1 text-xs text-slate-300">{balanceLabel}</span>
                </div>
              </div>

              <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {openTrades.length === 0 && (
                  <div className="rounded-2xl border border-white/5 bg-[#0b1b2d] p-4 text-center">
                    <p className="text-sm text-slate-300">No open positions</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Your active trades will appear here with their live price digit on the tracker.</p>
                  </div>
                )}
                {openTrades.map((trade) => (
                  <div key={trade.id} className="rounded-xl border border-white/5 bg-[#0d2133] p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{trade.asset}</span>
                      <span className={`font-bold ${trade.direction === "UP" ? "text-[#4fe0a3]" : "text-[#ff8ea5]"}`}>
                        {trade.contractType === "LAST_DIGIT"
                          ? `Digit ${trade.selectedDigit}`
                          : trade.contractType === "OVER_UNDER"
                            ? trade.direction === "UP" ? `Over ${trade.selectedDigit}` : `Under ${trade.selectedDigit}`
                            : trade.direction}
                      </span>
                      <span className="ml-2 rounded border border-white/10 px-1 text-[10px] text-slate-500">{trade.mode === "REAL" ? "REAL" : "DEMO"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Stake ${trade.stake}</span>
                      <span>Expires {new Date(trade.expiresAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-white/5 bg-[#081c2e] px-2 py-1.5">
                      <span className="text-[11px] text-slate-400">Live price</span>
                      <span className="font-mono text-[11px] text-cyan-200">{currentPriceText}</span>
                    </div>
                    <div className={`mt-1.5 flex items-center justify-between rounded-lg px-2 py-1.5 ${
                      openTradeProgress(trade).tone === "win"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : openTradeProgress(trade).tone === "lose"
                          ? "bg-rose-500/10 text-rose-300"
                          : "bg-white/5 text-slate-400"
                    }`}>
                      <span className="text-[11px]">{openTradeProgress(trade).label}</span>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        openTradeProgress(trade).tone === "win" ? "bg-emerald-400" : openTradeProgress(trade).tone === "lose" ? "bg-rose-400" : "bg-slate-500"
                      }`} />
                    </div>
                  </div>
                ))}
              </div>

              {recentSettled.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">Last results</p>
                  <div className="space-y-1.5">
                    {recentSettled.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate">{trade.asset}</span>
                        <span className={trade.result === "WIN" ? "text-[#4fe0a3]" : trade.result === "LOSS" ? "text-[#ff8ea5]" : "text-slate-500"}>
                          {trade.result === "WIN"
                            ? `WIN +$${trade.potentialPayout}`
                            : trade.result === "LOSS"
                              ? `LOSS −$${trade.stake}`
                              : (trade.result ?? "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            <main className="flex flex-col rounded-2xl border border-[#1d3456] bg-[#081928]/90 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#1f3555] bg-[#0b1c2c] p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">{selected?.asset ?? (asset || "Select asset")}</div>
                    <div className="mt-0.5 text-sm text-slate-400">
                      <span className="font-mono text-cyan-200">{currentPriceText}</span>
                      <span className="ml-3 text-[11px]">{selected?.source === "SIMULATED" ? "SIMULATED DATA" : "PROVIDER DATA"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {expiryOptions.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => setExpiry(seconds)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        expiry === seconds
                          ? "border-[#58b7ff] bg-[#122d45] text-cyan-200"
                          : "border-white/10 bg-[#112f46] text-slate-300 hover:bg-[#16395a]"
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 px-1 pb-1">
                <div className="text-sm font-semibold text-slate-300">Select market</div>
                <select
                  value={asset}
                  onChange={(event) => setAsset(event.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-[#0b1c2c] px-2 py-1.5 text-sm text-white outline-none focus:border-[#58b7ff]"
                >
                  {quotes.length > 0
                    ? quotes.map((quote) => (
                      <option key={quote.asset} value={quote.asset}>{quote.asset}</option>
                    ))
                    : brand.allowedAssets.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </select>
              </div>

              <DigitBoard
                selection={contractType === "LAST_DIGIT" || contractType === "OVER_UNDER" ? selectedDigit : null}
                onSelect={setSelectedDigit}
                liveDigit={liveDigit}
                outcomes={settledOutcomes}
                interactive={contractType === "LAST_DIGIT" || contractType === "OVER_UNDER"}
              />

              <div
  ref={chartBoxRef}
  onPointerDown={chartPointerDown}
  onPointerMove={chartPointerMove}
  onPointerUp={chartPointerEnd}
  onPointerCancel={chartPointerEnd}
  className="relative mt-1 flex-1 cursor-grab select-none overflow-hidden rounded-xl border border-[#1c2d42] bg-[radial-gradient(circle_at_top,_rgba(26,43,66,1),_rgba(7,16,24,1))] active:cursor-grabbing">
  {chartOptions.grid && (
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:60px_60px]" />
  )}
  <div className="relative z-10 h-[320px] w-full sm:h-[400px]">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="priceGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {chartOptions.area && points && (
        <polyline points={`${points} 100,100 0,100`} fill="url(#priceAreaGrad)" />
      )}
      {points ? (
        <polyline points={points} fill="none" stroke="url(#priceGrad)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <polyline points="0,50 12,45 28,38 43,42 58,25 74,30 90,22 100,18" fill="none" stroke="url(#priceGrad)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {points ? (
        <polyline points={points} fill="none" stroke="#38bdf8" strokeOpacity="0.15" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.18)" strokeDasharray="2 4" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {chartOptions.markers && openMarkers.map((marker) => (
        <g key={marker.trade.id}>
          <line x1="0" x2="100" y1={marker.y} y2={marker.y} stroke="#57d6ff" strokeOpacity="0.8" strokeDasharray="0.8 1.6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1={marker.x} x2={marker.x} y1="0" y2="100" stroke="#57d6ff" strokeOpacity="0.2" strokeDasharray="0.6 1.6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
    <div className="pointer-events-none absolute inset-0">
      {chartOptions.markers && openMarkers.map((marker) => (
        <div key={marker.trade.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${marker.x}%`, top: `${marker.y}%` }}>
          <span className="block rounded-full border-2 border-[#57d6ff] bg-transparent shadow-[0_0_10px_rgba(87,214,255,0.7)]" style={{ width: 9, height: 9 }} />
        </div>
      ))}
      {chartOptions.markers && settledMarkers.map((marker) => {
        const won = marker.trade.result === "WIN";
        const lost = marker.trade.result === "LOSS";
        const amount = won
          ? `+$${marker.trade.potentialPayout}`
          : lost
            ? `−$${marker.trade.stake}`
            : "TIE";
        return (
          <div key={marker.trade.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${marker.x}%`, top: `${marker.y}%` }}>
            <span
              className={`block rounded-full ${won ? "bg-emerald-400" : lost ? "bg-rose-400" : "bg-slate-400"}`}
              style={{ width: 9, height: 9, boxShadow: won ? "0 0 10px rgba(52,211,153,0.8)" : lost ? "0 0 10px rgba(251,113,133,0.7)" : "0 0 8px rgba(148,163,184,0.6)" }}
            />
            <span
              className={`absolute left-2.5 top-1.5 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                won
                  ? "border-emerald-400/40 bg-emerald-950/90 text-emerald-300"
                  : lost
                    ? "border-rose-400/40 bg-rose-950/90 text-rose-300"
                    : "border-white/10 bg-[#0b1c2c]/90 text-slate-300"
              }`}
            >
              {amount}
            </span>
          </div>
        );
      })}
{ballPosition && followLatest && (
  <div
    className="absolute -translate-x-1/2 -translate-y-1/2"
    style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%`, transition: "left 0.6s ease-out, top 0.6s ease-out" }}
  >
    <span className="relative grid h-5 w-5 place-items-center rounded-full bg-cyan-300 text-[10px] font-black text-[#062a38] shadow-[0_0_14px_rgba(103,232,249,0.9)] ring-2 ring-cyan-300/30">
      {liveDigit}
      {chartOptions.pulse && <span className="absolute inset-0 animate-ping rounded-full bg-cyan-300/40" />}
    </span>
    <span className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded bg-[#0b1c2c]/90 px-1 text-[9px] font-bold uppercase tracking-wider text-cyan-200">live</span>
  </div>
)}
    </div>
  </div>
  <div className="absolute right-3 top-3 z-20 rounded-md bg-[#0b1c2c]/90 px-2 py-1 font-mono text-xs text-cyan-200">{isViewingHistory ? `HISTORY · ${currentPriceText}` : currentPriceText}</div>
{isViewingHistory && (
  <button
    type="button"
    onClick={() => setFollowLatest(true)}
    className="absolute left-3 top-3 z-20 rounded-lg border border-cyan-400/30 bg-[#0c2438]/95 px-2.5 py-1 text-[11px] font-bold text-cyan-200 transition hover:bg-[#123a5c]"
  >
    ⟳ Back to live
  </button>
)}
</div>
              <p className="mt-1.5 px-1 text-[10px] text-slate-500">
                {isViewingHistory
                  ? `Viewing ${chartHistory.length} of ${fullHistory.length} ticks — press and drag the chart to explore earlier price action, or drag to the far right to jump back to live.`
                  : `Live feed · ${chartHistory.length} of ${fullHistory.length} ticks — the chart follows the live price forward automatically. Press and drag left/right to scroll back through history.`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Graph</span>
                {([
                  { key: "grid", label: "Grid" },
                  { key: "area", label: "Area fill" },
                  { key: "markers", label: "Markers" },
                  { key: "pulse", label: "Ball pulse" },
                ] as const).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={chartOptions[option.key]}
                    onClick={() => toggleChartOption(option.key)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      chartOptions[option.key]
                        ? "border-[#58b7ff]/60 bg-[#122d45] text-cyan-200"
                        : "border-white/10 bg-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {chartOptions[option.key] ? "● " : "○ "}{option.label}
                  </button>
                ))}
              </div>
            </main>

            <form onSubmit={placeTrade} className="rounded-2xl border border-[#1d3456] bg-[#081d2d]/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.25)]">
              <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-[#2a4d74] bg-[#0a1d2e]">
                <button
                  type="button"
                  onClick={() => setTradeMode("manual")}
                  className={`py-3 text-sm font-bold uppercase tracking-wide ${tradeMode === "manual" ? "bg-[#2d87dc] text-[#061a2b]" : "bg-transparent text-slate-300"}`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => startAuto()}
                  className={`py-3 text-sm font-bold uppercase tracking-wide ${tradeMode === "auto" ? "bg-[#2d87dc] text-[#061a2b]" : "bg-transparent text-slate-300"}`}
                >
                  Auto {autoDone > 0 ? `(${autoDone}/5)` : ""}
                </button>
              </div>

              {notice && <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</div>}
              {error && <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>}

              <div className="mb-4 flex flex-wrap gap-2">
                {([
                  { key: "DIRECTION" as ContractType, label: "Up / Down" },
                  { key: "OVER_UNDER" as ContractType, label: "Over / Under" },
                  { key: "LAST_DIGIT" as ContractType, label: "Last Digit" },
                ]).map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => setContractType(item.key)}
                    className={`rounded-lg px-3 py-2 text-sm ${contractType === item.key ? "bg-[#2d87dc] text-white" : "bg-[#0c2238] text-slate-300"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {contractType === "LAST_DIGIT" || contractType === "OVER_UNDER" ? (
                <div className="mb-4 rounded-xl border border-[#2f4a68] bg-[#0c2137] p-3 text-sm text-slate-300">
                  <p className="font-semibold text-cyan-200">
                    {contractType === "OVER_UNDER" ? "Pick a digit (0–9), then choose Over or Under" : "Pick a digit to match (0–9)"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {contractType === "OVER_UNDER"
                      ? "Over wins when the price indicator is at or above your digit; Under wins when it is below. The indicator is the last digit of the price, determined by the application. A tie goes to Over, so an evenly chosen side has a 50% win rate."
                      : "You win when the last digit of the exit price matches your selection. Click a number on the tracker below the chart, or use the quick picker:"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Array.from({ length: 10 }, (_, digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setSelectedDigit(digit)}
                        className={`h-9 w-9 rounded-full border text-sm font-bold transition ${selectedDigit === digit ? "border-cyan-300 bg-cyan-400/20 text-cyan-200" : "border-[#2f4a68] bg-[#0e2034] text-slate-300 hover:border-cyan-300"}`}
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span>Stake Amount</span>
              </div>

              <div className="mb-4 flex items-center overflow-hidden rounded-xl border border-[#3a9ae3] bg-[#0d2135]">
                <button type="button" onClick={() => setStake((current) => String(Math.max(1, Number(current) - 5)))} className="flex h-16 w-16 items-center justify-center border-r border-[#3a9ae3] bg-[#0c1d2d] text-3xl text-cyan-200">−</button>
                <div className="flex flex-1 items-center justify-center text-4xl font-bold text-cyan-200">${stake}</div>
                <button type="button" onClick={() => setStake((current) => String(Math.min(10000, Number(current) + 5)))} className="flex h-16 w-16 items-center justify-center border-l border-[#3a9ae3] bg-[#0c1d2d] text-3xl text-cyan-200">+</button>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-2">
                {quickStake.map((value) => (
                  <button key={value} type="button" onClick={() => setStake(String(value))} className={`rounded-lg border px-2 py-2 text-sm font-semibold ${Number(stake) === value ? "border-[#58b7ff] bg-[#122d45] text-cyan-200" : "border-[#2a3d5f] bg-[#0c2031] text-slate-300"}`}>
                    ${value}
                  </button>
                ))}
              </div>

              <div className="mb-3 rounded-xl border border-[#2f3f56] bg-[#0c1f31] p-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Potential return on win</span>
                  <span className="text-lg font-bold text-white">${totalPayout.toFixed(2)} USD</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Net profit if win</span>
                  <span className="font-mono text-emerald-300">+${netProfit.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Settlement</span>
                  <span>Server vs. {expiry}s expiry price</span>
                </div>
              </div>

              {contractType === "DIRECTION" || contractType === "OVER_UNDER" ? (
                <button
                  type="button"
                  onClick={() => setDirection((current) => (current === "UP" ? "DOWN" : "UP"))}
                  className="flex w-full items-center justify-between rounded-xl border border-[#ff5b7b] bg-[#2a1b24] px-4 py-3 text-left text-lg font-bold text-[#ff8ea5]"
                >
                  <span>
                    {contractType === "OVER_UNDER"
                      ? direction === "UP" ? "Over" : "Under"
                      : direction === "UP" ? "Up" : "Down"}
                  </span>
                  <span className="text-sm font-semibold">{contractType === "OVER_UNDER" ? "vs the selected digit" : "vs entry price"}</span>
                </button>
              ) : (
                <div className="rounded-xl border border-[#2f4a68] bg-[#0c2137] p-3 text-center text-sm text-slate-300">
                  {selectedDigit === null ? "Select a digit to continue" : <>Selected digit: <span className="font-bold text-cyan-200">{selectedDigit}</span></>}
                </div>
              )}

              {tradeMode === "auto" && (
                <button
                  type="button"
                  onClick={() => setAutoRunning((running) => !running)}
                  disabled={accountMode === "real" || busy}
                  className={`mt-3 w-full rounded-xl px-4 py-3 text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    autoRunning ? "bg-rose-500 text-white hover:bg-rose-400" : "bg-[#3a9ae3] text-[#081721] hover:bg-[#4db8ef]"
                  }`}
                >
                  {autoRunning ? "Stop auto demo" : `Start auto demo (${autoDone}/5 placed)`}
                </button>
              )}

              <button
                type="submit"
                disabled={busy || realUnfunded || ((contractType === "LAST_DIGIT" || contractType === "OVER_UNDER") && selectedDigit === null)}
                className="mt-4 w-full rounded-xl bg-[#35a9e6] px-4 py-3 text-lg font-bold text-[#081721] shadow-[0_0_18px_rgba(53,169,230,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Submitting…"
                  : accountMode === "real" && realUnfunded
                    ? "Fund your real account first"
                    : "Place trade"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <DepositModal
        open={showDeposit}
        onClose={() => setShowDeposit(false)}
        onNotice={(message) => setNotice(message)}
      />
      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onNotice={(message) => setNotice(message)}
      />
      <AccountSettingsModal
        open={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        user={user}
        onProfileUpdated={() => fetch("/api/user/profile").then((response) => response.json()).then((data) => { if (data.success) setUser(data.user); }).catch(() => undefined)}
      />
    </>
  );
}