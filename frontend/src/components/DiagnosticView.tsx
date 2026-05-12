'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Loader2, ArrowRight, Brain, AlertCircle, Clock } from 'lucide-react';
import DiagnosisReviewModal from './DiagnosisReviewModal';
import ExecutionPlanModal from './ExecutionPlanModal';

const DiagnosticView = () => {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWo, setSelectedWo] = useState<string | null>(null);
  const [selectedExecutionWo, setSelectedExecutionWo] = useState<string | null>(null);

  const fetchDiagnosticWos = async () => {
    setLoading(true);
    console.log("[DiagnosticView] Fetching WOs...");
    try {
      const res = await fetch('/api/diagnostic/work-orders');
      console.log("[DiagnosticView] Response status:", res.status);
      const data = await res.json();
      console.log("[DiagnosticView] Data received:", data.length, "items");
      setWorkOrders(data);
    } catch (error) {
      console.error("Failed to fetch diagnostic queue", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosticWos();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-600" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Diagnostic Analysis Queue
            <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-black rounded-md animate-pulse">LIVE</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Analyzing Breakdown & Corrective Failures
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Analysis</p>
            <p className="text-xl font-black text-slate-900">{workOrders.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Activity size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {workOrders.map((wo) => (
          <div 
            key={wo.id}
            onClick={() => setSelectedWo(wo.id)}
            className="group relative bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg">
                <ArrowRight size={20} />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100">
                    {wo.type}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12} /> {wo.date}
                  </span>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    ID: {wo.id}
                  </span>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Reported</h4>
                  <p className="text-sm font-bold text-slate-800 leading-snug">
                    {wo.description}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset</h4>
                    <p className="text-[11px] font-bold text-slate-600">{wo.asset_name} ({wo.asset})</p>
                  </div>
                  <div className="h-8 w-px bg-slate-100" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Brain size={16} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Readiness: HIGH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {workOrders.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
            <AlertCircle size={48} className="text-slate-300 mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No work orders in diagnostic queue.</p>
          </div>
        )}
      </div>

      {selectedWo && (
        <DiagnosisReviewModal 
          workOrderId={selectedWo} 
          assetId={workOrders.find(w => w.id === selectedWo)?.asset || ''}
          onClose={(approved) => {
            if (approved) {
              fetchDiagnosticWos();
              setSelectedExecutionWo(selectedWo);
            }
            setSelectedWo(null);
          }} 
        />
      )}

      {selectedExecutionWo && (
        <ExecutionPlanModal 
          workOrderId={selectedExecutionWo} 
          onClose={() => setSelectedExecutionWo(null)} 
        />
      )}
    </div>
  );
};

export default DiagnosticView;
