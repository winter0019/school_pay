'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  Activity,
  ArrowUpRight,
  Shield,
  Search,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import {
  getAdminMetrics,
  getReportedUsers,
  dismissReport,
  warnUser,
  restrictUser,
  type AdminMetrics,
  type ReportedUser,
} from '@/features/admin/services/adminService';

export default function AdminDashboardPage() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reports, setReports] = useState<ReportedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Auth & Role Verification Guard
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
          console.warn('Unauthorized access attempt to /admin');
          router.push('/conversations');
          return;
        }

        // User is confirmed admin, fetch dashboard metrics
        const [m, r] = await Promise.all([getAdminMetrics(), getReportedUsers()]);
        setMetrics(m);
        setReports(r);
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // Moderation Action Handlers
  const handleDismiss = async (reportId: string) => {
    setProcessingId(reportId);
    try {
      await dismissReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      showNotice('Report dismissed successfully.');
    } catch (err) {
      showNotice('Failed to dismiss report.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleWarn = async (reportId: string, userId: string) => {
    setProcessingId(reportId);
    try {
      await warnUser(reportId, userId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      showNotice('User warned and safety score updated.');
    } catch (err) {
      showNotice('Failed to issue warning.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestrict = async (reportId: string, userId: string) => {
    setProcessingId(reportId);
    try {
      await restrictUser(reportId, userId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      showNotice('User account suspended.');
    } catch (err) {
      showNotice('Failed to restrict user.');
    } finally {
      setProcessingId(null);
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Filter reports by search query
  const filteredReports = reports.filter((rep) => {
    const q = searchQuery.toLowerCase();
    return (
      rep.reportedByName.toLowerCase().includes(q) ||
      rep.reportedUserUid.toLowerCase().includes(q) ||
      rep.reason.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-indigo-400 font-medium">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Verifying Governance Credentials...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 z-10 relative">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <Shield className="w-4 h-4" /> System Governance
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Admin Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {actionNotice && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                {actionNotice}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </header>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total Registered Users</span>
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-white">{metrics?.totalUsers ?? 0}</h2>
              <span className="text-xs font-semibold text-emerald-400 flex items-center">
                +12% <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{metrics?.activeUsersToday ?? 0} active today</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Active Conversations</span>
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-white">{metrics?.totalConversations ?? 0}</h2>
              <span className="text-xs font-semibold text-emerald-400 flex items-center">
                +8% <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Privacy-preserving tracking</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">AI Prompts / Day</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-white">{metrics?.aiPromptsUsedToday ?? 0}</h2>
              <span className="text-xs font-semibold text-emerald-400 flex items-center">
                +24% <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Smart replies & icebreakers</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Estimated MRR</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-white">${metrics?.monthlyRevenue ?? 0}</h2>
              <span className="text-xs font-semibold text-emerald-400 flex items-center">
                +15% <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Subscription & Premium tier</p>
          </div>
        </div>

        {/* MODERATION QUEUE & USER CONTROL SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ABUSE MODERATION QUEUE */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-semibold text-slate-100 text-base">Abuse & Safety Queue</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
                {filteredReports.length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {filteredReports.length === 0 ? (
                <div className="p-8 border border-slate-800/60 rounded-xl bg-slate-950/40 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-400">No active reports matching your filter.</p>
                </div>
              ) : (
                filteredReports.map((rep) => {
                  const isProcessing = processingId === rep.id;
                  return (
                    <div
                      key={rep.id}
                      className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {rep.reportedByName}
                          </span>
                          <span className="text-[10px] text-slate-500">• {rep.createdAt}</span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-md font-bold uppercase ${
                              rep.severity === 'high'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {rep.severity} risk
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{rep.reason}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleDismiss(rep.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleWarn(rep.id, rep.reportedUserUid)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 border border-amber-500/30 text-amber-300 hover:text-slate-950 text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Warn
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRestrict(rep.id, rep.reportedUserUid)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5" /> Restrict
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK SEARCH & ACTIONS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-slate-100 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" /> Platform Insights
            </h3>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search report, name, or UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>AI Moderation Precision</span>
                <span className="font-semibold text-emerald-400">98.4%</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>Smart Reply Acceptance Rate</span>
                <span className="font-semibold text-indigo-400">64.2%</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>Icebreaker Engagement</span>
                <span className="font-semibold text-purple-400">71.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}