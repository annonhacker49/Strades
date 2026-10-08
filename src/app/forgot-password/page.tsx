"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setError("");
    const email = new FormData(event.currentTarget).get("email");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Request failed.");
      setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed."); }
  }
  return <>
    <SiteHeader mode="guest" />
    <main className="mx-auto my-12 w-full max-w-lg rounded-2xl border border-white/10 bg-[#101827] p-6 text-white sm:p-8">
    <h1 className="text-2xl font-bold">Reset your password</h1>
    <p className="mt-2 text-slate-300">We’ll email a single-use reset link if the account exists.</p>
    {message && <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-emerald-200">{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-rose-200">{error}</p>}
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <input name="email" type="email" required placeholder="Email address" className="field" />
      <button className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">Send reset link</button>
    </form>
    <Link href="/login" className="mt-5 inline-block text-cyan-300">Back to sign in</Link>
    </main>
  </>;
}
