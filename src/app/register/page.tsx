"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const data = {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      country: String(form.get("country") ?? ""),
      dateOfBirth: String(form.get("dateOfBirth") ?? ""),
      password: String(form.get("password") ?? ""),
      termsAccepted: form.get("termsAccepted") === "on",
    };
    const passwordConfirmation = String(form.get("confirmPassword") ?? "");
    if (data.password !== passwordConfirmation) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Registration failed.");
      if (result.emailVerificationRequired) {
        router.push("/dashboard?verifyEmail=1");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <SiteHeader mode="guest" />
    <main className="mx-auto my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#101827] p-6 text-white sm:p-8">
      <Link href="/" className="text-sm text-cyan-300">STRADES</Link>
      <h1 className="mt-5 text-3xl font-bold">Create your demo account</h1>
      <p className="mt-2 text-sm text-slate-300">Demo trading only. Your $10,000 balance is virtual.</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-rose-200">{error}</p>}
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <input name="firstName" placeholder="First name" required maxLength={60} className="field" />
        <input name="lastName" placeholder="Last name" required maxLength={60} className="field" />
        <input name="email" type="email" placeholder="Email" required className="field sm:col-span-2" />
        <input name="phone" type="tel" placeholder="Phone (+15551234567)" required className="field sm:col-span-2" />
        <input name="country" placeholder="Country" required maxLength={80} className="field" />
        <label className="text-sm text-slate-300">Date of birth
          <input name="dateOfBirth" type="date" required className="field mt-1 w-full" />
        </label>
        <input name="password" type="password" autoComplete="new-password" placeholder="Password (12+ chars)" required className="field sm:col-span-2" />
        <input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm password" required className="field sm:col-span-2" />
        <label className="flex gap-3 text-sm text-slate-300 sm:col-span-2">
          <input name="termsAccepted" type="checkbox" required />
          <span>I accept the terms and understand this is a simulated demo with virtual funds only.</span>
        </label>
        <button disabled={pending} className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 sm:col-span-2">
          {pending ? "Creating account…" : "Create demo account"}
        </button>
      </form>
      <p className="mt-5 text-sm text-slate-300">Already registered? <Link href="/login" className="text-cyan-300">Sign in</Link></p>
    </main>
    </>
  );
}
