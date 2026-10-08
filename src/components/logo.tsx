import { useId } from "react";

export function Logo({ className }: { className?: string }) {
  const id = useId();
  const bg = `logo-bg-${id}`;
  const line = `logo-line-${id}`;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="STRADES logo" focusable="false">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={line} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#083344" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="26" fill={`url(#${bg})`} />
      <polyline
        points="20,72 34,56 48,62 62,44 76,32 88,22"
        fill="none"
        stroke={`url(#${line})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="88" cy="22" r="5.5" fill="#083344" />
      <circle cx="88" cy="22" r="10" fill="#083344" opacity="0.14" />
      <circle cx="48" cy="62" r="3" fill="#083344" opacity="0.55" />
    </svg>
  );
}