'use client';
import React, { useState, useEffect } from 'react';
import { Bell, User, Wifi, WifiOff, ChevronDown, Calendar, Search, Globe } from 'lucide-react';

const Header = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const checkConn = () => {
      fetch('/api/kpis')
        .then(() => setConnected(true))
        .catch(() => setConnected(false));
    };
    checkConn();
    const interval = setInterval(checkConn, 10000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  return (
    <header className="h-20 px-8 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
      <div className="flex items-center gap-8 flex-1">
        <div className="relative w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search assets, work orders, or manuals..."
            className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-6 text-slate-400">
          <div className="flex items-center gap-2">
            <Globe size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Main Plant</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{today}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
          connected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {connected ? 'System Live' : 'System Offline'}
        </div>

        <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white" />
        </button>

        <div className="h-8 w-px bg-slate-100 mx-2" />

        <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-slate-50 transition-all group">
          <div className="text-right">
            <p className="text-xs font-black text-slate-900 leading-none">M. Manager</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Jharsuguda Plant</p>
          </div>
          <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
            AD
          </div>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
        </button>
      </div>
    </header>
  );
};

export default Header;
