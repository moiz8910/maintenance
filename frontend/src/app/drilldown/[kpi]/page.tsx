'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Calendar, 
  Filter, 
  Download,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend 
} from 'recharts';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

const COLORS = ['#0f172a', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function DrilldownPage() {
  const { kpi } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/drilldown/${kpi}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [kpi]);

  const getAiInsight = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: "Explain this data and suggest maintenance improvements.",
          context_data: data 
        })
      });
      const json = await res.json();
      setAiInsight(json.answer);
    } catch (e) {
      setAiInsight("Error generating insights.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 shadow-sm">
                <Calendar size={14} /> Last 30 Days
              </button>
              <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
                <Download size={14} /> Export Report
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black text-slate-900 capitalize tracking-tight">
              {kpi.toString().replace(/-/g, ' ')} Analysis
            </h1>
            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-widest">
              Detailed Analytic View • Real Data Engine
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Chart Column */}
            <div className="xl:col-span-2 space-y-8">
              <div className="modular-container h-[500px]">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{data?.title}</h2>
                  <Filter className="text-slate-300" size={18} />
                </div>
                
                <ResponsiveContainer width="100%" height="85%">
                  {data?.chartType === 'line' ? (
                    <LineChart data={data.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingBottom: '20px' }} />
                      <Line type="monotone" dataKey="planned" name="Planned" stroke="#0f172a" strokeWidth={3} dot={{r: 4}}>
                        <LabelList dataKey="planned" position="top" style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                      </Line>
                      <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={3} dot={{r: 6}}>
                        <LabelList dataKey="actual" position="top" style={{ fill: '#6366f1', fontSize: 10, fontWeight: 700 }} />
                      </Line>
                    </LineChart>
                  ) : data?.chartType === 'grouped-bar' ? (
                    <BarChart data={data.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingBottom: '20px' }} />
                      <Bar dataKey={Object.keys(data.data[0])[1]} name={Object.keys(data.data[0])[1].toUpperCase()} fill="#0f172a" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey={Object.keys(data.data[0])[1]} position="top" style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                      <Bar dataKey={Object.keys(data.data[0])[2]} name={Object.keys(data.data[0])[2].toUpperCase()} fill="#6366f1" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey={Object.keys(data.data[0])[2]} position="top" style={{ fill: '#6366f1', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  ) : data?.chartType === 'table' ? (
                    <div className="overflow-hidden border border-slate-100 rounded-2xl">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            {Object.keys(data.data[0]).map(k => (
                              <th key={k} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {data.data.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              {Object.values(row).map((v: any, j) => (
                                <td key={j} className="px-6 py-4 text-xs font-bold text-slate-700">{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <BarChart data={data.data} layout={data?.chartType === 'horizontal-bar' ? 'vertical' : 'horizontal'} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      {data?.chartType === 'horizontal-bar' ? (
                        <>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} width={100} />
                        </>
                      ) : (
                        <>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                        </>
                      )}
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingBottom: '20px' }} />
                      <Bar 
                        dataKey={Object.keys(data.data[0])[1] || 'count'} 
                        name={kpi === 'safety-compliance' ? 'Permit Compliance' : (kpi === 'safety-incidents' ? 'Safety Incidents' : (Object.keys(data.data[0])[1] || 'count').toUpperCase())} 
                        radius={[6, 6, 6, 6]} 
                        barSize={32}
                      >
                        <LabelList dataKey={Object.keys(data.data[0])[1] || 'count'} position={data?.chartType === 'horizontal-bar' ? 'right' : 'top'} style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        {data.data.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Data Summary Table */}
              <div className="modular-container">
                <div className="flex items-center gap-2 mb-6">
                  <AlertCircle className="text-indigo-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Statistical Outliers</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Efficiency Peak</p>
                    <p className="text-lg font-black text-emerald-900 mt-1">+12.4%</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Risk Factor</p>
                    <p className="text-lg font-black text-amber-900 mt-1">Moderate</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Data Confidence</p>
                    <p className="text-lg font-black text-indigo-900 mt-1">98.2%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insight Column */}
            <div className="space-y-6">
              <div className="modular-container sticky top-24 border-indigo-100 bg-indigo-50/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Sparkles size={20} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">AI Decision Support</h3>
                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Decision Intelligence Panel</p>
                  </div>
                </div>

                {aiInsight ? (
                  <div className="space-y-4">
                    <div className="text-xs font-medium text-slate-700 leading-relaxed bg-white p-6 rounded-2xl border border-slate-100 shadow-sm whitespace-pre-line">
                      {aiInsight}
                    </div>
                    <button 
                      onClick={() => setAiInsight('')}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest"
                    >
                      Clear Insights
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 px-6">
                    <p className="text-xs text-slate-400 font-bold mb-6">Click below to let Gemini analyze the current {kpi} trends.</p>
                    <button 
                      onClick={getAiInsight}
                      disabled={aiLoading}
                      className="w-full py-4 grad-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      Explain This Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
