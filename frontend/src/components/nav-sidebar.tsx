'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  UtensilsCrossed,
  Truck,
  Leaf,
  BarChart3,
  Clock,
  LogOut,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export function NavSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isDonor = user?.type === 'KITCHEN' || user?.type === 'FOOD_PROCESSOR';
  const isRecipient = user?.type === 'NGO' || user?.type === 'LOGISTICS';

  const navItems = [
    {
      label: 'Live Dispatch Feed',
      href: '/dashboard/dispatch',
      icon: Clock,
      visible: true,
      badge: 'Live',
    },
    {
      label: 'Log Surplus Batch',
      href: '/dashboard/surplus',
      icon: UtensilsCrossed,
      visible: isDonor || !user, // accessible for donor or demo preview
    },
    {
      label: 'ESG Impact Dashboard',
      href: '/dashboard/analytics',
      icon: Leaf,
      visible: true,
    },
    {
      label: 'AI Production Advisor',
      href: '/dashboard/advisor',
      icon: Sparkles,
      visible: isDonor || !user,
      badge: 'AI',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Logo & Brand Header */}
        <div className="p-6 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                FoodSave
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SIH26234
                </span>
              </span>
              <p className="text-xs text-slate-400">Zero Waste Ecosystem</p>
            </div>
          </Link>
        </div>

        {/* Current User Status Banner */}
        {user ? (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              {isDonor ? <Building2 className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {user.type}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Demo Guest</span>
            <Link href="/login" className="text-emerald-400 hover:underline text-xs font-medium">
              Sign In
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <p className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </p>
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.badge === 'Live'
                          ? 'bg-red-500/20 text-red-400 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Footer / Account Actions */}
      <div className="p-4 border-t border-slate-800/60 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800/40 text-[11px] text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Verified Smart Custody Transfer</span>
        </div>

        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 text-center py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
