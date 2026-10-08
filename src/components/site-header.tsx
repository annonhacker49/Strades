import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

type SiteSection = "dashboard" | "trade" | "trades" | "finance" | "admin";

const appLinks: { href: string; label: string; section: SiteSection }[] = [
  { href: "/dashboard", label: "Overview", section: "dashboard" },
  { href: "/trades", label: "History", section: "trades" },
];

export function SiteHeader({
  active,
  mode = "app",
  trailing,
}: {
  active?: SiteSection;
  mode?: "app" | "guest";
  trailing?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080d18]/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="STRADES home">
          <Logo className="h-9 w-9" />
          <span className="text-sm font-bold tracking-[0.18em] sm:text-base">STRADES</span>
        </Link>
        {mode === "app" ? (
          <div className="order-3 flex w-full items-center justify-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {appLinks.map((link) => (
              <Link
                key={link.section}
                href={link.href}
                aria-current={active === link.section ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active === link.section
                    ? "bg-white/[0.07] font-semibold text-cyan-300"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/trade" className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white sm:block">
            Explore demo
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {trailing ?? (mode === "guest" ? (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
                Sign in
              </Link>
              <Link href="/register" className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 sm:px-4">
                Create account
              </Link>
            </>
          ) : null)}
        </div>
      </nav>
    </header>
  );
}
