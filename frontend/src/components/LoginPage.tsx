'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const { setAuthenticated } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate a brief network delay for premium feel
    setTimeout(() => {
      if (username === '123' && password === '123') {
        setAuthenticated(true);
      } else {
        setError('Invalid credentials. Please use 123 / 123.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-900 font-sans">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity"
        style={{
          backgroundImage: 'url(/bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Aesthetic Overlay Gradients */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-indigo-950/50 to-transparent mix-blend-overlay" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.3)] mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight text-center">
            Plant AI Guardian
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300/80">
            Secure Access Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Operator ID
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-black/40 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter 123"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Security Key
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-black/40 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter 123"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-center animate-in shake">
              <p className="text-xs font-bold text-rose-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="group relative mt-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:hover:shadow-none"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                Initialize System
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
            Powered by Advanced AI Intelligence
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
