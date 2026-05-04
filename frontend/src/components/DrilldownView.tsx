'use client';

import React, { useEffect, useState } from 'react';
import ExecutionPlanModal from './ExecutionPlanModal';
import { 
  Sparkles, 
  Loader2, 
  Calendar, 
  Filter, 
  Download,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LabelList 
} from 'recharts';

const COLORS = ['#0f172a', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];

interface DrilldownViewProps {
  kpiId: string;
  onClose: () => void;
}

const DrilldownView: React.FC<DrilldownViewProps> = ({ kpiId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeView, setActiveView] = useState<'role' | 'discipline'>('role');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [workOrdersData, setWorkOrdersData] = useState<any[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string | null>(null);
  const [fetchingWo, setFetchingWo] = useState(false);

  const handleBarClick = async (entry: any) => {
    if (kpiId !== 'work-order') return;
    const status = entry.name;
    setSelectedStatus(status);
    setFetchingWo(true);
    try {
      const res = await fetch(`/api/work-orders?status=${status}`);
      const json = await res.json();
      setWorkOrdersData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingWo(false);
    }
  };

  const toggleView = () => {
    setActiveView(prev => prev === 'role' ? 'discipline' : 'role');
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/drilldown/${kpiId}`);
        const json = await res.json();
        console.log(`[Stage 8] Drilldown Data Fetched for: ${kpiId}`);
        setData(json);
        getAiInsight(json);
      } catch (e) {
        console.error(`[Stage 8] Error fetching drilldown data:`, e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [kpiId]);

  const getAiInsight = async (contextData: any) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: "Explain this data and suggest maintenance improvements.",
          context_data: contextData 
        })
      });
      const json = await res.json();
      console.log("[Stage 9] AI Insights Generated Successfully");
      setAiInsight(json.answer);
    } catch (e) {
      console.error("[Stage 9] Error generating AI insights:", e);
      setAiInsight("Error generating insights.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const chartData = kpiId === 'manpower-utilization' && activeView === 'discipline' ? data?.disciplineData : data?.data;

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 capitalize tracking-tight">
            {kpiId.replace(/-/g, ' ')} Deep-Dive
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Real-time Analytical Engine
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={20} className="text-slate-400" />
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="w-full space-y-6">
          <div className={selectedStatus ? "modular-container" : "modular-container h-[400px]"}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {selectedStatus ? `${selectedStatus} Work Orders` : data?.title}
              </h3>
              <div className="flex gap-2">
                {selectedStatus ? (
                  <button onClick={() => setSelectedStatus(null)} className="text-[10px] text-indigo-600 font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                    &larr; Back to Chart
                  </button>
                ) : (
                  <>
                    {kpiId === 'manpower-utilization' && (
                      <button 
                        onClick={toggleView}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        View by {activeView === 'role' ? 'Discipline' : 'Role'}
                      </button>
                    )}
                    <button className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                      <Filter size={14} />
                    </button>
                    <button className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                      <Download size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectedStatus ? (
              fetchingWo ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
              ) : (
                <div className="overflow-auto rounded-xl border border-slate-100 bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ID</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Class</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Description</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {workOrdersData.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-indigo-50/50 cursor-pointer transition-colors group" onClick={() => setSelectedWorkOrder(row.id)}>
                          <td className="px-4 py-3 text-[10px] font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">{row.id}</td>
                          <td className="px-4 py-3 text-[10px] font-bold text-slate-700">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md">{row.class}</span>
                          </td>
                          <td className="px-4 py-3 text-[10px] text-slate-600 max-w-[260px] truncate" title={row.description}>{row.description}</td>
                          <td className="px-4 py-3 text-[10px] font-bold">
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full">{row.status}</span>
                          </td>
                          <td className="px-4 py-3 text-[10px]">
                            <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold group-hover:bg-indigo-700 transition-colors">View Plan →</span>
                          </td>
                        </tr>
                      ))}
                      {workOrdersData.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No work orders found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
            <ResponsiveContainer width="100%" height="80%">
              {data?.chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="planned" stroke="#0f172a" strokeWidth={2} dot={{r: 3}}>
                    <LabelList dataKey="planned" position="top" style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  </Line>
                  <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} dot={{r: 4}}>
                    <LabelList dataKey="actual" position="top" style={{ fill: '#6366f1', fontSize: 9, fontWeight: 700 }} />
                  </Line>
                </LineChart>
              ) : data?.chartType === 'grouped-bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
                  <Bar dataKey={Object.keys(chartData[0] || {})[1]} fill="#0f172a" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey={Object.keys(chartData[0] || {})[1]} position="top" style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                  <Bar dataKey={Object.keys(chartData[0] || {})[2]} fill="#6366f1" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey={Object.keys(chartData[0] || {})[2]} position="top" style={{ fill: '#6366f1', fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              ) : data?.chartType === 'table' ? (
                <div className="overflow-auto h-full rounded-xl border border-slate-50">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {Object.keys(chartData[0] || {}).map(k => (
                          <th key={k} className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {chartData.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} className="px-4 py-2 text-[10px] font-bold text-slate-700">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <BarChart data={chartData} layout={data?.chartType === 'horizontal-bar' ? 'vertical' : 'horizontal'}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  {data?.chartType === 'horizontal-bar' ? (
                    <>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 700}} width={80} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                    </>
                  )}
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
                  <Bar dataKey={Object.keys(chartData[0] || {})[1] || 'count'} radius={[4, 4, 4, 4]} barSize={24} onClick={handleBarClick}>
                    <LabelList dataKey={Object.keys(chartData[0] || {})[1] || 'count'} position={data?.chartType === 'horizontal-bar' ? "right" : "top"} style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor={kpiId === 'work-order' ? 'pointer' : 'default'} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="modular-container border-indigo-100 bg-indigo-50/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-indigo-600" size={16} fill="currentColor" />
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">AI Insights</h3>
            </div>

            <div className="text-[10px] font-medium text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-100 shadow-sm whitespace-pre-line max-h-[300px] overflow-y-auto min-h-[80px]">
              {aiLoading ? (
                <div className="flex items-center justify-center h-full w-full py-4">
                  <Loader2 className="animate-spin text-indigo-600" size={16} />
                </div>
              ) : (
                aiInsight || "No insights available."
              )}
            </div>
          </div>
          
          <div className="modular-container p-5">
             <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-amber-500" size={16} />
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Quick Actions</h3>
            </div>
            <button className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
               <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Export Dataset</p>
               <p className="text-[8px] text-slate-400 font-bold">Download as CSV/JSON</p>
            </button>
          </div>
        </div>
      </div>

      {selectedWorkOrder && (
        <ExecutionPlanModal 
          workOrderId={selectedWorkOrder} 
          onClose={() => setSelectedWorkOrder(null)} 
        />
      )}
    </div>
  );
};

export default DrilldownView;
