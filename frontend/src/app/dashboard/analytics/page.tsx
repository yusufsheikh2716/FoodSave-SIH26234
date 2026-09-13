'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, ESGSummaryResponse } from '@/lib/api';
import { ESGCards } from '@/components/esg-cards';
import {
  Leaf,
  Award,
  BookOpen,
  PieChart as PieChartIcon,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<ESGSummaryResponse>({
    queryKey: ['esg-summary'],
    queryFn: () => analyticsApi.getESGSummary(),
  });

  const categoryBreakdown = data?.categoryBreakdown || {};
  const categoryData = Object.entries(categoryBreakdown).map(([cat, kg]) => ({
    category: cat,
    quantityKg: kg,
  }));

  const constants = data?.constants || {
    co2FactorKgPerKg: 2.5,
    kgPerMeal: 0.4,
    citation: 'IPCC Climate Change & Land Special Report & FAO Food Wastage Footprint',
  };

  const COLORS = ['#10B981', '#2DD4BF', '#38BDF8', '#F59E0B', '#A78BFA'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Leaf className="w-4 h-4" />
          <span>Auditor & Environmental Intelligence</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          ESG Sustainability & Avoided Emission Metrics
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Verified metrics aggregated directly from completed food custody handovers.
          All conversion coefficients are synchronized with international climate guidelines.
        </p>
      </div>

      {/* Main Metric Cards */}
      <ESGCards />

      {/* Category Breakdown & Climate Citation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Chart */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <PieChartIcon className="w-4 h-4 text-emerald-400" />
            <span>Rescued Food Distribution by Category (kg)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Composition of perishable inventory successfully transferred to recipient beneficiaries
          </p>

          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit="kg" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="quantityKg" radius={[6, 6, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Log and deliver initial batches to populate live category distributions.
              </div>
            )}
          </div>
        </div>

        {/* Environmental Methodology Card */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <BookOpen className="w-4 h-4 text-teal-400" />
              <span>Standardized Accounting Methodology</span>
            </h3>

            <div className="mt-4 space-y-3.5 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-mono text-emerald-400 uppercase font-semibold">
                  Avoided Carbon Equivalent Factor
                </span>
                <p className="text-xl font-bold font-mono text-white mt-0.5">
                  {constants.co2FactorKgPerKg} kg CO₂e / kg rescued
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Accounts for embedded upstream agricultural emissions, cold-chain transport, and
                  prevented anaerobic methane generation in municipal landfills.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-mono text-amber-400 uppercase font-semibold">
                  Emergency Nutrition Benchmark
                </span>
                <p className="text-xl font-bold font-mono text-white mt-0.5">
                  {constants.kgPerMeal} kg / meal portion
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Standard institutional nutrition portion for hot cooked meals distributed to
                  vulnerable recipients through partner shelter networks.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 italic">
            Citation Source: {constants.citation}
          </div>
        </div>
      </div>
    </div>
  );
}
