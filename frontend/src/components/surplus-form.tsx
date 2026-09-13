'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsApi, wasteApi } from '@/lib/api';
import { Clock, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface SurplusFormProps {
  onSuccess?: () => void;
}

export function SurplusForm({ onSuccess }: SurplusFormProps) {
  const queryClient = useQueryClient();

  // Form states
  const [title, setTitle] = useState('');
  const [foodCategory, setFoodCategory] = useState('cooked grains');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [storageCondition, setStorageCondition] = useState<'ROOM_TEMP' | 'CHILLED' | 'HOT'>('ROOM_TEMP');
  const [ambientTempC, setAmbientTempC] = useState<number>(24);
  const [safeUntilHours, setSafeUntilHours] = useState<number>(3.5);
  const [notes, setNotes] = useState('');

  // AI dynamic shelf-life feedback state
  const [shelfLifeFeedback, setShelfLifeFeedback] = useState<{
    estimatedHours: number;
    urgency: 'CRITICAL' | 'MODERATE' | 'STABLE';
    advice: string;
  } | null>(null);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debounced live AI shelf-life evaluation whenever category, storage, or temp changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsEvaluating(true);
      try {
        // Adjust effective temperature based on storage condition
        const effectiveTemp =
          storageCondition === 'CHILLED' ? 4.0 : storageCondition === 'HOT' ? 62.0 : ambientTempC;

        const res = await wasteApi.predictShelfLife({
          foodCategory,
          ambientTempC: effectiveTemp,
        });

        setShelfLifeFeedback({
          estimatedHours: res.estimatedSafeHours,
          urgency: res.urgencyCategory,
          advice: res.storageAdvice,
        });

        setSafeUntilHours(res.estimatedSafeHours);
      } catch (e) {
        // Fallback default
        const defaultH = foodCategory.includes('meat') || foodCategory.includes('dairy') ? 2.5 : 4.0;
        setShelfLifeFeedback({
          estimatedHours: defaultH,
          urgency: defaultH <= 2 ? 'CRITICAL' : 'MODERATE',
          advice: 'Standard baseline estimate active.',
        });
        setSafeUntilHours(defaultH);
      } finally {
        setIsEvaluating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [foodCategory, storageCondition, ambientTempC]);

  const createListingMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const safeDate = new Date(now.getTime() + safeUntilHours * 60 * 60 * 1000);

      return listingsApi.create({
        title,
        foodCategory,
        quantityKg: Number(quantityKg),
        preparedAt: now.toISOString(),
        safeUntil: safeDate.toISOString(),
        storageCondition,
        notes: notes || undefined,
      });
    },
    onSuccess: (data) => {
      setStatusMessage({
        type: 'success',
        text: `Surplus batch "${title}" logged! Real-time dispatch triggered to nearby NGOs.`,
      });
      queryClient.invalidateQueries({ queryKey: ['active-listings'] });
      queryClient.invalidateQueries({ queryKey: ['esg-summary'] });
      setTitle('');
      setQuantityKg('');
      setNotes('');
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to log surplus batch.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!title || !quantityKg || Number(quantityKg) <= 0) {
      setStatusMessage({ type: 'error', text: 'Please fill in a valid title and quantity.' });
      return;
    }

    createListingMutation.mutate();
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'border-red-500/40 bg-red-500/10 text-red-400';
      case 'MODERATE':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
      default:
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Log Surplus Food Batch</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
              Instant Dispatch
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic shelf-life evaluation & proximity routing to verified NGOs within 15 km
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mt-4 p-4 rounded-xl text-xs flex items-center gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Meal / Food Batch Description *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cooked Basmati Rice & Mixed Vegetable Curry"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Category & Quantity Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Food Category *
            </label>
            <select
              value={foodCategory}
              onChange={(e) => setFoodCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="cooked grains">Cooked Grains / Rice / Pulses</option>
              <option value="dairy">Dairy & Paneer Gravies</option>
              <option value="meat/gravy">Poultry / Meat / Egg Dishes</option>
              <option value="raw produce">Raw Produce / Fresh Vegetables</option>
              <option value="baked">Baked Goods / Bread / Buns</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Surplus Quantity (kg) *
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.5"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="e.g. 35.0"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Storage Condition & Temperature */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Current Storage State *
            </label>
            <select
              value={storageCondition}
              onChange={(e) => setStorageCondition(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ROOM_TEMP">Ambient Room Temp (Covered)</option>
              <option value="CHILLED">Refrigerated / Chilled (&lt; 4°C)</option>
              <option value="HOT">Thermal Insulated Hot Hold (&gt; 60°C)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ambient Temperature (°C)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="42"
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(parseInt(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-sm font-mono text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {ambientTempC}°C
              </span>
            </div>
          </div>
        </div>

        {/* Immediate AI Shelf-Life Assessment Card */}
        {shelfLifeFeedback && (
          <div
            className={`p-4 rounded-xl border text-xs transition-all ${getUrgencyColor(
              shelfLifeFeedback.urgency
            )}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>AI Microbiological Shelf-Life Assessment</span>
                {isEvaluating && <span className="text-[10px] text-slate-400">(computing...)</span>}
              </div>
              <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-slate-950/60 border border-current">
                {shelfLifeFeedback.urgency} RISK
              </span>
            </div>
            <p className="mt-1 text-slate-200">
              Estimated Safe Consumption Window:{' '}
              <strong className="text-white font-mono text-sm">
                {shelfLifeFeedback.estimatedHours} hours
              </strong>
            </p>
            <p className="mt-1 text-slate-300/80 leading-relaxed text-[11px]">
              {shelfLifeFeedback.advice}
            </p>
          </div>
        )}

        {/* Additional Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Logistics & Packaging Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Stainless steel sealed containers, loading dock B access via gate 2."
            className="w-full px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={createListingMutation.isPending}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {createListingMutation.isPending ? (
            <span>Broadcasting to NGOs...</span>
          ) : (
            <>
              <span>Broadcast Surplus to Nearby NGOs</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
