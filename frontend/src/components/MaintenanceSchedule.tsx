'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import ExecutionPlanModal from './ExecutionPlanModal';

interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  technician: string;
  technicianId: string;
  role: string;
  hasPermit: boolean;
  status: string;
}

const MaintenanceSchedule = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWo, setSelectedWo] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/schedule?status=pending');
      const data = await res.json();
      // Client-side guard: keep only pending items
      const pending = (data as ScheduleItem[]).filter(
        item => (item.status || '').toLowerCase() === 'pending'
      );
      setSchedule(pending);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all days for the current month view (including padding)
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    // Last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Day of the week of the first day (0-6)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    const days = [];
    
    // Padding from previous month
    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Padding for next month to fill 42 cells (6 rows)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const monthDays = getMonthDays(currentDate);
  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Check for technician overlaps
  const checkOverlaps = (item: ScheduleItem, allItems: ScheduleItem[]) => {
    if (!item.technicianId) return false;
    return allItems.some(other => 
      other.id !== item.id && 
      other.technicianId === item.technicianId && 
      other.date === item.date &&
      ((item.start >= other.start && item.start < other.end) || 
       (item.end > other.start && item.end <= other.end))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Planner</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Pending Work Orders Only • Criticality-Ordered Pipeline
          </p>
        </div>

        
        <div className="flex items-center gap-4">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 py-2 flex items-center gap-3">
              <Calendar size={14} className="text-indigo-500" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900 min-w-[120px] text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">
          {weekDayNames.map(day => (
            <div key={day} className="py-4 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</span>
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 grid-rows-6 min-h-[700px]">
          {monthDays.map((dayObj, idx) => {
            const dateStr = dayObj.date.toISOString().split('T')[0];
            const dayItems = schedule.filter(item => item.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div 
                key={idx} 
                className={`border-r border-b border-slate-50 p-2 transition-colors ${
                  dayObj.isCurrentMonth ? 'bg-white' : 'bg-slate-50/30 opacity-40'
                } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg ${
                    isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'
                  }`}>
                    {dayObj.date.getDate()}
                  </span>
                  {dayItems.length > 0 && (
                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                      {dayItems.length} work orders
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar">
                  {dayItems.map((item, i) => {
                    const hasOverlap = checkOverlaps(item, schedule);
                    const isMissingPermit = !item.hasPermit;
                    
                    return (
                      <div 
                        key={i}
                        onClick={() => setSelectedWo(item.id)}
                        className={`px-2 py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer transition-all truncate hover:scale-[1.02] active:scale-[0.98] ${
                          isMissingPermit 
                            ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm shadow-rose-100' 
                            : 'bg-indigo-50/50 border-indigo-100/50 text-indigo-700'
                        }`}
                        title={`${item.start} - ${item.end}: ${item.title}`}
                      >
                        <div className="flex items-center gap-1 justify-between">
                          <div className="flex items-center gap-1 min-w-0">
                            <Clock size={8} className="shrink-0" />
                            <span className="shrink-0">{item.start}</span>
                            <span className="truncate flex-1 font-black">{item.id}</span>
                          </div>
                          {hasOverlap && <AlertTriangle size={8} className="text-rose-500 shrink-0" />}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm w-fit">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-indigo-50 border border-indigo-100"></div>
          <span className="text-[9px] font-bold text-indigo-700">Pending (With Permit)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-rose-50 border border-rose-200"></div>
          <span className="text-[9px] font-bold text-rose-700">Pending (No Permit)</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <AlertTriangle size={12} className="text-rose-500" />
          <span className="text-[9px] font-bold text-slate-600">Resource Conflict</span>
        </div>
      </div>

      {selectedWo && (
        <ExecutionPlanModal 
          workOrderId={selectedWo} 
          onClose={() => { setSelectedWo(null); fetchSchedule(); }} 
        />
      )}
    </div>
  );
};

export default MaintenanceSchedule;
