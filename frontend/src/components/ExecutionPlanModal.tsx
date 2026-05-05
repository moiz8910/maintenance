'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, X, Briefcase, Users, Box, CheckCircle2, ShieldCheck, Calculator, Trash2, Plus, Edit3 } from 'lucide-react';

interface ExecutionPlanModalProps {
  workOrderId: string;
  onClose: () => void;
}

const ModalContent: React.FC<{ workOrderId: string; onClose: () => void }> = ({ workOrderId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // Editable copies
  const [editTasks, setEditTasks] = useState<any[]>([]);
  const [editManpower, setEditManpower] = useState<any[]>([]);
  const [editMaterials, setEditMaterials] = useState<any[]>([]);

  // Lookup data from DB
  const [lookupTasks, setLookupTasks] = useState<any[]>([]);
  const [lookupTechs, setLookupTechs] = useState<any[]>([]);
  const [lookupMats, setLookupMats] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Add-row selectors
  const [addTaskId, setAddTaskId] = useState('');
  const [addTechId, setAddTechId] = useState('');
  const [addMatId, setAddMatId] = useState('');
  const [addMatQty, setAddMatQty] = useState(1);
  const [addTechHours, setAddTechHours] = useState(8);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/execution-plan/${workOrderId}`);
        const json = await res.json();
        setData(json);
        setEditTasks(json.tasks ? [...json.tasks] : []);
        setEditManpower(json.manpower ? [...json.manpower] : []);
        setEditMaterials(json.materials ? [...json.materials] : []);
      } catch (e) {
        console.error('Failed to fetch execution plan:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workOrderId]);

  const fetchLookups = useCallback(async () => {
    if (lookupTasks.length > 0) return; // already loaded
    setLookupLoading(true);
    try {
      const [t, te, m] = await Promise.all([
        fetch('/api/lookup/tasks').then(r => r.json()).catch(() => []),
        fetch('/api/lookup/technicians').then(r => r.json()).catch(() => []),
        fetch('/api/lookup/materials').then(r => r.json()).catch(() => []),
      ]);
      setLookupTasks(Array.isArray(t) ? t : []);
      setLookupTechs(Array.isArray(te) ? te : []);
      setLookupMats(Array.isArray(m) ? m : []);
    } finally {
      setLookupLoading(false);
    }
  }, [lookupTasks.length]);

  const enterReview = () => {
    setReviewMode(true);
    fetchLookups();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Computed cost from editable state
  const computedCost = {
    manpower: editManpower.reduce((s: number, m: any) => s + (m.service_period || 0) * (m.standard_hourly_rate || 0), 0),
    material: editMaterials.reduce((s: number, m: any) => s + (m.recommended_quantity || 0) * (m.material_price || 0), 0),
    contract: data?.estimated_cost?.contract || 0,
    get total() { return this.manpower + this.material + this.contract; }
  };

  const addTask = () => {
    const t = lookupTasks.find((x: any) => String(x.id) === addTaskId);
    if (!t) return;
    setEditTasks(prev => [...prev, { task_ref: t.id, task_description: t.description, estimated_duration_hours: 8 }]);
    setAddTaskId('');
  };

  const addManpower = () => {
    const t = lookupTechs.find((x: any) => String(x.id) === addTechId);
    if (!t) return;
    setEditManpower(prev => [...prev, { ...t, technician_id: t.id, technician_name: t.name, service_period: addTechHours }]);
    setAddTechId('');
    setAddTechHours(8);
  };

  const addMaterial = () => {
    const m = lookupMats.find((x: any) => String(x.id) === addMatId);
    if (!m) return;
    setEditMaterials(prev => [...prev, { ...m, recommended_quantity: addMatQty, material_price: 0 }]);
    setAddMatId('');
    setAddMatQty(1);
  };

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} className="flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={24} />
          <span className="text-sm font-bold text-slate-700">Loading Execution Plan...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const reviewBanner = reviewMode && (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-xs font-bold text-amber-700">
      <Edit3 size={14} /> Review Mode — fields are now editable. Remove or add items below.
    </div>
  );

  const sectionStyle = reviewMode ? 'bg-white rounded-xl border-2 border-amber-300 p-5 shadow-sm' : 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} className="flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8" onClick={handleBackdropClick}>
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" style={{ maxHeight: '90vh' }}>

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
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-slate-800 text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-md">Asset</span>
              {data.work_order?.asset_id ? (
                <>
                  <span className="text-sm font-black text-slate-700">{data.work_order.asset_id}</span>
                  <span className="text-slate-400 text-sm">—</span>
                  <span className="text-sm font-semibold text-slate-600">{data.work_order.asset_name}</span>
                </>
              ) : <span className="text-sm text-slate-400 italic">Not Assigned</span>}
            </div>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">{data.work_order?.repair_description}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {data.work_order?.repair_type} &bull; Opened: {data.work_order?.work_order_open_day} {data.work_order?.work_order_open_time}
              {data.work_order?.work_order_end_day && (
                <span className="ml-3 text-rose-500">&bull; Closed: {data.work_order.work_order_end_day} {data.work_order.work_order_end_time}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700 shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="border-2 border-indigo-100 bg-white rounded-2xl p-6 space-y-6 shadow-sm">

            {reviewBanner}

            {/* Task Items */}
            <div className="w-full">
              <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Task Item</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{editTasks.length} tasks</span>
                </div>
                <div className="space-y-3">
                  {editTasks.map((task: any, idx: number) => {
                    const hours = task.estimated_duration_hours ?? 8;
                    const dColor = hours <= 8 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : hours <= 16 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200';
                    return (
                      <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/30 transition-colors items-start">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          {reviewMode ? (
                            <input className="w-full text-xs font-bold text-slate-900 border border-amber-200 rounded-lg px-2 py-1 bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                              value={task.task_description || task.task_ref} onChange={e => { const c = [...editTasks]; c[idx] = { ...c[idx], task_description: e.target.value }; setEditTasks(c); }} />
                          ) : (
                            <p className="text-xs font-black text-slate-900">{task.task_description || `Task Ref #${task.task_ref}`}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">Ref: <span className="font-bold text-slate-500">#{task.task_ref}</span></p>
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black whitespace-nowrap shrink-0 ${dColor}`}>
                          {reviewMode ? (
                            <input type="number" min={1} className="w-12 text-center bg-transparent focus:outline-none" value={hours}
                              onChange={e => { const c = [...editTasks]; c[idx] = { ...c[idx], estimated_duration_hours: Number(e.target.value) }; setEditTasks(c); }} />
                          ) : hours}h estimated
                        </div>
                        {reviewMode && (
                          <button onClick={() => setEditTasks(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {reviewMode && (
                    <div className="flex gap-2 pt-2 border-t border-dashed border-amber-200">
                      {lookupLoading ? <Loader2 className="animate-spin text-amber-500" size={16} /> : (
                        <>
                          <select className="flex-1 text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none" value={addTaskId} onChange={e => setAddTaskId(e.target.value)}>
                            <option value="">+ Select task from database...</option>
                            {lookupTasks.map((t: any) => <option key={t.id} value={t.id}>{t.id} — {t.description}</option>)}
                          </select>
                          <button onClick={addTask} disabled={!addTaskId} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-40 flex items-center gap-1">
                            <Plus size={12} /> Add
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {editTasks.length === 0 && <p className="text-xs text-slate-400 italic py-4 text-center">No tasks listed.</p>}
                </div>
              </div>
            </div>

            {/* Manpower + Materials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Manpower */}
              <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="text-blue-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Manpower</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{editManpower.length}</span>
                </div>
                <div className="space-y-3">
                  {editManpower.map((mp: any, idx: number) => {
                    const isEngineer = ['engineer', 'senior engineer'].includes((mp.role_designation || '').toLowerCase());
                    return (
                      <div key={idx} className={`p-3 rounded-lg border transition-colors ${isEngineer ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate">{mp.technician_name || mp.technician_id}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{mp.role_designation} · {mp.discipline_trade}</p>
                          </div>
                          {reviewMode ? (
                            <div className="flex items-center gap-1">
                              <input type="number" min={1} className="w-14 text-xs border border-amber-200 rounded px-1 py-0.5 bg-amber-50 text-center focus:outline-none"
                                value={mp.service_period}
                                onChange={e => { const c = [...editManpower]; c[idx] = { ...c[idx], service_period: Number(e.target.value) }; setEditManpower(c); }} />
                              <span className="text-[10px] text-slate-500">h</span>
                              <button onClick={() => setEditManpower(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shrink-0 ${isEngineer ? 'text-indigo-600 bg-indigo-100' : 'text-blue-600 bg-blue-50'}`}>{mp.service_period}h</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {reviewMode && (
                    <div className="pt-2 border-t border-dashed border-amber-200 space-y-2">
                      {lookupLoading ? <Loader2 className="animate-spin text-amber-500" size={16} /> : (
                        <>
                          <select className="w-full text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none" value={addTechId} onChange={e => setAddTechId(e.target.value)}>
                            <option value="">+ Select technician from database...</option>
                            {lookupTechs.map((t: any) => <option key={t.id} value={t.id}>{t.name} — {t.role_designation}</option>)}
                          </select>
                          <div className="flex gap-2">
                            <input type="number" min={1} placeholder="Hours" className="w-20 text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none" value={addTechHours} onChange={e => setAddTechHours(Number(e.target.value))} />
                            <button onClick={addManpower} disabled={!addTechId} className="flex-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-1">
                              <Plus size={12} /> Add
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {editManpower.length === 0 && <p className="text-xs text-slate-400 italic">No manpower assigned.</p>}
                </div>
              </div>

              {/* Materials */}
              <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Box className="text-amber-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Materials</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{editMaterials.length}</span>
                </div>
                <div className="space-y-3">
                  {editMaterials.map((mat: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                      <p className="text-xs font-bold text-slate-700 truncate" title={mat.material}>{mat.material}</p>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Available: <strong className="text-slate-800">{mat.available_quantity || 0}</strong></span>
                        {reviewMode ? (
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} className="w-14 text-xs border border-amber-200 rounded px-1 py-0.5 bg-amber-50 text-center focus:outline-none"
                              value={mat.recommended_quantity}
                              onChange={e => { const c = [...editMaterials]; c[idx] = { ...c[idx], recommended_quantity: Number(e.target.value) }; setEditMaterials(c); }} />
                            <button onClick={() => setEditMaterials(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">Recommended: <strong className="text-amber-600">{mat.recommended_quantity || 0}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                  {reviewMode && (
                    <div className="pt-2 border-t border-dashed border-amber-200 space-y-2">
                      {lookupLoading ? <Loader2 className="animate-spin text-amber-500" size={16} /> : (
                        <>
                          <select className="w-full text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none" value={addMatId} onChange={e => setAddMatId(e.target.value)}>
                            <option value="">+ Select material from database...</option>
                            {lookupMats.map((m: any) => <option key={m.id} value={m.id}>{m.material} (stock: {m.available_quantity})</option>)}
                          </select>
                          <div className="flex gap-2">
                            <input type="number" min={1} placeholder="Qty" className="w-20 text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none" value={addMatQty} onChange={e => setAddMatQty(Number(e.target.value))} />
                            <button onClick={addMaterial} disabled={!addMatId} className="flex-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-1">
                              <Plus size={12} /> Add
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {editMaterials.length === 0 && <p className="text-xs text-slate-400 italic">No materials listed.</p>}
                </div>
              </div>

              {/* Contracts */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="text-rose-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Contracts</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{data.contracts?.length || 0}</span>
                </div>
                <div className="space-y-3">
                  {data.contracts?.map((c: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-rose-50/30 transition-colors flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700 truncate">{c.contract}</p>
                        {c.type && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black uppercase tracking-widest rounded shrink-0">{c.type}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-medium">Total: <strong className="text-slate-800">₹{c.total_value?.toLocaleString() || 0}</strong></span>
                        <span className="text-slate-500 font-medium">Estimated: <strong className="text-rose-600">₹{c.recommended_value?.toLocaleString() || 0}</strong></span>
                      </div>
                    </div>
                  ))}
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
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{data.work_permits?.length || 0}</span>
                </div>
                <div className="space-y-3">
                  {data.work_permits?.map((wp: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-purple-50/30 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="text-xs font-black text-slate-900 truncate pr-2" title={wp.description}>{wp.description}</p>
                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded shrink-0 ${wp.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {wp.status || 'Unavailable'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase tracking-widest rounded">{wp.type}</span>
                        <span className="text-[10px] text-slate-500">ID: {wp.id}</span>
                      </div>
                      {wp.status_change_timestamp && (
                        <div className="mt-2 pt-2 border-t border-slate-200/50">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Status changed: <span className="text-slate-600">{wp.status_change_timestamp}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!data.work_permits || data.work_permits.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No permits assigned.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Estimated Cost */}
            <div className="w-full">
              <div className={reviewMode ? 'bg-amber-50 rounded-xl border-2 border-amber-300 p-6 shadow-sm max-w-sm' : 'bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm max-w-sm'}>
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="text-emerald-600" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Estimated Cost</h3>
                  {reviewMode && <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-widest ml-auto">Live</span>}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cost</span>
                    <span className="text-lg font-black text-emerald-700">₹{(reviewMode ? computedCost.total : data.estimated_cost?.total)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Manpower</span>
                    <span className="font-bold text-slate-800">₹{(reviewMode ? computedCost.manpower : data.estimated_cost?.manpower)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Material</span>
                    <span className="font-bold text-slate-800">₹{(reviewMode ? computedCost.material : data.estimated_cost?.material)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Contract</span>
                    <span className="font-bold text-slate-800">₹{computedCost.contract?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Review & Approve Actions */}
            <div className="w-full pt-2 pb-2">
              <div className="flex items-center gap-3">
                {reviewMode ? (
                  <button onClick={() => setReviewMode(false)} className="flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 text-xs font-bold hover:bg-amber-200 transition-all">
                    <ShieldCheck size={15} /> Exit Review Mode
                  </button>
                ) : (
                  <button onClick={enterReview} className="flex items-center gap-2 px-5 py-3 bg-white text-slate-700 rounded-xl border border-slate-300 text-xs font-bold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
                    <ShieldCheck size={15} className="text-slate-500" /> Review
                  </button>
                )}
                {approved ? (
                  <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-bold">
                    <CheckCircle2 size={15} className="text-emerald-600" /> Approved
                  </div>
                ) : (
                  <button onClick={() => { setApproved(true); setReviewMode(false); }} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100">
                    <CheckCircle2 size={15} /> Approve Work Order
                  </button>
                )}
              </div>
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
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <ModalContent workOrderId={workOrderId} onClose={onClose} />,
    document.body
  );
};

export default ExecutionPlanModal;
