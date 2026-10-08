'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', twoFactorCode: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (result.success) {
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next === "/trade" ? next : "/dashboard");
      } else {
        setError(result.error?.message || 'Login failed.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader mode="guest" />
      <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#101827] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Sign In</h1>
          <p className="text-slate-300 text-sm mb-6">Access your STRADES demo account</p>

          {error && <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange}
              className="field"
              required
            />

            <input
              type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange}
              className="field"
              required
            />

            <input
              type="text" name="twoFactorCode" inputMode="numeric" autoComplete="one-time-code"
              placeholder="Authenticator code (if enabled)" value={formData.twoFactorCode} onChange={handleChange}
              className="field"
              maxLength={6}
            />

            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Don&apos;t have an account? <Link href="/register" className="text-cyan-300 hover:text-cyan-200">Register here</Link>
          </p>
          <p className="mt-3 text-center text-sm"><Link href="/forgot-password" className="text-cyan-300 hover:text-cyan-200">Forgot password?</Link></p>
          <ResendVerification />
        </div>
      </div>
      </main>
      </>
  );
}

function ResendVerification() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  async function resend() {
    setMessage("");
    const response = await fetch("/api/auth/verify-email/resend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setMessage(response.ok ? data.message : data.error?.message ?? "Could not send verification email.");
  }
  return <div className="mt-6 border-t border-slate-700 pt-4">
    <label className="text-xs text-slate-400" htmlFor="resend-verification">Need a verification link?</label>
    <div className="mt-2 flex gap-2">
      <input id="resend-verification" type="email" value={email} onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address" className="field min-w-0 flex-1 text-sm" />
      <button type="button" onClick={resend} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white transition hover:bg-white/10">Resend</button>
    </div>
    {message && <p role="status" className="mt-2 text-xs text-slate-300">{message}</p>}
  </div>;
}
