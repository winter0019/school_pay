'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  Activity,
  DollarSign,
  TrendingUp,
  Cpu,
  BarChart3,
  PieChart,
  Zap,
} from 'lucide-react';
import {
  getAnalyticsData,
  type AnalyticsData,
} from '@/features/admin/services/analyticsService';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getAnalyticsData();
      setAnalytics(data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-indigo-400 font-medium">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Computing Intelligence Metrics...</span>
        </div>
      </main>
    );
  }

  const totalMrr = analytics?.revenueBreakdown.reduce((acc, curr) => acc + curr.mrrContribution, 0) || 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 z-10 relative">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
                <BarChart3 className="w-4 h-4" /> System Governance
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                AI & Revenue Analytics
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>AI Token Engine Online</span>
          </div>
        </header>

        {/* TOP KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total AI Tokens Used</span>
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {analytics?.totalTokensUsed.toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-500">Across all active prompts</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Smart Reply Acceptance</span>
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {analytics?.smartReplyAcceptanceRate}%
            </h2>
            <p className="text-[11px] text-slate-500">One-tap response conversions</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Icebreaker Engagement</span>
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {analytics?.icebreakerEngagementRate}%
            </h2>
            <p className="text-[11px] text-slate-500">First-message conversion rate</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total Monthly Revenue</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">${totalMrr}</h2>
            <p className="text-[11px] text-slate-500">Calculated recurring revenue</p>
          </div>
        </div>

        {/* ANALYTICS CHARTS AND BREAKDOWNS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI FEATURE USAGE SHARE */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-slate-100 text-base">AI Usage by Feature</h3>
              </div>
              <span className="text-xs text-slate-400">Token distribution</span>
            </div>

            {/* PROGRESS STACK BAR */}
            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
              {analytics?.featureMetrics.map((item, idx) => (
                <div
                  key={idx}
                  style={{ width: `${item.percentageShare}%` }}
                  className={`h-full ${item.color} transition-all duration-300`}
                  title={`${item.featureName}: ${item.percentageShare}%`}
                />
              ))}
            </div>

            {/* FEATURE LIST */}
            <div className="space-y-3 pt-2">
              {analytics?.featureMetrics.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    <div>
                      <p className="font-semibold text-slate-200">{item.featureName}</p>
                      <p className="text-[10px] text-slate-500">{item.totalCalls.toLocaleString()} calls</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-100">{item.percentageShare}%</p>
                    <p className="text-[10px] text-slate-400">{item.tokensUsed.toLocaleString()} tokens</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REVENUE & SUBSCRIPTION TIER BREAKDOWN */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-slate-100 text-base">Subscription Tier Breakdown</h3>
              </div>
              <span className="text-xs text-slate-400">Active user tiers</span>
            </div>

            <div className="space-y-3">
              {analytics?.revenueBreakdown.map((tier, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <div>
                      <p className="font-semibold text-slate-200">{tier.planTier}</p>
                      <p className="text-[10px] text-slate-500">{tier.activeSubscribers} active subscribers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400 text-sm">${tier.mrrContribution}/mo</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
              <span>Average Revenue Per User (ARPU)</span>
              <span className="font-bold text-indigo-200">$4.52 / mo</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}