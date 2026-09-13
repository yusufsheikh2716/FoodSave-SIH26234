'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { claimsApi, SurplusItem } from '@/lib/api';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  QrCode,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

interface ClaimModalProps {
  listing: SurplusItem | null;
  onClose: () => void;
}

export function ClaimModal({ listing, onClose }: ClaimModalProps) {
  const queryClient = useQueryClient();
  const [claimResult, setClaimResult] = useState<any | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!listing) return;
      return claimsApi.claimListing(listing.id);
    },
    onSuccess: (data) => {
      setClaimResult(data.claim);
      queryClient.invalidateQueries({ queryKey: ['active-listings'] });
      queryClient.invalidateQueries({ queryKey: ['esg-summary'] });
    },
    onError: (err: any) => {
      setErrorText(err.message || 'Failed to claim listing.');
    },
  });

  if (!listing) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!claimResult ? (
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Instant NGO Claim & Reservation</span>
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">{listing.title}</h3>

            <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Donor Facility:</span>
                <span className="font-semibold text-white">{listing.donor.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Available Quantity:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {listing.quantityKg} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Remaining Safe Window:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {listing.remainingShelfLifeHours} hours left
                </span>
              </div>
              {listing.distanceKm !== undefined && listing.distanceKm !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Proximity Distance:</span>
                  <span className="font-semibold text-white">{listing.distanceKm} km away</span>
                </div>
              )}
              <div className="flex items-start gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{listing.donor.address}</span>
              </div>
            </div>

            {errorText && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={claimMutation.isPending}
                onClick={() => claimMutation.mutate()}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {claimMutation.isPending ? 'Confirming Reservation...' : 'Confirm & Claim Batch'}
              </button>
            </div>
          </div>
        ) : (
          /* Handover Token Display */
          <div className="text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white">Batch Reserved Successfully!</h3>
            <p className="mt-1 text-xs text-slate-400">
              Present this Pickup OTP or QR Code to the donor upon custody transfer.
            </p>

            {/* Verification OTP Box */}
            <div className="my-6 p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-inner">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Pickup Verification OTP
              </p>
              <div className="mt-2 text-4xl font-mono font-extrabold tracking-widest text-emerald-400">
                {claimResult.pickupOtp}
              </div>
              <p className="mt-3 text-[11px] font-mono text-slate-400">
                QR Token: <span className="text-white">{claimResult.qrCodeToken}</span>
              </p>
            </div>

            <div className="text-left p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Donor Contact: {claimResult.donorPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Pickup Address: {claimResult.donorAddress}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 rounded-xl font-semibold text-xs text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors"
            >
              Done & Return to Dispatch Feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
