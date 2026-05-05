'use client';
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList
} from 'recharts';
import { useStore } from '@/store/useStore';
import { Filter, MoreHorizontal, Download } from 'lucide-react';

const COLORS = ['#0f172a', '#6366f1', '#10b981'];

const WorkOrderChart = () => {
  const { workOrders } = useStore();

  React.useEffect(() => {
    console.log("[Stage 7] Work Order Status Chart Mounted");
  }, []);

  const chartData = [
    { name: 'Pending', count: 4 },
    { name: 'In Progress', count: 8 },
    { name: 'Completed YTD', count: 56 },
  ];

  const data = workOrders.length > 0 ? workOrders : chartData;

  return (
    <div className="modular-container h-[420px] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Work Order Status</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Live distribution across plant</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
            <Filter size={16} />
          </button>
          <button className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                padding: '16px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
            <Bar dataKey="count" name="Count" radius={[12, 12, 0, 0]} barSize={48}>
              <LabelList dataKey="count" position="top" style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-900" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Active</span>
          </div>
        </div>
        <button className="text-indigo-600 hover:underline">View All Orders</button>
      </div>
    </div>
  );
};

export default WorkOrderChart;
