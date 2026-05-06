'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Loader2, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AIInsightsCard = () => {
  const [query, setQuery] = useState('');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/system-updates')
      .then(r => r.json())
      .then(setUpdates)
      .catch(() => {});
  }, []);

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
             <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
               <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight}</ReactMarkdown>
             </div>
          </div>
        )}

        {/* What's New Section */}
        {updates.length > 0 && !insight && (
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">What's New & Updates</h4>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-md border border-emerald-100">LIVE</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {updates.map((upd) => (
                <div key={upd.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group/item hover:border-indigo-100 hover:bg-white transition-all cursor-default">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded-md">{upd.category}</span>
                    <span className="text-[8px] font-bold text-slate-400">{upd.timestamp}</span>
                  </div>
                  <h5 className="text-xs font-black text-slate-800 mb-1 group-hover/item:text-indigo-600 transition-colors">{upd.title}</h5>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{upd.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightsCard;
