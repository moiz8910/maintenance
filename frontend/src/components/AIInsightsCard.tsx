'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Loader2, BrainCircuit } from 'lucide-react';

const AIInsightsCard = () => {
  const [query, setQuery] = useState('');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setInsight('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      const data = await res.json();
      setInsight(data.answer);
    } catch (error) {
      setInsight("Technical Error: Unable to fetch AI insights at this time.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modular-container p-8 bg-white border border-slate-200 shadow-sm relative overflow-hidden group">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 opacity-50" />

      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
              <Sparkles size={24} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Maintenance Insights</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Maintenance Intelligence Engine</p>
            </div>
          </div>
          <BrainCircuit size={40} className="text-slate-100 group-hover:text-indigo-100 transition-colors duration-500" />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Analyze Plant Status
          </label>
          <div className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="E.g., 'Compare PM Adherence vs MTTR for Potline 1' or 'Analyze spare part stockout risks'"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 pl-6 pr-20 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-medium shadow-inner"
            />
            <button 
              onClick={handleGenerate}
              disabled={loading || !query.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 bg-indigo-600 text-white rounded-xl flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-indigo-100 font-bold text-xs"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <span>Analyze</span>
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {insight && (
          <div className="bg-indigo-50/30 rounded-3xl p-6 border border-indigo-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-2 h-6 bg-indigo-600 rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Analysis Result</span>
             </div>
             <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-medium whitespace-pre-line">
               {insight}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightsCard;
