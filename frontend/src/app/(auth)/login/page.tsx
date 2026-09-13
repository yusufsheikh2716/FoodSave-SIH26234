'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';
import { Leaf, Lock, Mail, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setIsLoading(true);

    try {
      const res = await authApi.login({ email, password });
      login(res.token, res.user);
      if (res.user.type === 'KITCHEN' || res.user.type === 'FOOD_PROCESSOR') {
        router.push('/dashboard/surplus');
      } else {
        router.push('/dashboard/dispatch');
      }
    } catch (err: any) {
      setErrorText(err.message || 'Login failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill demo accounts for fast review/hackathon presentation
  const fillDemo = (role: 'kitchen' | 'ngo') => {
    if (role === 'kitchen') {
      setEmail('kitchen@foodsave.org');
      setPassword('password123');
    } else {
      setEmail('robinhood@foodsave.org');
      setPassword('password123');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 mb-3">
            <Leaf className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome to FoodSave</h2>
          <p className="text-xs text-slate-400 mt-1">
            Institutional Food Waste Mitigation & Dynamic Redistribution
          </p>
        </div>

        {/* Quick Demo Credentials Switcher */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>One-Click Hackathon Demo Fill:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemo('kitchen')}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-emerald-400 transition-colors"
            >
              Kitchen Donor
            </button>
            <button
              type="button"
              onClick={() => fillDemo('ngo')}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-teal-400 transition-colors"
            >
              NGO Receiver
            </button>
          </div>
        </div>

        {errorText && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kitchen@foodsave.org"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
          >
            {isLoading ? <span>Signing In...</span> : <span>Sign In to FoodSave</span>}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an organization registered?{' '}
          <Link href="/register" className="text-emerald-400 hover:underline font-semibold">
            Register your kitchen or NGO
          </Link>
        </p>
      </div>
    </div>
  );
}
