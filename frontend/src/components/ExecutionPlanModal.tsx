'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, X, Briefcase, Users, Box, CheckCircle2, ShieldCheck, Calculator } from 'lucide-react';

interface ExecutionPlanModalProps {
  workOrderId: string;
  onClose: () => void;
}

const ModalContent: React.FC<{ workOrderId: string; onClose: () => void }> = ({ workOrderId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/execution-plan/${workOrderId}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('Failed to fetch execution plan:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workOrderId]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (loading) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
        className="flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      >
        <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={24} />
          <span className="text-sm font-bold text-slate-700">Loading Execution Plan...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
           style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-md">
                Class {data.work_order?.work_order_class || 'N/A'}
              </span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-md">
                {data.work_order?.work_order_status || 'Pending'}
              </span>
              <h2 className="text-2xl font-black text-slate-900">{workOrderId}</h2>
            </div>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">
              {data.work_order?.repair_description}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {data.work_order?.repair_type} &bull; Opened: {data.work_order?.work_order_open_day} {data.work_order?.work_order_open_time}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700 shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Tasks — spans 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Task Execution Steps</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                    {data.tasks?.length || 0} tasks
                  </span>
                </div>
                <div className="space-y-3">
                  {data.tasks?.map((task: any, idx: number) => {
                    const hours = task.estimated_duration_hours ?? 8;
                    const durationColor =
                      hours <= 8  ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                      hours <= 16 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                    'text-rose-700 bg-rose-50 border-rose-200';
                    return (
                      <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/30 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-black text-slate-900">
                                {task.task_description || `Task Ref #${task.task_ref}`}
                              </p>
                              {task.discipline && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full shrink-0">
                                  {task.discipline}
                                </span>
                              )}
                            </div>
                            {/* Estimated Duration Badge */}
                            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black whitespace-nowrap shrink-0 ${durationColor}`}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                              </svg>
                              {hours}h estimated
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap mt-1.5">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                              Ref: <span className="font-bold text-slate-500">#{task.task_ref}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                              Start: <span className="font-bold text-slate-500">{task.work_order_task_item_open_day} {task.work_order_task_item_open_time}</span>
                            </p>
                            {task.work_order_task_item_finish_day && (
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                End: <span className="font-bold text-slate-500">{task.work_order_task_item_finish_day} {task.work_order_task_item_finish_time}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!data.tasks || data.tasks.length === 0) && (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No tasks listed for this work order.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar: Manpower, Materials, Contracts */}
            <div className="space-y-5">

              {/* Manpower */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="text-blue-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Manpower</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                    {data.manpower?.length || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  {[...(data.manpower || [])].sort((a: any, b: any) => {
                    const engRoles = ['engineer', 'senior engineer'];
                    const aIsEng = engRoles.includes((a.role_designation || '').toLowerCase());
                    const bIsEng = engRoles.includes((b.role_designation || '').toLowerCase());
                    return aIsEng === bIsEng ? 0 : aIsEng ? -1 : 1;
                  }).map((mp: any, idx: number) => {
                    const isEngineer = ['engineer', 'senior engineer'].includes((mp.role_designation || '').toLowerCase());
                    return (
                      <div key={idx} className={`p-3 rounded-lg border transition-colors ${isEngineer ? 'border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/60' : 'border-slate-100 bg-slate-50/50 hover:bg-blue-50/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-black text-slate-900 truncate">
                                {mp.technician_name || mp.technician_id}
                              </p>
                              {mp.auto_assigned && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded">
                                  Auto-assigned
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              ID: <span className="font-bold text-slate-500">{mp.technician_id}</span>
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shrink-0 ${isEngineer ? 'text-indigo-600 bg-indigo-100' : 'text-blue-600 bg-blue-50'}`}>
                            {mp.service_period}h
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {mp.role_designation && (
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${isEngineer ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                              {mp.role_designation}
                            </span>
                          )}
                          {mp.discipline_trade && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                              {mp.discipline_trade}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!data.manpower || data.manpower.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No manpower assigned.</p>
                  )}
                </div>
              </div>

              {/* Materials */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Box className="text-amber-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Materials</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                    {data.materials?.length || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  {data.materials?.map((mat: any, idx: number) => {
                    const remaining = (mat.available_quantity || 0) - (mat.recommended_quantity || 0);
                    const stockStatusColor = remaining < 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50';
                    return (
                      <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-amber-50/30 transition-colors flex flex-col gap-2">
                        <p className="text-xs font-bold text-slate-700 truncate" title={mat.material}>
                          {mat.material}
                        </p>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium">Available: <strong className="text-slate-800">{mat.available_quantity || 0}</strong></span>
                          <span className="text-slate-500 font-medium">Recommended: <strong className="text-amber-600">{mat.recommended_quantity || 0}</strong></span>
                          <span className={`px-2 py-1 rounded font-bold ${stockStatusColor}`}>
                            Left: {remaining}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {(!data.materials || data.materials.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No materials listed.</p>
                  )}
                </div>
              </div>

              {/* Contracts */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="text-rose-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Contracts</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                    {data.contracts?.length || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  {data.contracts?.map((c: any, idx: number) => {
                    const remaining = (c.total_value || 0) - (c.recommended_value || 0);
                    const budgetStatusColor = remaining < 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50';
                    return (
                      <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-rose-50/30 transition-colors flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.contract}</p>
                          {c.type && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black uppercase tracking-widest rounded shrink-0">
                              {c.type}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium">Total: <strong className="text-slate-800">₹{c.total_value?.toLocaleString() || 0}</strong></span>
                          <span className="text-slate-500 font-medium">Recommended: <strong className="text-rose-600">₹{c.recommended_value?.toLocaleString() || 0}</strong></span>
                          <span className={`px-2 py-1 rounded font-bold ${budgetStatusColor}`}>
                            Left: ₹{remaining.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {(!data.contracts || data.contracts.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No contracts assigned.</p>
                  )}
                </div>
              </div>

              {/* Work Permits */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="text-purple-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Work Permits</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                    {data.work_permits?.length || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2">
                    <p className="text-xs font-bold text-slate-700">Status</p>
                    {data.work_permits && data.work_permits.length > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md whitespace-nowrap">
                        Available: Yes
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md whitespace-nowrap">
                        Available: No
                      </span>
                    )}
                  </div>
                  {data.work_permits?.map((wp: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-purple-50/30 transition-colors">
                      <p className="text-xs font-black text-slate-900 truncate pr-2" title={wp.description}>{wp.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase tracking-widest rounded">
                          {wp.type}
                        </span>
                        <span className="text-[10px] text-slate-500">ID: {wp.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated Cost */}
              {data.estimated_cost && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm bg-gradient-to-br from-white to-slate-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="text-emerald-600" size={18} />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Estimated Cost</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cost</span>
                      <span className="text-lg font-black text-emerald-700">₹{data.estimated_cost.total?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-600">Manpower</span>
                      <span className="font-bold text-slate-800">₹{data.estimated_cost.manpower?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-600">Material</span>
                      <span className="font-bold text-slate-800">₹{data.estimated_cost.material?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-600">Contract</span>
                      <span className="font-bold text-slate-800">₹{data.estimated_cost.contract?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const ExecutionPlanModal: React.FC<ExecutionPlanModalProps> = ({ workOrderId, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!mounted) return null;

  // Portal renders directly to document.body — fully escapes all stacking contexts
  return ReactDOM.createPortal(
    <ModalContent workOrderId={workOrderId} onClose={onClose} />,
    document.body
  );
};

export default ExecutionPlanModal;
