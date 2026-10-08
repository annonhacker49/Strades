"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email…");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        await Promise.resolve();
        if (!cancelled) setMessage("Verification link is missing or invalid.");
        return;
      }
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await response.json();
        if (!cancelled) setMessage(response.ok ? result.message : result.error?.message ?? "Verification failed.");
      } catch {
        if (!cancelled) setMessage("Unable to verify right now. Please try again.");
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return <>
    <SiteHeader mode="guest" />
    <main className="mx-auto my-12 w-full max-w-lg rounded-2xl border border-white/10 bg-[#101827] p-6 text-white sm:p-8">
    <h1 className="text-2xl font-bold">Email verification</h1>
    <p className="mt-4 text-slate-300">{message}</p>
    <Link className="mt-6 inline-block text-cyan-300" href="/login">Continue to sign in</Link>
    </main>
  </>;
}
