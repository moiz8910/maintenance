'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, X, Briefcase, Users, Box, CheckCircle2, ShieldCheck, Calculator, Trash2, Plus, Edit3, FileText, Brain, Download, Mail, Sparkles } from 'lucide-react';

interface WorkOrderDetailViewProps {
  workOrderId: string;
  onClose?: () => void;
  isFullPage?: boolean;
}

export const WorkOrderDetailView: React.FC<WorkOrderDetailViewProps> = ({ workOrderId, onClose, isFullPage = false }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [rawReviewMode, setRawReviewMode] = useState(false);
  const [generatingPermit, setGeneratingPermit] = useState<string | null>(null);
  const [previewPermit, setPreviewPermit] = useState<any>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [generatingMR, setGeneratingMR] = useState<string | null>(null);
  const [generatingPR, setGeneratingPR] = useState<string | null>(null);
  const [mrPreview, setMrPreview] = useState<any>(null);
  const [prPreview, setPrPreview] = useState<any>(null);
  const [manpowerReasoning, setManpowerReasoning] = useState<Record<string, string>>({});
  const [showManpowerReasoning, setShowManpowerReasoning] = useState(true);
  const [taskReasoning, setTaskReasoning] = useState<Record<string, string>>({});
  const [showTaskReasoning, setShowTaskReasoning] = useState(true);
  const [materialReasoning, setMaterialReasoning] = useState<Record<string, string>>({});
  const [showMaterialReasoning, setShowMaterialReasoning] = useState(true);
  const [contractReasoning, setContractReasoning] = useState<Record<string, string>>({});
  const [showContractReasoning, setShowContractReasoning] = useState(true);

  const [editTasks, setEditTasks] = useState<any[]>([]);
  const [editManpower, setEditManpower] = useState<any[]>([]);
  const [editMaterials, setEditMaterials] = useState<any[]>([]);

  const [lookupTasks, setLookupTasks] = useState<any[]>([]);
  const [lookupTechs, setLookupTechs] = useState<any[]>([]);
  const [lookupMats, setLookupMats] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [addTaskId, setAddTaskId] = useState('');
  const [addTechId, setAddTechId] = useState('');
  const [addMatId, setAddMatId] = useState('');
  const [addMatQty, setAddMatQty] = useState(1);
  const [addTechHours, setAddTechHours] = useState(8);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/execution-plan/${workOrderId}`);
      const json = await res.json();
      setData(json);
      setEditTasks(json.tasks ? [...json.tasks] : []);
      setEditManpower(json.manpower ? [...json.manpower] : []);
      setEditMaterials(json.materials ? [...json.materials] : []);
      const woStatus = json.work_order?.work_order_status?.toLowerCase();
      if (woStatus === 'in-progress' || woStatus === 'approved') setApproved(true);
    } catch (e) {
      console.error('Failed to fetch execution plan:', e);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (data && !loading) {
      handleAnalyzeTasks(false);
      handleAnalyzeAssignment(false);
      handleAnalyzeMaterials(false);
      handleAnalyzeContracts(false);
    }
  }, [data?.id, loading]);

  const fetchLookups = useCallback(async () => {
    if (lookupTasks.length > 0) return;
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

  const handleApprove = async () => {
    try {
      await fetch(`/api/work-orders/${workOrderId}/approve`, { method: 'POST' });
      setApproved(true);
      setRawReviewMode(false);
    } catch (e) {
      console.error('Failed to approve work order:', e);
    }
  };

  const handleGeneratePermit = async (permitId: string, start?: string, end?: string) => {
    setGeneratingPermit(permitId);
    try {
      const res = await fetch(`/api/work-permit/${permitId}/generate`, { method: 'POST' });
      if (!res.ok) throw new Error('Generation failed');
      const json = await res.json();
      setPreviewPermit(json);
    } catch (e) {
      console.error(e);
      alert('Failed to generate permit');
    } finally {
      setGeneratingPermit(null);
    }
  };

  const handleDownloadDocx = async () => {
    if (!previewPermit) return;
    setDownloadingDocx(true);
    try {
      const res = await fetch(`/api/work-permit/${previewPermit.permit.id}/download-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewPermit)
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${previewPermit.permit.id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleAnalyzeAssignment = async (isManual = true) => {
    if (editManpower.length === 0) return;
    if (isManual && showManpowerReasoning) {
      setShowManpowerReasoning(false);
      return;
    }
    setShowManpowerReasoning(true);
    if (Object.keys(manpowerReasoning).length > 0) return;

    try {
      const res = await fetch(`/api/work-order/${workOrderId}/manpower-reasoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manpower: editManpower })
      });
      const json = await res.json();
      setManpowerReasoning(json);
    } catch (e) {
      console.error('Failed to fetch manpower reasoning', e);
    }
  };

  const handleAnalyzeTasks = async (isManual = true) => {
    if (editTasks.length === 0) return;
    if (isManual && showTaskReasoning) {
      setShowTaskReasoning(false);
      return;
    }
    setShowTaskReasoning(true);
    if (Object.keys(taskReasoning).length > 0) return;

    try {
      const res = await fetch(`/api/work-order/${workOrderId}/task-reasoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: editTasks })
      });
      const json = await res.json();
      setTaskReasoning(json);
    } catch (e) {
      console.error('Failed to fetch task reasoning', e);
    }
  };

  const handleAnalyzeMaterials = async (isManual = true) => {
    if (editMaterials.length === 0) return;
    if (isManual && showMaterialReasoning) {
      setShowMaterialReasoning(false);
      return;
    }
    setShowMaterialReasoning(true);
    if (Object.keys(materialReasoning).length > 0) return;

    try {
      const res = await fetch(`/api/work-order/${workOrderId}/material-reasoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: editMaterials })
      });
      const json = await res.json();
      setMaterialReasoning(json);
    } catch (e) {
      console.error('Failed to fetch material reasoning', e);
    }
  };

  const handleAnalyzeContracts = async (isManual = true) => {
    if (!data?.contracts || data.contracts.length === 0) return;
    if (isManual && showContractReasoning) {
      setShowContractReasoning(false);
      return;
    }
    setShowContractReasoning(true);
    if (Object.keys(contractReasoning).length > 0) return;

    try {
      const res = await fetch(`/api/work-order/${workOrderId}/contract-reasoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts: data.contracts })
      });
      const json = await res.json();
      setContractReasoning(json);
    } catch (e) {
      console.error('Failed to fetch contract reasoning', e);
    }
  };

  const enterReview = () => {
    setRawReviewMode(true);
    fetchLookups();
  };

  const handleGenerateMR = async (mat: any) => {
    setGeneratingMR(mat.material);
    try {
      const res = await fetch(`/api/material-reservation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: mat.material,
          quantity: mat.recommended_quantity,
          work_order_id: workOrderId,
          asset_id: data?.work_order?.asset_id,
          asset_name: data?.work_order?.asset_name
        })
      });
      if (!res.ok) throw new Error('MR Generation failed');
      const json = await res.json();
      setMrPreview(json);
    } catch (e: any) {
      console.error(e);
      alert('MR Generation failed');
    } finally {
      setGeneratingMR(null);
    }
  };

  const handleDownloadMR = async () => {
    if (!mrPreview) return;
    setDownloadingDocx(true);
    try {
      const res = await fetch(`/api/work-permit/${mrPreview.mr_number}/download-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permit: { id: mrPreview.mr_number, type: 'MATERIAL RESERVATION' },
          ai_document: mrPreview
        })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mrPreview.mr_number}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadPR = async () => {
    if (!prPreview) return;
    setDownloadingDocx(true);
    try {
      const res = await fetch('/api/purchase-requisition/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prPreview)
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PurchaseRequisition_${prPreview.pr_number}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download PR docx:', e);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleGeneratePR = async (mat: any) => {
    setGeneratingPR(mat.material);
    try {
      const res = await fetch('/api/purchase-requisition/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: mat.material,
          quantity: mat.recommended_quantity || 1,
          work_order_id: workOrderId,
          asset_id: data.work_order?.asset_id,
          asset_name: data.work_order?.asset_name
        })
      });
      if (!res.ok) throw new Error('Generation failed');
      const json = await res.json();
      setPrPreview({ ...json, matName: mat.material, matQty: mat.recommended_quantity || 1 });
    } catch (e) {
      console.error('Failed to generate PR:', e);
      alert('Failed to generate Purchase Requisition.');
    } finally {
      setGeneratingPR(null);
    }
  };

  const [updatingLeadTime, setUpdatingLeadTime] = useState<string | null>(null);
  const handleUpdateLeadTime = async (materialId: string, leadTime: number) => {
    setUpdatingLeadTime(materialId);
    try {
      const res = await fetch(`/api/work-order/${workOrderId}/update-material-lead-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: materialId, lead_time: leadTime })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Failed to update lead time', e);
    } finally {
      setUpdatingLeadTime(null);
    }
  };

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
      <div className={isFullPage ? "min-h-screen flex items-center justify-center bg-slate-50" : "flex items-center justify-center p-20"}>
        <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={24} />
          <span className="text-sm font-bold text-slate-700">Loading Execution Plan...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isClosed = data?.work_order?.work_order_status?.toLowerCase() === 'closed';
  const actualReviewMode = rawReviewMode && !isClosed;
  
  const reviewBanner = actualReviewMode && (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-xs font-bold text-amber-700">
      <Edit3 size={14} /> Review Mode — fields are now editable.
    </div>
  );

  const closedBanner = isClosed && (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl mb-4 text-xs font-black text-slate-600">
      <ShieldCheck size={14} className="text-slate-500" /> READ-ONLY ARCHIVE
    </div>
  );

  let sectionStyle = isClosed ? 'bg-slate-50/50 rounded-xl border border-slate-200 p-5 shadow-sm' : approved ? 'bg-emerald-50 rounded-xl border border-emerald-200 p-5 shadow-sm' : actualReviewMode ? 'bg-white rounded-xl border-2 border-amber-300 p-5 shadow-sm' : 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm';
  let estimatedCostStyle = isClosed ? 'bg-slate-50/50 rounded-xl border border-slate-200 p-6 shadow-sm max-w-sm' : approved ? 'bg-emerald-100 rounded-xl border border-emerald-300 p-6 shadow-sm max-w-sm' : actualReviewMode ? 'bg-amber-50 rounded-xl border-2 border-amber-300 p-6 shadow-sm max-w-sm' : 'bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm max-w-sm';

  return (
    <div className={isFullPage ? "max-w-5xl mx-auto py-8 px-4" : "bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"} style={isFullPage ? {} : { maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-md">
              Class {data.work_order?.work_order_class || 'N/A'}
            </span>
            {(() => {
              const s = (data.work_order?.work_order_status || 'Pending').toLowerCase();
              const cls = s === 'closed'
                ? 'bg-slate-100 text-slate-700'
                : s === 'in-progress' || s === 'approved'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700';
              return (
                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${cls}`}>
                  {data.work_order?.work_order_status || 'Pending'}
                </span>
              );
            })()}
            <h2 className="text-2xl font-black text-slate-900">{workOrderId}</h2>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-slate-800 text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-md">Asset</span>
            {data.work_order.asset_id ? (
              <>
                <span className="text-sm font-black text-slate-700">{data.work_order.asset_id}</span>
                <span className="text-slate-400 text-sm">—</span>
                <span className="text-sm font-semibold text-slate-600">{data.work_order.asset_name}</span>
              </>
            ) : <span className="text-sm text-slate-400 italic">Not Assigned</span>}
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">{data.work_order?.repair_description}</p>
          {isClosed && data.work_order?.key_insights && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
              <Sparkles className="text-indigo-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">AI Performance Insights</h4>
                <p className="text-sm font-medium text-indigo-900 leading-relaxed italic">{data.work_order.key_insights}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isClosed && (
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
              onClick={() => window.print()}
            >
              <Download size={14} /> Download Report
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 shrink-0">
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      <div className={`p-6 ${isFullPage ? '' : 'overflow-y-auto flex-1'} bg-slate-50`}>
        <div className="border-2 border-indigo-100 bg-white rounded-2xl p-6 space-y-6 shadow-sm">
          {closedBanner}
          {reviewBanner}
          
          <div className="grid grid-cols-1 gap-6">
            <div className={sectionStyle}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tasks</h3>
              </div>
              <div className="space-y-3">
                {editTasks.map((task: any, idx: number) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50 items-start">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                            {actualReviewMode ? (
                              <input className="w-full text-xs font-bold text-slate-900 border border-amber-200 rounded-lg px-2 py-1 bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                value={task.task_description || task.task_ref} onChange={e => { const c = [...editTasks]; c[idx] = { ...c[idx], task_description: e.target.value }; setEditTasks(c); }} />
                            ) : (
                              <p className="text-xs font-black text-slate-900">{task.task_description || `Task Ref #${task.task_ref}`}</p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1">Ref: <span className="font-bold text-slate-500">#{task.task_ref}</span></p>
                            {showTaskReasoning && taskReasoning[String(task.task_ref)] && (
                              <div className="mt-2 p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-md text-[11px] text-slate-700 italic flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                                <Brain size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{taskReasoning[String(task.task_ref)]}</span>
                              </div>
                            )}
                        </div>
                    </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manpower */}
              <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="text-blue-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Manpower</h3>
                </div>
                <div className="space-y-3">
                  {editManpower.map((mp: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 truncate">{mp.technician_name || mp.technician_id}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{mp.role_designation} · {mp.discipline_trade}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-md">{mp.service_period}h</span>
                      </div>
                      {showManpowerReasoning && manpowerReasoning[mp.technician_id] && (
                        <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-md text-[11px] text-slate-700 italic flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                          <Brain size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{manpowerReasoning[mp.technician_id]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Materials */}
              <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Box className="text-amber-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Materials</h3>
                </div>
                <div className="space-y-3">
                  {editMaterials.map((mat: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate" title={mat.material}>{mat.material}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">Qty: {mat.recommended_quantity}</span>
                            {mat.available_quantity < mat.recommended_quantity && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-widest rounded border border-rose-100">PR Needed</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <span className="text-xs font-black text-indigo-600">₹{((mat.material_price || 0) * (mat.recommended_quantity || 1)).toLocaleString()}</span>
                           <button 
                             onClick={() => handleGeneratePR(mat)}
                             disabled={generatingPR === mat.material}
                             className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-[9px] font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                           >
                             {generatingPR === mat.material ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                             View AI PR
                           </button>
                        </div>
                      </div>
                      {showMaterialReasoning && materialReasoning[mat.material] && (
                        <div className="mt-2 p-2.5 bg-amber-50/50 border border-amber-100 rounded-md text-[11px] text-slate-700 italic flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                          <Brain size={14} className="text-amber-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{materialReasoning[mat.material]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Work Permits Section */}
            <div className={sectionStyle}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-rose-500" size={20} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Active Work Permits</h3>
                </div>
                <span className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-rose-100">
                  {data.work_permits?.length || 0} Total
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.work_permits && data.work_permits.length > 0 ? (
                  data.work_permits.map((permit: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-rose-200 transition-all group">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 truncate">{permit.id}</p>
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter mt-0.5">{permit.type}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${permit.status?.toLowerCase() === 'available' || permit.status?.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {permit.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-200/50">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Validity</span>
                           <span className="text-[10px] font-bold text-slate-600">{permit.work_permit_open_day || 'Today'} · {permit.work_permit_open_time || '08:00'}</span>
                        </div>
                        <button 
                          onClick={() => handleGeneratePermit(permit.id)}
                          disabled={generatingPermit === permit.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-slate-800 transition-all shadow-sm group-hover:scale-105"
                        >
                          {generatingPermit === permit.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                          View Permit
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 p-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                    <ShieldCheck size={32} className="text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-400">No active permits found for this execution plan.</p>
                  </div>
                )}
              </div>
            </div>

            <div className={estimatedCostStyle}>
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="text-emerald-600" size={18} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Estimated Cost</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cost</span>
                  <span className="text-lg font-black text-emerald-700">₹{(actualReviewMode ? computedCost.total : data.estimated_cost?.total)?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="w-full pt-2 pb-2">
              <div className="flex items-center gap-3">
                {isClosed || approved ? (
                  <button disabled className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-400 rounded-xl border border-slate-200 text-xs font-bold cursor-not-allowed">
                    <ShieldCheck size={15} /> Approved & Archived
                  </button>
                ) : (
                  <button onClick={handleApprove} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100">
                    <CheckCircle2 size={15} /> Approve Work Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PR Preview Modal */}
      {prPreview && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Purchase Requisition</h3>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{prPreview.pr_number}</p>
                </div>
              </div>
              <button onClick={() => setPrPreview(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</p>
                    <p className="text-sm font-bold text-slate-900">{prPreview.matName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                    <p className="text-sm font-black text-slate-900">{prPreview.matQty} Units</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Budget</p>
                    <p className="text-sm font-black text-emerald-600">{prPreview.estimated_budget}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Urgency</p>
                    <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md">{prPreview.delivery_urgency}</span>
                  </div>
                </div>

                <section>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500" /> Technical Justification (Rule 12 Compliant)
                  </h4>
                  <div className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{prPreview.justification}</p>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Technical Specifications</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{prPreview.technical_specifications}</p>
                  </section>
                  <section>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Vendor Recommendations</h4>
                    <ul className="space-y-2">
                      {prPreview.vendor_recommendations?.map((v: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                          {v}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Generated for Vedanta Jharsuguda</span>
              </div>
              <button 
                onClick={handleDownloadPR}
                disabled={downloadingDocx}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {downloadingDocx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Download as Word (.docx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
