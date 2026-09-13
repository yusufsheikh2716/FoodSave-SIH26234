'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listingsApi, SurplusItem, claimsApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth-context';
import { ClaimModal } from './claim-modal';
import {
  Clock,
  MapPin,
  Flame,
  Radio,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';

export function DispatchFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedListing, setSelectedListing] = useState<SurplusItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(20);
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  // Verification dialog state for donor or NGO testing OTP handover
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyClaimId, setVerifyClaimId] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch active listings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['active-listings', filterCategory, maxDistanceKm],
    queryFn: () =>
      listingsApi.getActive({
        latitude: user?.latitude,
        longitude: user?.longitude,
        maxDistanceKm,
        category: filterCategory || undefined,
      }),
    refetchInterval: 12000,
  });

  // Socket.io real-time listener for urgent dispatch alerts
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_dispatch_feed');

    const handleNewSurplus = (payload: any) => {
      setLiveNotification(`⚡ NEW SURPLUS: ${payload.listing.quantityKg}kg ${payload.listing.title} from ${payload.listing.donorName}`);
      queryClient.invalidateQueries({ queryKey: ['active-listings'] });
      setTimeout(() => setLiveNotification(null), 8000);
    };

    const handleTargetedMatch = (payload: any) => {
      setLiveNotification(`🎯 PRIORITY MATCH (${payload.distanceKm}km away): ${payload.listingTitle}`);
      queryClient.invalidateQueries({ queryKey: ['active-listings'] });
      setTimeout(() => setLiveNotification(null), 10000);
    };

    const handleListingClaimed = () => {
      queryClient.invalidateQueries({ queryKey: ['active-listings'] });
    };

    socket.on('new_surplus_alert', handleNewSurplus);
    socket.on('targeted_surplus_match', handleTargetedMatch);
    socket.on('listing_claimed', handleListingClaimed);

    return () => {
      socket.off('new_surplus_alert', handleNewSurplus);
      socket.off('targeted_surplus_match', handleTargetedMatch);
      socket.off('listing_claimed', handleListingClaimed);
    };
  }, [queryClient]);

  const handleVerifyHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyMessage(null);
    try {
      await claimsApi.verifyHandover(verifyClaimId.trim(), { pickupOtp: verifyOtp.trim() });
      setVerifyMessage({
        type: 'success',
        text: 'Food handover verified successfully! Safe custody transferred.',
      });
      queryClient.invalidateQueries({ queryKey: ['active-listings'] });
      queryClient.invalidateQueries({ queryKey: ['esg-summary'] });
    } catch (err: any) {
      setVerifyMessage({ type: 'error', text: err.message || 'Handover verification failed' });
    }
  };

  const listings = data?.listings || [];

  return (
    <div className="space-y-5">
      {/* Live Broadcast Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="w-5 h-5 text-red-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Live Perishable Food Dispatch Feed</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Auto-Ranked
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Sorted by urgency risk: <span className="text-red-400 font-semibold">Red (&lt;2h)</span>,{' '}
              <span className="text-amber-400 font-semibold">Amber (2-5h)</span>,{' '}
              <span className="text-emerald-400 font-semibold">Green (&gt;5h)</span>
            </p>
          </div>
        </div>

        {/* Quick Actions: Verify Handover modal trigger */}
        <button
          onClick={() => setVerifyModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <span>Verify Handover (OTP/QR)</span>
        </button>
      </div>

      {/* Real-time Push Notification Alert */}
      {liveNotification && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/20 via-orange-500/10 to-transparent border border-red-500/30 text-xs text-white font-medium flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-red-400" />
            <span>{liveNotification}</span>
          </div>
          <button
            onClick={() => setLiveNotification(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 font-medium">Filter Category:</span>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Categories</option>
          <option value="grains">Cooked Grains / Rice</option>
          <option value="dairy">Dairy / Paneer</option>
          <option value="meat">Meat / Poultry</option>
          <option value="produce">Raw Produce</option>
          <option value="baked">Baked Goods</option>
        </select>

        <span className="text-slate-400 font-medium ml-2">Max Distance:</span>
        <select
          value={maxDistanceKm}
          onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value={10}>10 km</option>
          <option value={15}>15 km (SIH Default)</option>
          <option value={25}>25 km</option>
          <option value={50}>50 km</option>
        </select>
      </div>

      {/* Listings Stream */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800/60" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
          <h4 className="text-sm font-semibold text-white">No active surplus batches pending in your area</h4>
          <p className="text-xs text-slate-400 mt-1">
            New kitchen postings appear here in real-time via WebSocket broadcast.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((item) => {
            const isCritical = item.urgency === 'CRITICAL';
            const isModerate = item.urgency === 'MODERATE';

            return (
              <div
                key={item.id}
                className={`relative rounded-2xl p-5 bg-slate-900/80 border transition-all duration-200 hover:border-slate-700 shadow-lg ${
                  isCritical
                    ? 'border-red-500/40 bg-gradient-to-b from-red-500/10 to-slate-900/90'
                    : isModerate
                    ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-slate-900/90'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                            : isModerate
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {item.urgency} ({item.remainingShelfLifeHours}h left)
                      </span>
                      <span className="text-[11px] text-slate-400 capitalize font-medium">
                        {item.foodCategory}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white tracking-tight">{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{item.donor.name}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-mono font-extrabold text-white">
                      {item.quantityKg}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 ml-1">kg</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {item.storageCondition}
                    </span>
                    {item.distanceKm !== undefined && item.distanceKm !== null && (
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {item.distanceKm} km
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedListing(item)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <span>Claim Batch</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim Dialog */}
      {selectedListing && (
        <ClaimModal listing={selectedListing} onClose={() => setSelectedListing(null)} />
      )}

      {/* Verify Handover Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Verify Handover Custody Transfer</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter the recipient's Claim ID and 6-digit OTP code to complete food transfer.
            </p>

            {verifyMessage && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs ${
                  verifyMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
              >
                {verifyMessage.text}
              </div>
            )}

            <form onSubmit={handleVerifyHandover} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Claim ID *</label>
                <input
                  type="text"
                  required
                  value={verifyClaimId}
                  onChange={(e) => setVerifyClaimId(e.target.value)}
                  placeholder="Paste Claim UUID"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">6-Digit Pickup OTP *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value)}
                  placeholder="e.g. 582914"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-lg font-mono text-center tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setVerifyModalOpen(false);
                    setVerifyMessage(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
