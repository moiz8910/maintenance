'use client';
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  User, 
  Wifi, 
  WifiOff, 
  ChevronDown, 
  Calendar, 
  Search, 
  Globe, 
  LogOut,
  Activity,
  Package,
  ClipboardList,
  Users,
  ShieldCheck,
  Boxes,
  BarChart3,
  Cpu,
  Layers,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { useStore } from '@/store/useStore';

const Header = () => {
  const [connected, setConnected] = useState(false);
  const { setAuthenticated, searchQuery, setSearchQuery, setActiveKpi, activeTab, setActiveTab } = useStore();
  
  const tabs = [
    { name: 'Performance Mgmt.', icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: 'Asset Info', icon: Cpu, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Inventory Status', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Work Mgmt.', icon: Layers, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Resource Mgmt.', icon: UserCheck, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { name: 'Safety', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setActiveKpi('search');
    } else {
      setActiveKpi(null);
    }
  };

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
    <header className="h-24 px-4 flex items-center justify-between shrink-0 bg-white/40 backdrop-blur-xl sticky top-0 z-40 border-b border-white/20 shadow-sm">
      <div className="flex-1 flex items-center justify-center min-w-0">
        {/* HD Navigation Tabs */}
        <nav className="flex items-center gap-1.5 p-1 rounded-[32px] bg-white/40 border border-white/60 shadow-xl backdrop-blur-md w-full max-w-7xl justify-between">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const tabColorClass = tab.color.replace('text-', '');
            const tabBgClass = tab.bg.replace('/10', '/15');
            
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center justify-center transition-all duration-500 relative group flex-auto min-w-0 border-2 ${
                  tab.name === 'Safety' ? 'gap-0 px-2' : 'gap-0.5 px-3'
                } py-2.5 rounded-[22px] ${
                  isActive 
                  ? `bg-white shadow-2xl shadow-${tabColorClass}/30 border-slate-400` 
                  : `${tabBgClass} border-slate-300 hover:bg-white/80 hover:border-slate-400`
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm shrink-0 ${
                  isActive 
                  ? `${tab.bg.replace('/10', '')} text-white ring-2 ring-white/50` 
                  : `bg-white/60 ${tab.color}`
                }`}>
                  <tab.icon size={20} strokeWidth={3} />
                </div>
                <div className="flex flex-col min-w-0 items-center">
                  <span className={`text-[10px] font-black uppercase tracking-tight leading-[1.1] text-center break-words line-clamp-2 ${
                    isActive ? 'text-slate-900' : 'text-slate-800'
                  }`}>
                    {tab.name}
                  </span>
                </div>
                
                {isActive && (
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 rounded-full ${tab.color.replace('text-', 'bg-')} shadow-[0_0_12px] ${tab.color.replace('text-', 'shadow-')}`} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 ml-4">
        <button 
          onClick={() => setAuthenticated(false)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.1em] hover:bg-rose-600 transition-all shadow-2xl shadow-slate-900/10 border border-slate-800 group"
        >
          <LogOut size={18} strokeWidth={3} />
          <span className="font-black">Log Off</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
