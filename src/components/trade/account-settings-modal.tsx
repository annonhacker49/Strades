"use client";

import { useState } from "react";

export function AccountSettingsModal({ open, onClose, user, onProfileUpdated }: {
  open: boolean;
  onClose: () => void;
  user: { firstName: string; lastName: string; email: string } | null;
  onProfileUpdated: () => void;
}) {
  const [tab, setTab] = useState<"name" | "password">("name");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function updateName() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Profile could not be updated.");
      setMessage("Name updated successfully.");
      onProfileUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword() {
    setBusy(true);
    setMessage("");
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/user/security/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Password could not be updated.");
      setMessage(data.message ?? "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b13]/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-3xl border border-[#1f465d] bg-[#0a2d39]/95 p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Account Settings</h2>
          <button onClick={onClose} aria-label="Close" className="text-3xl text-white/70 hover:text-white">×</button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">{message}</p>}

        <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr]">
          <nav className="space-y-2 border-r border-white/10 pr-6">
            <button
              type="button"
              onClick={() => setTab("name")}
              className={`w-full rounded-xl px-4 py-3 text-left text-lg transition ${tab === "name" ? "bg-[#1d3b4c] text-white" : "text-slate-300 hover:bg-white/5"}`}
            >
              Change Name
            </button>
            <button
              type="button"
              onClick={() => setTab("password")}
              className={`w-full rounded-xl px-4 py-3 text-left text-lg transition ${tab === "password" ? "bg-[#1d3b4c] text-white" : "text-slate-300 hover:bg-white/5"}`}
            >
              Change Password
            </button>
          </nav>

          <div>
            {tab === "name" && (
              <div>
                <h3 className="text-2xl font-bold text-white">Change Name</h3>
                <p className="mt-2 text-slate-300">Update your display name. You can still sign in with your email.</p>
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-400">First name</span>
                    <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="field mt-2 text-lg" />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Last name</span>
                    <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="field mt-2 text-lg" />
                  </label>
                  <button onClick={updateName} disabled={busy} className="rounded-xl bg-[#39d4b5] px-5 py-3 text-lg font-bold text-[#031d22] transition hover:bg-[#5ae0c9] disabled:opacity-60">
                    {busy ? "Saving…" : "Save name"}
                  </button>
                </div>
              </div>
            )}
            {tab === "password" && (
              <div>
                <h3 className="text-2xl font-bold text-white">Change Password</h3>
                <p className="mt-2 text-slate-300">Change your password. Other active sessions (except this one) will be signed out.</p>
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Current password</span>
                    <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="field mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-400">New password</span>
                    <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="field mt-2" placeholder="12+ chars with upper/lower, number, symbol" />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Confirm new password</span>
                    <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field mt-2" />
                  </label>
                  <button onClick={updatePassword} disabled={busy} className="rounded-xl bg-[#39d4b5] px-5 py-3 text-lg font-bold text-[#031d22] transition hover:bg-[#5ae0c9] disabled:opacity-60">
                    {busy ? "Updating…" : "Update password"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}