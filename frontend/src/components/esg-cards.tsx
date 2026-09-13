'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, ESGSummaryResponse } from '@/lib/api';
import { Leaf, Utensils, IndianRupee, ShieldCheck, Activity, Award } from 'lucide-react';

export function ESGCards() {
  const { data, isLoading, isError } = useQuery<ESGSummaryResponse>({
    queryKey: ['esg-summary'],
    queryFn: () => analyticsApi.getESGSummary(),
    refetchInterval: 15000, // Refresh every 15s to capture live rescues
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800/60" />
        ))}
      </div>
    );
  }

  const summary = data?.summary || {
    totalKgRescued: 0,
    co2AvoidedKg: 0,
    mealsProvided: 0,
    estimatedValueSaved: 0,
    activeListingsCount: 0,
    totalDonorsCount: 0,
    totalNgosCount: 0,
  };

  const constants = data?.constants || {
    co2FactorKgPerKg: 2.5,
    kgPerMeal: 0.4,
    citation: 'IPCC Climate Change & Land Special Report & FAO Food Wastage Footprint',
  };

  const cards = [
    {
      title: 'Total Food Rescued',
      value: `${summary.totalKgRescued.toLocaleString()} kg`,
      subtitle: 'Diverted from landfill decomposition',
      icon: Leaf,
      gradient: 'from-emerald-500/20 to-teal-500/5',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'CO₂e Emissions Avoided',
      value: `${summary.co2AvoidedKg.toLocaleString()} kg`,
      // Displays the backend's exact conversion factor! Never hardcodes frontend calculation.
      subtitle: `Factor: ${constants.co2FactorKgPerKg} kg CO₂e/kg (IPCC standard)`,
      icon: Award,
      gradient: 'from-teal-500/20 to-cyan-500/5',
      iconColor: 'text-teal-400',
      borderColor: 'border-teal-500/20',
    },
    {
      title: 'Meals Provided',
      value: summary.mealsProvided.toLocaleString(),
      subtitle: `Calculated at ${constants.kgPerMeal} kg standard portion`,
      icon: Utensils,
      gradient: 'from-amber-500/20 to-orange-500/5',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Economic Value Recovered',
      value: `₹${summary.estimatedValueSaved.toLocaleString()}`,
      subtitle: 'Nutritional resource value saved',
      icon: IndianRupee,
      gradient: 'from-blue-500/20 to-indigo-500/5',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-b ${card.gradient} border ${card.borderColor} backdrop-blur-xl shadow-lg transition-transform hover:-translate-y-1`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">{card.title}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-white">{card.value}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400/90 leading-tight">{card.subtitle}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 ${card.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Network Activity Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300 font-medium">Live Redistribution Network Status:</span>
        </div>
        <div className="flex items-center gap-6 text-slate-400">
          <div>
            Active Surplus Batches:{' '}
            <span className="font-semibold text-emerald-400">{summary.activeListingsCount}</span>
          </div>
          <div>
            Donor Kitchens:{' '}
            <span className="font-semibold text-white">{summary.totalDonorsCount}</span>
          </div>
          <div>
            Registered NGOs & Logistics:{' '}
            <span className="font-semibold text-white">{summary.totalNgosCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
