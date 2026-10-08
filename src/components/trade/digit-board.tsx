"use client";

export type DigitOutcome = { digit: number; win: boolean };

export function DigitBoard({
  selection,
  onSelect,
  liveDigit,
  outcomes,
  interactive,
}: {
  selection: number | null;
  onSelect: (digit: number) => void;
  liveDigit: number;
  outcomes: DigitOutcome[];
  interactive: boolean;
}) {
  const latestByDigit = new Map<number, DigitOutcome>();
  for (const outcome of outcomes) {
    if (!latestByDigit.has(outcome.digit)) latestByDigit.set(outcome.digit, outcome);
  }

  return (
    <div className="mt-4 px-2 pb-2">
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
        <span>Digit tracker</span>
        <span className="normal-case tracking-normal text-slate-500">Green = hit · Red = miss · Pointer = live price digit</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
        {Array.from({ length: 10 }, (_, digit) => {
          const outcome = latestByDigit.get(digit);
          const isPointer = liveDigit === digit;
          const isSelected = selection === digit;
          const ring = outcome
            ? outcome.win
              ? "border-emerald-400 bg-emerald-400/15 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
              : "border-rose-400 bg-rose-400/15 shadow-[0_0_14px_rgba(251,113,133,0.3)]"
            : isSelected
              ? "border-cyan-300 bg-cyan-400/15 shadow-[0_0_14px_rgba(103,232,249,0.4)]"
              : "border-[#2f6c9d] bg-[#0b1d2f]";
          return (
            <button
              key={digit}
              type="button"
              disabled={!interactive}
              onClick={() => onSelect(digit)}
              aria-pressed={isSelected}
              className={`relative flex aspect-square items-center justify-center rounded-full border-2 text-sm font-semibold transition-all sm:text-base ${ring} ${
                interactive ? "cursor-pointer hover:scale-105 hover:border-cyan-300" : "cursor-default"
              }`}
            >
              {digit}
              {isPointer && (
                <span className="absolute -bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]" />
              )}
              {outcome && (
                <span className={`absolute inset-0 grid place-items-center text-xs ${outcome.win ? "text-emerald-300" : "text-rose-300"}`}>
                  {outcome.win ? "●" : "✕"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-center text-xs text-slate-500">
        {selection === null ? "Select a digit to trade the last digit of the expiry price." : `Betting on digit ${selection} — the ring turns green on a hit, red on a miss.`}
      </div>
    </div>
  );
}