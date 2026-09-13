'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listingsApi } from '@/lib/api';
import { SurplusForm } from '@/components/surplus-form';
import { UtensilsCrossed, Clock, CheckCircle2, History, AlertCircle } from 'lucide-react';

export default function SurplusPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingsApi.getMyListings(),
  });

  const myListings = data?.listings || [];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <UtensilsCrossed className="w-4 h-4" />
          <span>Donor Kitchen Management Portal</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Log Surplus Food & Monitor Custody Handover
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Surplus entries are evaluated in real-time by AI shelf-life models and automatically
          dispatched to high-capacity NGOs within 15 km.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-6">
          <SurplusForm onSuccess={() => refetch()} />
        </div>

        {/* Active & Historical Listings for this Donor */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Your Posted Food Batches ({myListings.length})</span>
            </h3>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                Loading kitchen batches...
              </div>
            ) : myListings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <UtensilsCrossed className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No batches logged yet today.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Use the form to log your first prepared surplus batch.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 mt-2 max-h-[480px] overflow-y-auto pr-1">
                {myListings.map((item: any) => {
                  const isClaimed = item.status === 'CLAIMED' || item.status === 'RESERVED';
                  return (
                    <div key={item.id} className="py-3.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              item.status === 'AVAILABLE'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'RESERVED'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-xs font-bold text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {item.quantityKg} kg &bull; Category: {item.foodCategory}
                        </p>

                        {/* Claim status info */}
                        {item.claims && item.claims.length > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                            <span className="text-slate-400">Claimed by: </span>
                            <strong className="text-emerald-400">{item.claims[0].recipient?.name}</strong>
                            <div className="mt-0.5 text-slate-400 font-mono">
                              Pickup OTP:{' '}
                              <strong className="text-white">{item.claims[0].pickupOtp}</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-[11px] text-slate-500 shrink-0">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
