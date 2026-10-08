import Link from "next/link";
import { Logo } from "@/components/logo";
import { HeroChart } from "@/components/landing/hero-chart";
import { Ticker } from "@/components/landing/ticker";
import { Faq } from "@/components/landing/faq";
import { ThemeToggle } from "@/components/landing/theme-toggle";

const features = [
  {
    number: "01",
    title: "$10,000 virtual balance",
    description: "Every new account is funded instantly with virtual USD. Start trading the moment you sign up — no card, no deposit, no risk.",
  },
  {
    number: "02",
    title: "Transparent server settlement",
    description: "Trades settle against the displayed simulated price at expiry — never against a hand-picked outcome. What you see is what decides the result.",
  },
  {
    number: "03",
    title: "12 simulated markets",
    description: "Major FX pairs, gold and silver, and the biggest crypto names — all quoted under standard symbols in one terminal.",
  },
  {
    number: "04",
    title: "Short expiries, fast feedback",
    description: "Choose from 10, 15, 30, 60 or 120 seconds. Short contracts mean you see dozens of results during a single practice session.",
  },
  {
    number: "05",
    title: "Auto demo mode",
    description: "Let the terminal place five mixed trades by itself — watch them appear on the chart and settle against the live feed.",
  },
  {
    number: "06",
    title: "Complete trade history",
    description: "Every contract, digit, opening and exit price stays attached to your account so you can review exactly what happened.",
  },
];

const steps = [
  {
    title: "Create your account",
    description: "Sign up with just an email and password. Your demo account is credited with $10,000 virtual USD instantly.",
  },
  {
    title: "Pick a market and contract",
    description: "Choose a symbol like EUR/USD or BTC/USD, decide Up/Down, Over/Under or Last Digit, set a stake and expiry.",
  },
  {
    title: "Watch it settle",
    description: "The application compares your bet against the price at expiry, credits wins, and books losses to your balance.",
  },
];

const contracts = [
  {
    icon: "⇅",
    name: "Up / Down",
    description: "Will the exit price be above or below the entry price? A 50/50 call on direction.",
  },
  {
    icon: "≷",
    name: "Over / Under",
    description: "Pick a digit; Over wins when the price indicator is at or above it, Under wins below. Balanced and transparent.",
  },
  {
    icon: "#",
    name: "Last Digit",
    description: "Predict the exact last digit of the expiry price for the biggest payoff — a precision challenge.",
  },
];

const markets: { symbol: string; label: string }[] = [
  { symbol: "EUR/USD", label: "Euro / US Dollar" },
  { symbol: "GBP/USD", label: "British Pound / US Dollar" },
  { symbol: "USD/JPY", label: "US Dollar / Japanese Yen" },
  { symbol: "USD/CHF", label: "US Dollar / Swiss Franc" },
  { symbol: "AUD/USD", label: "Australian Dollar / US Dollar" },
  { symbol: "USD/CAD", label: "US Dollar / Canadian Dollar" },
  { symbol: "XAU/USD", label: "Gold Spot" },
  { symbol: "XAG/USD", label: "Silver Spot" },
  { symbol: "BTC/USD", label: "Bitcoin" },
  { symbol: "ETH/USD", label: "Ethereum" },
  { symbol: "XRP/USD", label: "Ripple" },
  { symbol: "SOL/USD", label: "Solana" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--lp-bg)] text-[var(--lp-fg)] transition-colors duration-300">
      <header className="sticky top-0 z-30 border-b border-[var(--lp-line)] bg-[var(--lp-bg)]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="STRADES home">
            <Logo className="h-10 w-10" />
            <span className="text-lg font-bold tracking-[0.18em]">STRADES</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/trade" className="hidden rounded-lg px-4 py-2 text-sm text-[var(--lp-muted)] transition hover:bg-[var(--lp-soft)] hover:text-[var(--lp-fg)] sm:block">
              Explore demo
            </Link>
            <Link href="/login" className="hidden rounded-lg px-4 py-2 text-sm text-[var(--lp-muted)] transition hover:bg-[var(--lp-soft)] hover:text-[var(--lp-fg)] sm:block">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[var(--lp-accent)] px-4 py-2 text-sm font-bold text-[#06202b] transition hover:brightness-110"
            >
              Create account
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="absolute -left-48 top-12 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            LIVE FEED · VIRTUAL AND REAL FUNDS
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Practice your next move.
            <span className="mt-2 block bg-gradient-to-r from-[var(--lp-accent)] to-[var(--lp-accent2)] bg-clip-text text-transparent">
              Build your trading routine.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--lp-muted)]">
            A moving price feed, three digit-based contract types, and short expiries — so you can train your eye on real price action with virtual funds. No deposits, no withdrawals, no risk.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-[var(--lp-accent)] px-6 py-3.5 font-bold text-[#06202b] shadow-[0_0_24px_rgba(34,211,238,0.35)] transition hover:brightness-110">
              Start with $10,000 virtual
            </Link>
            <Link
              href="/trade"
              className="rounded-xl border border-[var(--lp-line)] px-6 py-3.5 font-semibold text-[var(--lp-fg)] transition hover:bg-[var(--lp-soft)]"
            >
              View practice terminal
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--lp-muted)]">
            <span>✓ No payment details</span>
            <span>✓ Server-settled results</span>
            <span>✓ 12 markets · 3 contracts</span>
          </div>
        </div>

        <HeroChart />
      </section>

      <section className="border-y border-[var(--lp-line)] bg-[var(--lp-soft)] transition-colors">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 text-center sm:px-8 md:grid-cols-4">
          {[
            { value: "$10,000", label: "Virtual starting balance" },
            { value: "12", label: "Simulated markets" },
            { value: "3", label: "Contract types" },
            { value: "10–120s", label: "Trade expiries" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-black text-[var(--lp-fg)]">{stat.value}</p>
              <p className="mt-1 text-sm text-[var(--lp-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.22em] text-[var(--lp-accent)]">WHY STRADES</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">A complete practice terminal, nothing to lose</h2>
          <p className="mt-4 text-lg leading-8 text-[var(--lp-muted)]">
            Everything a real short-expiry terminal does — without a single real-dollar transaction.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.number} className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-surface)] p-6 transition-colors hover:border-[var(--lp-accent)]/40">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--lp-accent)]">{feature.number}</p>
              <h3 className="mt-3 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--lp-muted)]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--lp-line)] bg-[var(--lp-soft)] transition-colors">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.22em] text-[var(--lp-accent)]">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Three steps to your first result</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="relative rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-surface)] p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--lp-accent)] to-[var(--lp-accent2)] text-lg font-black text-[#06202b]">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--lp-muted)]">{step.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {contracts.map((contract) => (
              <article key={contract.name} className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-surface)] p-6 text-center transition-colors hover:border-[var(--lp-accent)]/40">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--lp-soft)] text-2xl font-black text-[var(--lp-accent)]">{contract.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{contract.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--lp-muted)]">{contract.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-center text-xs font-bold tracking-[0.22em] text-[var(--lp-accent)]">THE MARKETS</p>
        <h2 className="mt-3 text-center text-3xl font-bold sm:text-4xl">Trade with standard symbols</h2>
        <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-3">
          {markets.map((market) => (
            <div
              key={market.symbol}
              title={market.label}
              className="flex items-center gap-2.5 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-surface)] px-4 py-2.5"
            >
              <span className="text-sm font-bold tracking-wider text-[var(--lp-fg)]">{market.symbol}</span>
              <span className="hidden text-xs text-[var(--lp-muted)] sm:inline">{market.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--lp-line)] bg-[var(--lp-soft)] transition-colors">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.22em] text-[var(--lp-accent)]">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Questions, answered</h2>
          </div>
          <Faq />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
        <h2 className="text-3xl font-bold sm:text-4xl">Ready to practise your next move?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--lp-muted)]">
          Your $10,000 virtual balance is waiting. No payment details required.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="rounded-xl bg-[var(--lp-accent)] px-7 py-3.5 font-bold text-[#06202b] shadow-[0_0_24px_rgba(34,211,238,0.35)] transition hover:brightness-110">
            Create free account
          </Link>
          <Link href="/login" className="rounded-xl border border-[var(--lp-line)] px-7 py-3.5 font-semibold text-[var(--lp-fg)] transition hover:bg-[var(--lp-soft)]">
            Sign in
          </Link>
        </div>
      </section>

      <Ticker />

      <footer className="border-t border-[var(--lp-line)] px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="font-bold tracking-[0.18em]">STRADES</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--lp-muted)]">
              A simulated practice platform. Virtual funds have no cash value and cannot be withdrawn or redeemed.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--lp-muted)]">EXPLORE</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/trade" className="text-[var(--lp-fg)]/80 hover:text-[var(--lp-accent)]">Practice terminal</Link></li>
              <li><Link href="/register" className="text-[var(--lp-fg)]/80 hover:text-[var(--lp-accent)]">Create account</Link></li>
              <li><Link href="/login" className="text-[var(--lp-fg)]/80 hover:text-[var(--lp-accent)]">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--lp-muted)]">CONTRACTS</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--lp-fg)]/80">
              <li>Up / Down</li>
              <li>Over / Under</li>
              <li>Last Digit</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--lp-muted)]">TRUST</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--lp-fg)]/80">
              <li>Demo mode only</li>
              <li>Server-settled results</li>
              <li>No payments or deposits</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--lp-line)] pt-6 text-xs text-[var(--lp-muted)] sm:flex-row">
          <p>© {new Date().getFullYear()} STRADES · A simulated practice platform.</p>
          <ThemeToggle />
        </div>
      </footer>
    </main>
  );
}