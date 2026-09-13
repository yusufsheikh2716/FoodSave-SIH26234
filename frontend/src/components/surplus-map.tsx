'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SurplusItem } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

interface SurplusMapProps {
  listings: SurplusItem[];
  onSelectListing?: (item: SurplusItem) => void;
  center?: [number, number];
}

// Dynamically import Leaflet components to avoid SSR window errors
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export function SurplusMap({
  listings,
  onSelectListing,
  center = [12.9716, 77.5946], // Default center (Bengaluru)
}: SurplusMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-80 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-xs text-slate-500 animate-pulse">
        Initializing Geographic Surplus Dispatch Map...
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Legend Overlay */}
      <div className="absolute top-3 right-3 z-20 px-3 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 space-y-1 shadow-lg pointer-events-none">
        <p className="font-semibold text-white text-[10px] uppercase tracking-wider mb-1">
          Urgency Map Legend
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span>Critical (&lt; 2h left)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Moderate (2-5h left)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Stable (&gt; 5h left)</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {listings.map((item) => {
          const lat = item.donor.latitude || center[0];
          const lon = item.donor.longitude || center[1];
          const isCritical = item.urgency === 'CRITICAL';
          const isModerate = item.urgency === 'MODERATE';

          const markerColor = isCritical ? '#EF4444' : isModerate ? '#F59E0B' : '#10B981';

          return (
            <CircleMarker
              key={item.id}
              center={[lat, lon]}
              radius={isCritical ? 14 : 10}
              pathOptions={{
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.8,
                weight: isCritical ? 3 : 2,
              }}
            >
              <Popup>
                <div className="p-1 text-slate-100">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400'
                        : isModerate
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {item.urgency} ({item.remainingShelfLifeHours}h safe)
                  </span>
                  <h4 className="font-bold text-sm text-white mt-1">{item.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    <strong>{item.quantityKg} kg</strong> &bull; {item.donor.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{item.donor.address}</p>

                  {onSelectListing && (
                    <button
                      onClick={() => onSelectListing(item)}
                      className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
                    >
                      Claim from Map
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
