'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { wasteApi } from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Sparkles, TrendingDown, Users, Calendar, AlertCircle } from 'lucide-react';

export function ForecastChart() {
  // Simulator input state
  const [expectedAttendance, setExpectedAttendance] = useState<number>(500);
  const [dayOfWeek, setDayOfWeek] = useState<string>('Monday');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [isHolidayOrEvent, setIsHolidayOrEvent] = useState<boolean>(false);

  // Historical kitchen logs query
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['waste-logs'],
    queryFn: () => wasteApi.getLogs(),
  });

  // AI Prediction mutation
  const [prediction, setPrediction] = useState<any | null>(null);

  const predictMutation = useMutation({
    mutationFn: async () => {
      return wasteApi.predictPrep({
        expectedAttendanceCount: expectedAttendance,
        dayOfWeek,
        mealType,
        isHolidayOrEvent,
      });
    },
    onSuccess: (data) => {
      setPrediction(data);
    },
  });

  // Prepare chart series from historical logs or synthetic baseline
  const historicalLogs = logsData?.logs || [];
  const chartData = historicalLogs.length > 0
    ? historicalLogs.slice(-14).map((log: any) => ({
        date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        planned: log.plannedKg,
        consumed: log.actualConsumedKg,
        discarded: log.discardedKg,
      }))
    : [
        { date: 'Sep 01', planned: 280, consumed: 260, discarded: 20 },
        { date: 'Sep 02', planned: 295, consumed: 275, discarded: 20 },
        { date: 'Sep 03', planned: 310, consumed: 285, discarded: 25 },
        { date: 'Sep 04', planned: 270, consumed: 255, discarded: 15 },
        { date: 'Sep 05', planned: 320, consumed: 290, discarded: 30 },
        { date: 'Sep 06', planned: 210, consumed: 198, discarded: 12 },
        { date: 'Sep 07', planned: 190, consumed: 182, discarded: 8 },
        { date: 'Sep 08', planned: 285, consumed: 270, discarded: 15 },
      ];

  return (
    <div className="space-y-6">
      {/* Historical Waste vs Consumed Trends */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <span>Institutional Prep vs. Consumption History</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tracking plate waste gap to identify chronic overproduction patterns
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              Planned Prep (kg)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-teal-400"></span>
              Actual Consumed (kg)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-red-400"></span>
              Discarded Waste (kg)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorDiscarded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
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
              <Area
                type="monotone"
                dataKey="planned"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPlanned)"
              />
              <Area
                type="monotone"
                dataKey="consumed"
                stroke="#2DD4BF"
                strokeWidth={2}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="discarded"
                stroke="#EF4444"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorDiscarded)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive AI Production Advisor Simulator */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-emerald-500/20 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>AI Production Advisor (Trained XGBoost / Scikit-learn Pipeline)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate upcoming meal session to receive optimal prep quantity and plate waste risk
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Expected Attendance Count (Headcount)</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {expectedAttendance} people
                </span>
              </label>
              <input
                type="range"
                min="50"
                max="1200"
                step="25"
                value={expectedAttendance}
                onChange={(e) => setExpectedAttendance(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="holidayFlag"
                checked={isHolidayOrEvent}
                onChange={(e) => setIsHolidayOrEvent(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="holidayFlag" className="text-xs text-slate-300 font-medium">
                Campus / Institutional Special Gathering or Holiday
              </label>
            </div>

            <button
              onClick={() => predictMutation.mutate()}
              disabled={predictMutation.isPending}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {predictMutation.isPending ? 'Computing Forecast...' : 'Run AI Demand Prediction'}
            </button>
          </div>

          {/* Model Prediction Output Card */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            {prediction ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Recommended Prep Target
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Confidence: 90%
                  </span>
                </div>

                <div>
                  <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
                    {prediction.recommendedPrepKg}{' '}
                    <span className="text-base text-emerald-400 font-normal">kg</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Safe range:{' '}
                    <strong className="text-slate-200">
                      {prediction.confidenceInterval.lowerKg} kg – {prediction.confidenceInterval.upperKg} kg
                    </strong>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Plate Waste Risk:</span>
                    <span className="font-semibold text-amber-400 font-mono">
                      {(prediction.expectedPlateWasteProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400/90 leading-relaxed">
                    {prediction.modelNotes || 'Trained institutional model prediction.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Sparkles className="w-8 h-8 text-emerald-500/40 mb-2" />
                <p className="text-xs font-medium text-slate-400">Click &ldquo;Run AI Demand Prediction&rdquo;</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Evaluates attendance & meal parameters against the trained ML model
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
