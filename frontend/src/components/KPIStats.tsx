'use client';
import React from 'react';
import { useStore } from '@/store/useStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Activity,
  Shield,
  Box,
  Users,
  Zap
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('work')) return Activity;
  if (n.includes('manpower')) return Users;
  if (n.includes('purchase')) return Box;
  if (n.includes('pm')) return CheckCircle2;
  if (n.includes('spend')) return TrendingUp;
  if (n.includes('overtime')) return Clock;
  if (n.includes('downtime')) return AlertCircle;
  if (n.includes('safety')) return Shield;
  return Zap;
};

interface KPIStatsProps {
  onKpiClick?: (name: string) => void;
  activeKpi?: string | null;
}

const KPIStats: React.FC<KPIStatsProps> = ({ onKpiClick, activeKpi }) => {
  const { kpis } = useStore();

  const handleCardClick = (name: string) => {
    console.log(`[Stage 6] KPI Card Interaction: ${name}`);
    if (onKpiClick) onKpiClick(name);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-2">
      {kpis.map((kpi, index) => {
        const Icon = getIcon(kpi.name);
        const slug = kpi.name.toLowerCase().replace(/ /g, '-').replace(/%/g, '');
        const isActive = activeKpi === slug;

        return (
          <div 
            key={index} 
            className={cn(
              "modular-container group cursor-pointer active:scale-95 transition-all duration-300",
              isActive ? "border-indigo-500 ring-2 ring-indigo-500/10 scale-105 shadow-lg shadow-indigo-500/10" : "hover:border-slate-200"
            )}
            onClick={() => handleCardClick(kpi.name)}
          >
            <div className="flex items-start justify-between">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300",
                kpi.status === 'good' ? "bg-emerald-50 text-emerald-600" : 
                kpi.status === 'warning' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
              )}>
                <Icon size={20} />
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                kpi.status === 'good' ? "bg-emerald-100 text-emerald-700" : 
                kpi.status === 'warning' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
              )}>
                {kpi.status}
              </div>
            </div>
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{kpi.name}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{kpi.value}</h3>
            
            <div className="mt-4 flex items-center gap-1.5">
              <div className={cn(
                "w-1 h-1 rounded-full",
                kpi.status === 'good' ? "bg-emerald-500" : 
                kpi.status === 'warning' ? "bg-amber-500" : "bg-rose-500"
              )} />
              <span className="text-[10px] font-bold text-slate-500">{kpi.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KPIStats;
