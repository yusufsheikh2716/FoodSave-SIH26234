'use client';

import React from 'react';
import Link from 'next/link';
import { ESGCards } from '@/components/esg-cards';
import {
  UtensilsCrossed,
  Truck,
  Sparkles,
  Leaf,
  ShieldCheck,
  ArrowRight,
  Clock,
  Radio,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SIH26234 Ecosystem &bull; 3-Tier Production Architecture</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            AI-Powered Smart Food Waste Reduction & Sustainable Redistribution
          </h1>

          <p className="mt-4 text-sm md:text-base text-slate-300/90 leading-relaxed max-w-2xl">
            Empowering institutional kitchens with predictive demand forecasting, microbiological
            safe shelf-life estimation, and zero-latency emergency redistribution to nearby NGOs via
            dynamic urgency proximity matching.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/dispatch"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Radio className="w-4 h-4 text-slate-950" />
              <span>Explore Live Dispatch Feed</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/dashboard/surplus"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all"
            >
              <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
              <span>Log Surplus Food Batch</span>
            </Link>

            <Link
              href="/dashboard/advisor"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-teal-300 bg-teal-950/40 hover:bg-teal-900/40 border border-teal-500/30 transition-all"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>AI Prep Advisor</span>
            </Link>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Live ESG Avoided Impact Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <span>Real-Time Environmental & Nutritional Impact</span>
          </h2>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>Detailed Breakdown</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <ESGCards />
      </section>

      {/* 3 Core Interactive Ecosystem Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Donor Kitchen */}
        <div className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Donor Kitchen Portal</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Instant surplus food logging with dynamic temperature-based shelf-life checks,
              automatic safe consumption countdowns, and async BullMQ NGO matching within 15 km.
            </p>
          </div>
          <Link
            href="/dashboard/surplus"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>Open Donor Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Module 2: NGO Receiver */}
        <div className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">NGO & Logistics Portal</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Real-time urgent dispatch feed and interactive Leaflet map colored by urgency (Red &lt;2h,
              Amber 2-5h). One-click reservation with OTP and cryptographic QR custody transfer tokens.
            </p>
          </div>
          <Link
            href="/dashboard/dispatch"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300"
          >
            <span>Open Receiver Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Module 3: AI Forecaster */}
        <div className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Production Advisor</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Predictive kitchen demand forecasting powered by trained Scikit-learn / XGBoost
              pipelines. Prevents plate waste before food is cooked using attendance headcounts and
              calendar variables.
            </p>
          </div>
          <Link
            href="/dashboard/advisor"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <span>Run AI Predictions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
