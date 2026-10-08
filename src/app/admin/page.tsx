'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from "@/components/site-header";

interface Profile {
  id: string;
  firstName: string;
  email: string;
  role: string;
}

interface OverviewStats {
  totalUsers: number;
  suspendedUsers: number;
  admins: number;
  todayUsers: number;
  demoBalance: number;
  realBalance: number;
  depositedAmount: number;
  totalTrades: number;
  openTrades: number;
  settledTrades: number;
  wins: number;
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  twoFactorEnabled: boolean;
  suspendedAt: string | null;
  createdAt: string;
  account: { balance: string; realBalance: string; status: string } | null;
}

interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { email: string; firstName: string; lastName: string } | null;
}

const usd = (value: number | string) =>
  Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const cardClass = "rounded-2xl border border-white/10 bg-[#101827] p-5";
const labelClass = "text-sm text-slate-400 mb-2";
const valueClass = "text-2xl font-bold text-white";

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const loadUsers = useCallback(async () => {
    const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data.success) setUsers(data.users);
  }, [query]);

  const loadLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (roleFilter) params.set('action', roleFilter);
    const response = await fetch(`/api/admin/audit-logs?take=80&${params.toString()}`);
    const data = await response.json();
    if (data.success) setLogs(data.logs);
  }, [roleFilter]);

  const loadAll = useCallback(async () => {
    const [statsRes] = await Promise.all([
      fetch('/api/admin/overview'),
      loadUsers(),
      loadLogs(),
    ]);
    const statsData = await statsRes.json();
    if (statsData.success) setStats(statsData.stats);
    setLoading(false);
  }, [loadUsers, loadLogs]);

  useEffect(() => {
    const boot = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.status === 401) { router.push('/login'); return; }
        const data = await res.json();
        if (!data.success || (data.user.role !== 'ADMIN' && data.user.role !== 'SUPPORT')) {
          setDenied(true);
          setLoading(false);
          return;
        }
        setProfile(data.user);
        await loadAll();
      } catch (error) { console.error(error); setLoading(false); }
    };
    boot();
  }, [router, loadAll]);

  const toggleSuspend = async (user: AdminUser) => {
    setBusyId(user.id);
    setMessage('');
    const action = user.suspendedAt ? 'unsuspend' : 'suspend';
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: user.id, action }),
    });
    const data = await response.json();
    setBusyId(null);
    if (data.success) {
      setMessage(`${user.email} ${data.user.suspendedAt ? 'suspended' : 'unsuspended'}.`);
      await loadAll();
    } else {
      setMessage(data.error?.message ?? 'Action failed.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Loading admin console…</div>;
  }

  if (denied) {
    return (
      <>
        <SiteHeader active="dashboard" trailing={
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-300 sm:block">{profile?.firstName}</span>
            <button onClick={handleLogout} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]">Logout</button>
          </div>
        } />
        <main className="mx-auto w-full max-w-7xl px-5 py-24 text-center text-white sm:px-8">
          <h1 className="text-3xl font-bold">Administrator access required</h1>
          <p className="mt-3 text-slate-300">Your account does not have permission to view this console.</p>
          <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">Back to dashboard</Link>
        </main>
      </>
    );
  }

  const winRate = stats && stats.settledTrades > 0 ? Math.round((stats.wins / stats.settledTrades) * 100) : 0;

  return (
    <>
      <SiteHeader active="admin" trailing={
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-300 sm:block">{profile?.firstName} (admin)</span>
          <button onClick={handleLogout} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]">Logout</button>
        </div>
      } />

      <main className="mx-auto w-full max-w-7xl px-5 py-8 text-white sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="mb-2 text-4xl font-bold">Admin console</h2>
            <p className="text-slate-300">Users, balances, trades and audit trail across the platform.</p>
          </div>
          <button onClick={loadAll} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">
            Refresh
          </button>
        </div>

        {message && <div role="status" className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-300/[0.05] p-3 text-sm text-emerald-200">{message}</div>}

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <div className={cardClass}>
            <p className={labelClass}>Total users</p>
            <p className={valueClass}>{stats?.totalUsers ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">{stats?.todayUsers ?? 0} today</p>
          </div>
          <div className={cardClass}>
            <p className={labelClass}>Suspended</p>
            <p className={`${valueClass} text-amber-300`}>{stats?.suspendedUsers ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">{stats?.admins ?? 0} admins</p>
          </div>
          <div className={cardClass}>
            <p className={labelClass}>Demo balance (all)</p>
            <p className={`${valueClass} text-emerald-300`}>{usd(stats?.demoBalance ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">virtual funds</p>
          </div>
          <div className={cardClass}>
            <p className={labelClass}>Real balance (all)</p>
            <p className={`${valueClass} text-cyan-300`}>{usd(stats?.realBalance ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">deposited {usd(stats?.depositedAmount ?? 0)}</p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="grid grid-cols-2 gap-4">
              <div className={cardClass}>
                <p className={labelClass}>Open trades</p>
                <p className={valueClass}>{stats?.openTrades ?? 0}</p>
              </div>
              <div className={cardClass}>
                <p className={labelClass}>Win rate</p>
                <p className={`${valueClass} text-emerald-300`}>{winRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-[#0d1424] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold">Users</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); loadUsers(); } }}
                placeholder="search name or email…"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400/50"
              />
              <button onClick={loadUsers} className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">Search</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4 font-medium">User</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">KYC / 2FA</th>
                  <th className="py-3 pr-4 text-right font-medium">Demo</th>
                  <th className="py-3 pr-4 text-right font-medium">Real</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td className="py-6 text-center text-slate-500">No users found.</td></tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5">
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="py-3 pr-4"><span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs">{user.role}</span></td>
                    <td className="py-3 pr-4 text-xs text-slate-300">
                      {user.kycStatus}{user.twoFactorEnabled ? ' · 2FA' : ''}
                    </td>
                    <td className="py-3 pr-4 text-right text-emerald-300">{usd(user.account?.balance ?? 0)}</td>
                    <td className="py-3 pr-4 text-right text-cyan-300">{usd(user.account?.realBalance ?? 0)}</td>
                    <td className="py-3 pr-4">
                      {user.suspendedAt
                        ? <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">Suspended</span>
                        : <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">Active</span>}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleSuspend(user)}
                        disabled={busyId === user.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                          user.suspendedAt
                            ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                            : "border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                        }`}
                      >
                        {busyId === user.id ? 'Working…' : user.suspendedAt ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold">Audit trail</h3>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              <option value="">All actions</option>
              <option value="REGISTER">REGISTER</option>
              <option value="LOGIN">LOGIN</option>
              <option value="DEPOSIT_INITIATED">DEPOSIT_INITIATED</option>
              <option value="WITHDRAWAL_INITIATED">WITHDRAWAL_INITIATED</option>
              <option value="ADMIN_SUSPEND_USER">ADMIN_SUSPEND_USER</option>
              <option value="ADMIN_UNSUSPEND_USER">ADMIN_UNSUSPEND_USER</option>
              <option value="PROFILE_UPDATED">PROFILE_UPDATED</option>
              <option value="TWO_FACTOR">TWO_FACTOR</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4 font-medium">When</th>
                  <th className="py-3 pr-4 font-medium">Actor</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                  <th className="py-3 pr-4 font-medium">Entity</th>
                  <th className="py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td className="py-6 text-center text-slate-500">No audit entries.</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 whitespace-nowrap text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-xs">{log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})` : (log.actorId ?? 'system')}</td>
                    <td className="py-3 pr-4"><span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-xs">{log.action}</span></td>
                    <td className="py-3 pr-4 text-xs text-slate-300">{log.entityType}</td>
                    <td className="py-3 font-mono text-xs text-slate-400 break-all">{log.metadata ? JSON.stringify(log.metadata) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}