"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Is STRADES a real trading platform?",
    answer: "No. STRADES is a fully simulated practice platform. Every price in the terminal comes from our simulated feed, all results are settled by the application against the displayed price at expiry, and virtual funds have no cash value. There are no real-money trades, deposits, or withdrawals.",
  },
  {
    question: "How much money do I get to practise with?",
    answer: "Every new account starts with $10,000 in virtual USD. Because it is virtual, you can open a trade as soon as you sign up — no payment details, cards, or deposits are ever needed.",
  },
  {
    question: "Which markets can I trade?",
    answer: "The terminal covers 12 simulated instruments using standard symbols: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, XAU/USD (gold), XAG/USD (silver), BTC/USD, ETH/USD, XRP/USD and SOL/USD.",
  },
  {
    question: "What contract types are available?",
    answer: "Three: Up/Down (will the price exit above or below entry), Over/Under (compare the price indicator — the last digit of the exit price — against a digit you pick), and Last Digit (predict the exact last digit). Over wins when the indicator is at or above your digit; Under wins when it is below, so an evenly chosen side enjoys a 50% win rate.",
  },
  {
    question: "Why do some trades lose?",
    answer: "Results are decided by the price feed, not manually. The market ticks randomly, so wins and losses mix naturally. That is the point of practice — you learn to read the chart before risking anything.",
  },
  {
    question: "Are there any hidden charges or fees?",
    answer: "None. There is no cost to register, no monthly fee, and no per-trade charge. Virtual balances are for learning only and cannot be redeemed or converted to real money.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div className="space-y-3">
        {faqs.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={item.question} className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-surface)] transition-colors">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-semibold text-[var(--lp-fg)]">{item.question}</span>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--lp-line)] text-sm text-[var(--lp-muted)] transition-transform duration-200 ${
                    expanded ? "rotate-45" : ""
                  }`}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-6 text-[var(--lp-muted)]">{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}