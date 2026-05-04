'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import KPIStats from '@/components/KPIStats';
import WorkOrderChart from '@/components/WorkOrderChart';
import ChatPanel from '@/components/ChatPanel';
import Header from '@/components/Header';
import DrilldownView from '@/components/DrilldownView';
import { useStore } from '@/store/useStore';
import { BellRing, ArrowRight } from 'lucide-react';

export default function Home() {
  const { setKPIs, setWorkOrders } = useStore();
  const [activeKpi, setActiveKpi] = useState<string | null>(null);

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
        const res = await fetch('/api/drilldown/work-order');
        if (res.ok) {
          const data = await res.json();
          console.log("[Stage 4] Work Order Data Fetched Successfully");
          setWorkOrders(data.data || []);
        }
      } catch (error) {
        console.error('[Stage 4] Error fetching Work Orders:', error);
      }
    };

    fetchKPIs();
    fetchWorkOrders();

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
    setActiveKpi(prev => prev === slug ? null : slug); // Toggle
    // Scroll to chart area smoothly
    setTimeout(() => {
      document.getElementById('main-content-area')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-3xl -z-10 translate-y-1/3 pointer-events-none" />

      <Sidebar />

      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {/* KPI Section */}
          <section>
            <div className="flex items-end justify-between mb-6 px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Plant Performance</h2>
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
              {activeKpi ? (
                <div className="modular-container p-6 animate-in fade-in zoom-in-95 duration-500">
                  <DrilldownView kpiId={activeKpi} onClose={() => setActiveKpi(null)} />
                </div>
              ) : (
                <WorkOrderChart />
              )}
            </div>

            {/* Insights Widget */}
            <div className="modular-container flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <BellRing size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Insights</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">AI-Detected Anomalies</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-widest">High Priority</span>
                    <span className="text-[10px] font-bold text-slate-400">2 mins ago</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Asset #A-204 (Compressor)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Anomalous vibration patterns detected matching historical failure profile #7.{' '}
                    <strong className="text-slate-700">87% probability of breakdown within 48h.</strong>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => handleKpiClick('Predictive Maintenance %')}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all hover:gap-3 group-hover:shadow-lg"
              >
                Generate Intervention Strategy
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
        </div>
      </div>

      <ChatPanel />
    </main>
  );
}
