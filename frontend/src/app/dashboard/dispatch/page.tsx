'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listingsApi, SurplusItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { DispatchFeed } from '@/components/dispatch-feed';
import { SurplusMap } from '@/components/surplus-map';
import { ClaimModal } from '@/components/claim-modal';
import { Truck, Map, Radio, ShieldCheck, MapPin } from 'lucide-react';

export default function DispatchPage() {
  const { user } = useAuth();
  const [selectedMapItem, setSelectedMapItem] = useState<SurplusItem | null>(null);

  // Fetch active listings for the geographic map view
  const { data } = useQuery({
    queryKey: ['active-listings-map'],
    queryFn: () =>
      listingsApi.getActive({
        latitude: user?.latitude || 12.9716,
        longitude: user?.longitude || 77.5946,
        maxDistanceKm: 30,
      }),
    refetchInterval: 12000,
  });

  const listings = data?.listings || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Truck className="w-4 h-4" />
          <span>NGO & Logistics Receiver Operations</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Urgent Food Redistribution Feed & Map
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Real-time WebSocket alerts triggered automatically when donor kitchens post perishable batches.
          Markers and listings are color-coded by remaining safe shelf-life.
        </p>
      </div>

      {/* Interactive Map View */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Map className="w-4 h-4 text-emerald-400" />
            <span>Interactive Proximity Dispatch Map ({listings.length} active batches within 30 km)</span>
          </h3>
          <span className="text-[11px] text-slate-400">Click marker to inspect details & claim</span>
        </div>
        <SurplusMap
          listings={listings}
          onSelectListing={(item) => setSelectedMapItem(item)}
          center={[user?.latitude || 12.9716, user?.longitude || 77.5946]}
        />
      </section>

      {/* Live Stream Feed */}
      <section className="space-y-4">
        <DispatchFeed />
      </section>

      {/* Modal triggered from Leaflet Map click */}
      {selectedMapItem && (
        <ClaimModal
          listing={selectedMapItem}
          onClose={() => setSelectedMapItem(null)}
        />
      )}
    </div>
  );
}
