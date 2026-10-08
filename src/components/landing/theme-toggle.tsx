"use client";

import { useEffect } from "react";

export function ThemeToggle() {
  useEffect(() => {
    const saved = localStorage.getItem("strades-theme");
    const preferred = saved === "light" || (saved === null && window.matchMedia?.("(prefers-color-scheme: light)").matches);
    document.documentElement.classList.toggle("lp-light", preferred);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("lp-light");
    document.documentElement.classList.toggle("lp-light", next);
    localStorage.setItem("strades-theme", next ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--lp-line)] bg-[var(--lp-soft)] text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-accent)]"
    >
      <span className="[html.lp-light_&]:hidden" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
      <span className="hidden [html.lp-light_&]:inline" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>
    </button>
  );
}