'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import KPIStats from '@/components/KPIStats';

import ChatPanel from '@/components/ChatPanel';
import Header from '@/components/Header';
import DrilldownView from '@/components/DrilldownView';
import LoginPage from '@/components/LoginPage';
import MaintenanceSchedule from '@/components/MaintenanceSchedule';
import AssetView from '@/components/AssetView';
import SearchView from '@/components/SearchView';
import AIInsightsCard from '@/components/AIInsightsCard';
import { useStore } from '@/store/useStore';
import { BellRing, ArrowRight, List, Calendar as CalendarIcon } from 'lucide-react';

export default function Home() {
  const { setKPIs, setWorkOrders, setAssets, activeKpi, setActiveKpi, setSearchQuery, isAuthenticated } = useStore();
  const [autoPilotMode, setAutoPilotMode] = useState<'schedule' | 'list'>('schedule');

  useEffect(() => {
    // Reset mode when activeKpi changes
    if (activeKpi === 'maintenance-auto-pilot') {
      setAutoPilotMode('schedule');
    }
  }, [activeKpi]);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const res = await fetch('/api/kpis');
        if (res.ok) {
          const data = await res.json();
          console.log("[Stage 3] KPI Data Fetched Successfully");
          setKPIs(data);
        }
      } catch (error) {
        console.error('[Stage 3] Error fetching KPIs:', error);
      }
    };

    const fetchWorkOrders = async () => {
      try {
        const res = await fetch('/api/work-orders');
        if (res.ok) {
          const data = await res.json();
          console.log("[Stage 4] Work Order Data Fetched Successfully");
          setWorkOrders(data || []);
        }
      } catch (error) {
        console.error('[Stage 4] Error fetching Work Orders:', error);
      }
    };

    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/assets');
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    fetchKPIs();
    fetchWorkOrders();
    fetchAssets();

    const ws = new WebSocket('ws://127.0.0.1:8000/ws/kpis');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setKPIs(data);
      } catch (error) {
        console.error('WebSocket parse error:', error);
      }
    };

    return () => ws.close();
  }, [setKPIs, setWorkOrders]);

  const handleKpiClick = (name: string) => {
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/%/g, '');
    console.log(`[Stage 5] KPI Clicked: ${name} (Slug: ${slug})`);
    setActiveKpi(activeKpi === slug ? null : slug); // Toggle
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-3xl -z-10 translate-y-1/3 pointer-events-none" />

      <Sidebar />

      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        <Header />

        <div id="scroll-container" className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {/* KPI Section */}
          <section>
            <div className="flex items-end justify-between mb-6 px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Performance</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Click any card to drill down • Real-time Metrics
                </p>
              </div>
              {activeKpi && (
                <button 
                  onClick={() => setActiveKpi(null)}
                  className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <KPIStats onKpiClick={handleKpiClick} activeKpi={activeKpi} />
          </section>

          <section id="main-content-area" className="flex flex-col gap-6 px-2 pb-8">
            <div className="w-full">
              <div className="space-y-6">
                <AIInsightsCard />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating KPI Modal */}
      {activeKpi && !['search', 'assets', 'maintenance-auto-pilot'].includes(activeKpi) && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setActiveKpi(null)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
          <div 
            className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DrilldownView 
                kpiId={activeKpi === 'pending-work-orders' ? 'work-order' : activeKpi} 
                initialStatus={activeKpi === 'pending-work-orders' ? 'Pending' : undefined}
                onClose={() => setActiveKpi(null)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Specialty Full-Screen Views (Scheduler, Search, Assets, Work Instruction Coach) */}
      {(activeKpi === 'maintenance-auto-pilot' || activeKpi === 'search' || activeKpi === 'assets' || activeKpi === 'work-instruction-coach') && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-500">
           <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                 <button onClick={() => setActiveKpi(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2">
                   &larr; Back to Dashboard
                 </button>
                 <div className="px-3 py-1 bg-indigo-50 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                   {activeKpi === 'work-instruction-coach' ? 'Instruction guide' : activeKpi.replace(/-/g, ' ')}
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                {activeKpi === 'maintenance-auto-pilot' ? (
                   <div className="space-y-6 max-w-7xl mx-auto">
                      <div className="flex justify-end gap-2 px-2">
                        <button 
                          onClick={() => setAutoPilotMode('schedule')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            autoPilotMode === 'schedule' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100'
                          }`}
                        >
                          <CalendarIcon size={14} />
                          Schedule
                        </button>
                        <button 
                          onClick={() => setAutoPilotMode('list')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            autoPilotMode === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100'
                          }`}
                        >
                          <List size={14} />
                          Detailed List
                        </button>
                      </div>
                      <div className="modular-container p-6">
                        {autoPilotMode === 'schedule' ? <MaintenanceSchedule /> : <DrilldownView kpiId="work-order" initialStatus="Pending" onClose={() => setActiveKpi(null)} />}
                      </div>
                   </div>
                ) : activeKpi === 'work-instruction-coach' ? (
                  <div className="max-w-7xl mx-auto w-full h-full">
                    <DrilldownView kpiId="work-order" initialStatus="Pending" onClose={() => setActiveKpi(null)} />
                  </div>
                ) : activeKpi === 'search' ? (
                  <div className="max-w-7xl mx-auto w-full h-full">
                    <SearchView onClose={() => { setActiveKpi(null); setSearchQuery(''); }} />
                  </div>
                ) : (
                  <div className="max-w-7xl mx-auto w-full h-full">
                    <AssetView onClose={() => setActiveKpi(null)} />
                  </div>
                )}
              </div>
           </div>
        </div>
      )}
      <ChatPanel />
    </main>
  );
}
