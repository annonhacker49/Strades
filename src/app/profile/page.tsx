"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

type Setup = { secret: string; authenticatorUri: string };

export default function ProfilePage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile").then(async (response) => {
      if (response.status === 401) { router.push("/login"); return; }
      const result = await response.json();
      if (result.success) setEnabled(result.user.twoFactorEnabled);
    }).catch(() => setError("Could not load profile."));
  }, [router]);

  async function action(method: "POST" | "DELETE", body: Record<string, string>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/user/security/2fa", {
        method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Security setting could not be updated.");
      if (body.action === "begin") setSetup(result);
      if (body.action === "confirm") { setEnabled(true); setSetup(null); setCode(""); }
      if (method === "DELETE") { setEnabled(false); setCode(""); }
      setMessage(result.message ?? (method === "DELETE" ? "Two-factor authentication disabled." : "Two-factor authentication enabled."));
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed."); }
    finally { setBusy(false); }
  }

  return <>
    <SiteHeader />
    <main className="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#101827] p-6 text-white sm:p-8">
    <Link href="/dashboard" className="text-sm text-cyan-300">← Dashboard</Link>
    <h1 className="mt-5 text-3xl font-bold">Profile & security</h1>
    <p className="mt-2 text-slate-300">Add an authenticator app as an additional sign-in factor.</p>
    {message && <p role="status" className="mt-4 text-emerald-300">{message}</p>}
    {error && <p role="alert" className="mt-4 text-red-300">{error}</p>}
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Authenticator-based two-factor authentication</h2>
          <p className="mt-1 text-sm text-slate-400">Status: {enabled ? "Enabled" : "Disabled"}</p></div>
        {!enabled && !setup && <button disabled={busy} onClick={() => action("POST", { action: "begin" })}
          className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">Set up 2FA</button>}
      </div>
      {setup && <div className="mt-5 space-y-3">
        <p className="text-sm text-amber-200">Store this key in your authenticator app. It is shown only during setup.</p>
        <code className="block break-all rounded-xl border border-white/10 bg-[#080d18] p-3 text-cyan-200">{setup.secret}</code>
        <a className="text-sm text-cyan-300 underline" href={setup.authenticatorUri}>Open authenticator app</a>
        <div className="flex gap-2">
          <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={6}
            inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" className="field min-w-0 flex-1" />
          <button disabled={busy} onClick={() => action("POST", { action: "confirm", code })}
            className="rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50">Confirm</button>
        </div>
      </div>}
      {enabled && <div className="mt-5 flex gap-2">
        <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={6}
          inputMode="numeric" placeholder="Current authenticator code" className="field min-w-0 flex-1" />
        <button disabled={busy} onClick={() => action("DELETE", { code })}
          className="rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50">Disable 2FA</button>
      </div>}
    </section>
    </main>
  </>;
}
