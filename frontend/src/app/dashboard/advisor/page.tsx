'use client';

import React from 'react';
import { ForecastChart } from '@/components/forecast-chart';
import { Sparkles, BrainCircuit, ShieldAlert, Cpu } from 'lucide-react';

export default function AdvisorPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <BrainCircuit className="w-4 h-4" />
          <span>Predictive AI Production Intelligence</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          AI Meal Preparation Demand Forecaster
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Trained machine learning models analyze institutional headcount trends, day-of-week demand,
          and special events to recommend precise batch quantities and minimize kitchen plate waste.
        </p>
      </div>

      {/* Model Specs Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-slate-900 to-slate-900 border border-cyan-500/20 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Active Inference Engine:</span>
            <p className="text-slate-400 text-[11px]">
              Scikit-learn HistGradientBoosting Regressor + 90% Empirical Confidence Intervals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-400">
            MAE: ~17.2 kg
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400">
            R² Score: 0.871
          </span>
        </div>
      </div>

      {/* Embedded Forecasting & Historical Charts */}
      <ForecastChart />
    </div>
  );
}
