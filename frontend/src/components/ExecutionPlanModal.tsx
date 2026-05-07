'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, X, Briefcase, Users, Box, CheckCircle2, ShieldCheck, Calculator, Trash2, Plus, Edit3, FileText, Mail, BookOpen, Brain } from 'lucide-react';

interface ExecutionPlanModalProps {
  workOrderId: string;
  onClose: () => void;
}

const ModalContent: React.FC<{ workOrderId: string; onClose: () => void }> = ({ workOrderId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [generatingPermit, setGeneratingPermit] = useState<string | null>(null);
  const [previewPermit, setPreviewPermit] = useState<any>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [generatingMR, setGeneratingMR] = useState<string | null>(null);
  const [generatingPR, setGeneratingPR] = useState<string | null>(null);
  const [mrPreview, setMrPreview] = useState<any>(null);
  const [prPreview, setPrPreview] = useState<any>(null);
  const [manpowerReasoning, setManpowerReasoning] = useState<Record<string, string>>({});
  const [loadingReasoning, setLoadingReasoning] = useState(false);
  const [showManpowerReasoning, setShowManpowerReasoning] = useState(true);
  const [taskReasoning, setTaskReasoning] = useState<Record<string, string>>({});
  const [loadingTaskReasoning, setLoadingTaskReasoning] = useState(false);
  const [showTaskReasoning, setShowTaskReasoning] = useState(true);
  const [materialReasoning, setMaterialReasoning] = useState<Record<string, string>>({});
  const [loadingMatReasoning, setLoadingMatReasoning] = useState(false);
  const [showMaterialReasoning, setShowMaterialReasoning] = useState(true);
  const [contractReasoning, setContractReasoning] = useState<Record<string, string>>({});
  const [loadingContractReasoning, setLoadingContractReasoning] = useState(false);
  const [showContractReasoning, setShowContractReasoning] = useState(true);

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
        // Restore approved state from persisted status
        const woStatus = json.work_order?.work_order_status?.toLowerCase();
        if (woStatus === 'in-progress') setApproved(true);
      } catch (e) {
        console.error('Failed to fetch execution plan:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workOrderId]);

  useEffect(() => {
    if (data && !loading) {
      handleAnalyzeTasks(false);
      handleAnalyzeAssignment(false);
      handleAnalyzeMaterials(false);
      handleAnalyzeContracts(false);
    }
  }, [data?.id, loading]);

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

  const handleApprove = async () => {
    try {
      await fetch(`/api/work-orders/${workOrderId}/approve`, { method: 'POST' });
      setApproved(true);
      setReviewMode(false);
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

    setLoadingReasoning(true);
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
    } finally {
      setLoadingReasoning(false);
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

    setLoadingTaskReasoning(true);
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
    } finally {
      setLoadingTaskReasoning(false);
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

    setLoadingMatReasoning(true);
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
    } finally {
      setLoadingMatReasoning(false);
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

    setLoadingContractReasoning(true);
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
    } finally {
      setLoadingContractReasoning(false);
    }
  };

  const enterReview = () => {
    setReviewMode(true);
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
      // Reuse the docx download logic, backend can handle general JSON-to-Docx
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
      alert('Failed to generate Purchase Requisition. Please check your connection.');
    } finally {
      setGeneratingPR(null);
    }
  };

  const openPermitPDF = (data: any, overrideStart?: string, overrideEnd?: string) => {
    const { permit, work_order: wo, manpower, materials, ai_document: ai } = data;
    const riskColor = ai.risk_level === 'HIGH' ? '#dc2626' : ai.risk_level === 'MEDIUM' ? '#d97706' : '#16a34a';
    const issuedStr  = overrideStart || `${permit.work_permit_open_day || ''} ${permit.work_permit_open_time || ''}`.trim();
    const expiresStr = overrideEnd   || `${permit.work_permit_end_day  || ''} ${permit.work_permit_end_time  || ''}`.trim();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Work Permit — ${permit.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #0f172a; background: #fff; font-size: 12px; }
    .page { max-width: 900px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; }
    .logo-block h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .logo-block p { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .permit-meta { text-align: right; }
    .permit-meta .permit-id { font-size: 20px; font-weight: 900; color: #4f46e5; }
    .permit-meta p { font-size: 10px; color: #64748b; font-weight: 600; margin-top: 2px; }
    .risk-badge { display: inline-block; padding: 4px 14px; border-radius: 999px; font-weight: 900; font-size: 11px; color: white; background: ${riskColor}; margin-top: 6px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .info-block .label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
    .info-block .value { font-size: 12px; font-weight: 700; color: #0f172a; }
    ul { list-style: none; }
    ul li { padding: 4px 0; padding-left: 16px; position: relative; font-weight: 500; color: #334155; }
    ul li::before { content: '→'; position: absolute; left: 0; color: #4f46e5; font-weight: 700; }
    .table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .table th { background: #0f172a; color: white; padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
    .table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
    .table tr:hover td { background: #f8fafc; }
    .highlight-box { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .highlight-box p { font-weight: 600; color: #92400e; font-size: 11px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 24px; }
    .sig-box { border-top: 2px solid #0f172a; padding-top: 8px; }
    .sig-box .role { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    .sig-box .name { font-size: 11px; font-weight: 700; margin-top: 4px; }
    .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; font-weight: 600; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-block">
      <h1>Vedanta Jharsuguda</h1>
      <p>Aluminum Smelter — Maintenance Division</p>
      <p style="margin-top:6px; color:#0f172a; font-weight:800">${ai.permit_type_full || permit.type} PERMIT</p>
    </div>
    <div class="permit-meta">
      <div class="permit-id">${permit.id}</div>
      <p>Issued: ${issuedStr || '—'}</p>
      <p>Expires: ${expiresStr || '—'}</p>
      <div class="risk-badge">${ai.risk_level} RISK</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Work Scope &amp; Location</div>
    <div class="grid-2">
      <div class="info-block" style="grid-column:span 2">
        <div class="label">Scope of Work</div>
        <div class="value" style="font-weight:600; line-height:1.6">${ai.work_scope}</div>
      </div>
      <div class="info-block">
        <div class="label">Work Order</div>
        <div class="value">${wo.id} — Class ${wo.work_order_class}</div>
      </div>
      <div class="info-block">
        <div class="label">Asset / Location</div>
        <div class="value">${wo.asset_name || 'N/A'} · ${wo.location || 'N/A'}</div>
      </div>
      <div class="info-block">
        <div class="label">Scheduled Window</div>
        <div class="value">${issuedStr || '—'} → ${expiresStr || '—'}</div>
      </div>
      <div class="info-block">
        <div class="label">Asset Criticality</div>
        <div class="value">${wo.criticality || 'N/A'}</div>
      </div>
    </div>
  </div>

  <div class="highlight-box">
    <p>⚠️ Risk Justification: ${ai.risk_justification}</p>
  </div>

  <div class="grid-2">
    <div class="section">
      <div class="section-title">Hazard Identification</div>
      <ul>${(ai.hazard_identification || []).map((h: string) => `<li>${h}</li>`).join('')}</ul>
    </div>
    <div class="section">
      <div class="section-title">Safety Controls</div>
      <ul>${(ai.safety_controls || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
    </div>
    <div class="section">
      <div class="section-title">PPE Requirements</div>
      <ul>${(ai.ppe_requirements || []).map((p: string) => `<li>${p}</li>`).join('')}</ul>
    </div>
    <div class="section">
      <div class="section-title">Environmental Controls</div>
      <ul>${(ai.environmental_controls || []).map((e: string) => `<li>${e}</li>`).join('')}</ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Isolation &amp; Lockout/Tagout Requirements</div>
    <div class="info-block"><div class="value" style="font-weight:600">${ai.isolation_requirements}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Emergency Procedure</div>
    <div class="info-block" style="border-color:#fca5a5; background:#fff5f5"><div class="value" style="color:#991b1b">${ai.emergency_procedure}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Special Instructions &amp; Competency Requirements</div>
    <div class="grid-2">
      <div class="info-block"><div class="label">Special Instructions</div><div class="value" style="font-weight:500">${ai.special_instructions}</div></div>
      <div class="info-block"><div class="label">Competency Requirements</div><div class="value" style="font-weight:500">${ai.competency_requirements}</div></div>
    </div>
  </div>

  ${manpower.length > 0 ? `
  <div class="section">
    <div class="section-title">Assigned Personnel</div>
    <table class="table">
      <thead><tr><th>Name</th><th>Role</th><th>Discipline</th><th>Hours</th></tr></thead>
      <tbody>${manpower.map((m: any) => `<tr><td>${m.name}</td><td>${m.role_designation}</td><td>${m.discipline_trade}</td><td>${m.technician_service_period}h</td></tr>`).join('')}</tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Authorization Conditions</div>
    <div class="info-block" style="border-color:#a5b4fc; background:#eef2ff"><div class="value" style="color:#3730a3">${ai.authorization_conditions}</div></div>
  </div>

  <div class="sig-grid">
    <div class="sig-box"><div class="role">Permit Requestor</div><div class="name">&nbsp;</div><p style="font-size:9px;color:#94a3b8;margin-top:4px">Signature &amp; Date</p></div>
    <div class="sig-box"><div class="role">Area Supervisor</div><div class="name">&nbsp;</div><p style="font-size:9px;color:#94a3b8;margin-top:4px">Signature &amp; Date</p></div>
    <div class="sig-box"><div class="role">HSE Officer</div><div class="name">&nbsp;</div><p style="font-size:9px;color:#94a3b8;margin-top:4px">Signature &amp; Date</p></div>
  </div>

  <div class="footer">
    <span>Generated by Vedanta Maintenance Intelligence Platform · AI-Assisted</span>
    <span>Permit ID: ${permit.id} · Work Order: ${wo.id}</span>
  </div>
</div>
<script>window.onload = () => window.print();<\/script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
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

  const isClosed = data?.work_order?.work_order_status?.toLowerCase() === 'closed';
  
  let sectionStyle = 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm';
  let estimatedCostStyle = 'bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm max-w-sm';

  if (isClosed) {
    sectionStyle = 'bg-slate-100 rounded-xl border border-slate-300 p-5 shadow-sm opacity-80';
    estimatedCostStyle = 'bg-slate-100 rounded-xl border border-slate-300 p-6 shadow-sm max-w-sm opacity-80';
  } else if (approved) {
    sectionStyle = 'bg-emerald-50 rounded-xl border border-emerald-200 p-5 shadow-sm';
    estimatedCostStyle = 'bg-emerald-100 rounded-xl border border-emerald-300 p-6 shadow-sm max-w-sm';
  } else if (reviewMode) {
    sectionStyle = 'bg-white rounded-xl border-2 border-amber-300 p-5 shadow-sm';
    estimatedCostStyle = 'bg-amber-50 rounded-xl border-2 border-amber-300 p-6 shadow-sm max-w-sm';
  }

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
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WO Open Date:</span>
              <span className="text-xs font-bold text-slate-600">{data.work_order?.work_order_open_day || '—'}</span>
            </div>
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
                    const dColor = hours <= 8 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : hours <= 16 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200';
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
                          {(task.work_order_task_item_open_day || task.work_order_task_item_open_time) && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              <span className="font-bold text-slate-500">Start:</span> {task.work_order_task_item_open_day || '—'} {task.work_order_task_item_open_time || ''}
                              {task.work_order_task_item_finish_time && (
                                <span className="ml-2">
                                  <span className="font-bold text-slate-500">End:</span>{' '}
                                  {task.work_order_task_item_finish_day || task.work_order_task_item_open_day || '—'}{' '}
                                  {task.work_order_task_item_finish_time}
                                </span>
                              )}
                            </p>
                          )}
                          {showTaskReasoning && taskReasoning[String(task.task_ref)] && (
                            <div className="mt-2 p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-md text-[11px] text-slate-700 italic flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                              <Brain size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{taskReasoning[String(task.task_ref)]}</span>
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black whitespace-nowrap shrink-0 ${dColor}`}>
                          {reviewMode ? (
                            <input type="number" min={1} className="w-12 text-center bg-transparent focus:outline-none" value={hours}
                              onChange={e => { const c = [...editTasks]; c[idx] = { ...c[idx], estimated_duration_hours: Number(e.target.value) }; setEditTasks(c); }} />
                          ) : hours}h estimated
                        </div>
                        {reviewMode && (
                          <button onClick={() => setEditTasks(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
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
                              <button onClick={() => setEditManpower(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shrink-0 ${isEngineer ? 'text-indigo-600 bg-indigo-100' : 'text-blue-600 bg-blue-50'}`}>{mp.service_period}h</span>
                          )}
                        </div>
                        {showManpowerReasoning && manpowerReasoning[mp.technician_id] && (
                          <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-md text-[11px] text-slate-700 italic flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                            <Brain size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{manpowerReasoning[mp.technician_id]}</span>
                          </div>
                        )}
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
                  {editMaterials.map((mat: any, idx: number) => {
                    const hasStock = (mat.available_quantity || 0) >= (mat.recommended_quantity || 0);
                    return (
                      <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-slate-700 truncate flex-1" title={mat.material}>{mat.material}</p>
                          {hasStock && !reviewMode && (
                            <button
                              onClick={() => handleGenerateMR(mat)}
                              disabled={generatingMR === mat.material}
                              className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[8px] font-black rounded-md border border-amber-200 transition-colors flex items-center gap-1 shrink-0 ml-2"
                            >
                              {generatingMR === mat.material ? <Loader2 size={8} className="animate-spin" /> : <Box size={8} />}
                              MATERIAL MR
                            </button>
                          )}
                          {!hasStock && !reviewMode && (
                            <button
                              onClick={() => handleGeneratePR(mat)}
                              disabled={generatingPR === mat.material}
                              className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[8px] font-black rounded-md border border-indigo-200 transition-colors flex items-center gap-1 shrink-0 ml-2"
                            >
                              {generatingPR === mat.material ? <Loader2 size={8} className="animate-spin" /> : <Calculator size={8} />}
                              CREATE PR
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500">Available: <strong className="text-slate-800">{mat.available_quantity || 0}</strong></span>
                          {reviewMode ? (
                            <div className="flex items-center gap-1">
                              <input type="number" min={1} className="w-14 text-xs border border-amber-200 rounded px-1 py-0.5 bg-amber-50 text-center focus:outline-none"
                                value={mat.recommended_quantity}
                                onChange={e => { const c = [...editMaterials]; c[idx] = { ...c[idx], recommended_quantity: Number(e.target.value) }; setEditMaterials(c); }} />
                              <button onClick={() => setEditMaterials(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500">Required: <strong className={hasStock ? 'text-emerald-600' : 'text-amber-600'}>{mat.recommended_quantity || 0}</strong></span>
                          )}
                        </div>
                        {showMaterialReasoning && materialReasoning[mat.material] && (
                          <div className="mt-2 p-2.5 bg-amber-50/50 border border-amber-100 rounded-md text-[11px] text-slate-700 italic flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                            <Brain size={14} className="text-amber-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{materialReasoning[mat.material]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  <Briefcase className="text-indigo-500" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Contracts</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{data.contracts?.length || 0}</span>
                </div>
                <div className="space-y-3">
                  {data.contracts?.map((c: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/30 transition-colors flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700 truncate">{c.contract}</p>
                        {c.type && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded shrink-0">{c.type}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-medium">Total: <strong className="text-slate-800">₹{c.total_value?.toLocaleString() || 0}</strong></span>
                        <span className="text-slate-500 font-medium">Estimated: <strong className="text-slate-800">₹{c.recommended_value?.toLocaleString() || 0}</strong></span>
                      </div>
                      {showContractReasoning && contractReasoning[c.contract] && (
                        <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-md text-[11px] text-slate-700 italic flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                          <Brain size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{contractReasoning[c.contract]}</span>
                        </div>
                      )}
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
                  {data.work_permits?.map((wp: any, idx: number) => {
                    // ── shared date comparator (DD-MM-YY + HH:MM → numeric) ──
                    const toNum = (d: string, t: string) => {
                      const [dd, mm, yy] = (d || '00-00-00').split('-').map(Number);
                      const [hh, mi]     = (t || '00:00').split(':').map(Number);
                      return (2000 + yy) * 1e8 + mm * 1e6 + dd * 1e4 + hh * 100 + mi;
                    };
                    // earliest task start
                    const firstTask = (data.tasks || []).reduce((acc: any, t: any) => {
                      const day  = t.work_order_task_item_open_day  || '';
                      const time = t.work_order_task_item_open_time || '';
                      if (!day && !time) return acc;
                      if (!acc) return { day, time };
                      return toNum(day, time) < toNum(acc.day, acc.time) ? { day, time } : acc;
                    }, null);
                    // latest task finish
                    const lastTask = (data.tasks || []).reduce((acc: any, t: any) => {
                      if (!t.work_order_task_item_finish_time) return acc;
                      const day  = t.work_order_task_item_finish_day || t.work_order_task_item_open_day || '';
                      const time = t.work_order_task_item_finish_time;
                      if (!acc) return { day, time };
                      return toNum(day, time) > toNum(acc.day, acc.time) ? { day, time } : acc;
                    }, null);
                    const permitStart = firstTask
                      ? `${firstTask.day} ${firstTask.time}`.trim()
                      : `${wp.work_permit_open_day || ''} ${wp.work_permit_open_time || ''}`.trim();
                    const permitEnd = lastTask
                      ? `${lastTask.day} ${lastTask.time}`.trim()
                      : `${wp.work_permit_end_day || ''} ${wp.work_permit_end_time || ''}`.trim();
                    return (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-purple-50/30 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="text-xs font-black text-slate-900 truncate pr-2" title={wp.description}>{wp.description}</p>
                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded shrink-0 ${wp.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {wp.status || 'Unavailable'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase tracking-widest rounded">{wp.type}</span>
                        <button
                          onClick={() => handleGeneratePermit(wp.id, permitStart, permitEnd)}
                          disabled={generatingPermit === wp.id}
                          className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-black rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait border border-blue-200"
                          title="Click to download AI-generated Word permit"
                        >
                          {generatingPermit === wp.id ? (
                            <Loader2 size={9} className="animate-spin" />
                          ) : (
                            <span className="text-[10px] font-black leading-none">W</span>
                          )}
                          {wp.id}
                        </button>
                        {generatingPermit === wp.id && (
                          <span className="text-[9px] text-indigo-500 font-bold animate-pulse">Generating PDF...</span>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/50 space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Start: <span className="text-slate-600 font-black">{permitStart || '—'}</span>
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          End: <span className="text-slate-600 font-black">{permitEnd || '—'}</span>
                        </p>
                      </div>
                    </div>
                    );
                  })}
                  {(!data.work_permits || data.work_permits.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No permits assigned.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Estimated Cost */}
            <div className="w-full">
              <div className={estimatedCostStyle}>
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
                {isClosed || approved ? (
                  <>
                    <button disabled className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-400 rounded-xl border border-slate-200 text-xs font-bold cursor-not-allowed">
                      <ShieldCheck size={15} /> Review
                    </button>
                    <button disabled className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-400 rounded-xl border border-slate-200 text-xs font-bold cursor-not-allowed">
                      <CheckCircle2 size={15} /> {approved ? 'Approved' : 'Approve Work Order'}
                    </button>
                  </>
                ) : (
                  <>
                    {reviewMode ? (
                      <button onClick={() => setReviewMode(false)} className="flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 text-xs font-bold hover:bg-amber-200 transition-all">
                        <ShieldCheck size={15} /> Exit Review Mode
                      </button>
                    ) : (
                      <button onClick={enterReview} className="flex items-center gap-2 px-5 py-3 bg-white text-slate-700 rounded-xl border border-slate-300 text-xs font-bold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
                        <ShieldCheck size={15} className="text-slate-500" /> Review
                      </button>
                    )}
                    <button onClick={handleApprove} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100">
                      <CheckCircle2 size={15} /> Approve Work Order
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      {/* Permit Preview Pop-up */}
      {previewPermit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 text-white font-black text-xl">W</div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Work Permit Preview</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{previewPermit.permit.id} • {previewPermit.ai_document.permit_type_full}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadDocx}
                  disabled={downloadingDocx}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {downloadingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Download Word Document
                </button>
                <button 
                  onClick={() => setPreviewPermit(null)}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-white">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Risk Level</div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black w-fit ${
                    previewPermit.ai_document.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-700' : 
                    previewPermit.ai_document.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {previewPermit.ai_document.risk_level} RISK
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scheduled Window</div>
                  <div className="text-xs font-bold text-slate-900">
                    {previewPermit.permit.work_permit_open_day} {previewPermit.permit.work_permit_open_time} → {previewPermit.permit.work_permit_end_day} {previewPermit.permit.work_permit_end_time}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Work Scope</h4>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">{previewPermit.ai_document.work_scope}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Location Details</h4>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">{previewPermit.ai_document.location_details}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Hazard Identification</h4>
                <div className="grid grid-cols-2 gap-3">
                  {previewPermit.ai_document.hazard_identification.map((h: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Safety Controls</h4>
                <div className="grid grid-cols-2 gap-3">
                  {previewPermit.ai_document.safety_controls.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                      <ShieldCheck size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-bold text-slate-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Reservation Preview */}
      {mrPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 text-white font-black text-xl">M</div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Material Reservation</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {mrPreview.mr_number} • WO: {workOrderId} • Asset: {data.work_order.asset_id} ({data.work_order.asset_name})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDownloadMR}
                    disabled={downloadingDocx}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-100 disabled:opacity-50"
                  >
                    {downloadingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Download Word Document
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`Material Reservation: ${mrPreview.mr_number}`);
                      const body = encodeURIComponent(`Material Reservation Details:\n\nMR Number: ${mrPreview.mr_number}\nType: ${mrPreview.reservation_type}\nValidity: ${mrPreview.validity_period}\n\nTechnical Specifications:\n${mrPreview.material_specifications}`);
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    }}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black transition-all shadow-lg shadow-blue-100"
                  >
                    <Mail size={12} />
                    Email-Material Reservation
                  </button>
                </div>
                <button 
                  onClick={() => setMrPreview(null)}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Editable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6 bg-white">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reservation Type</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900"
                    value={mrPreview.reservation_type}
                    onChange={e => setMrPreview({...mrPreview, reservation_type: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validity Period</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900"
                    value={mrPreview.validity_period}
                    onChange={e => setMrPreview({...mrPreview, validity_period: e.target.value})} />
                </div>
              </div>

              {[
                { label: 'Material Specifications', key: 'material_specifications' },
                { label: 'Storage Conditions', key: 'storage_conditions' },
                { label: 'Handling Instructions', key: 'handling_instructions' },
                { label: 'Criticality Impact', key: 'criticality_impact' },
                { label: 'Warehouse Instructions', key: 'warehouse_instructions' }
              ].map(sec => (
                <div key={sec.key} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{sec.label}</label>
                  <textarea 
                    rows={2}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                    value={mrPreview[sec.key]}
                    onChange={e => setMrPreview({...mrPreview, [sec.key]: e.target.value})}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Purchase Requisition Preview */}
      {prPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 text-white font-black text-xl">P</div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Purchase Requisition</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {prPreview.pr_number} • Material: {prPreview.matName} ({prPreview.matQty} units)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDownloadPR}
                    disabled={downloadingDocx}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {downloadingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Download PR
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`Purchase Requisition: ${prPreview.pr_number}`);
                      const body = encodeURIComponent(`Purchase Requisition Details:\n\nPR Number: ${prPreview.pr_number}\nMaterial: ${prPreview.matName}\nJustification:\n${prPreview.justification}`);
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    }}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black transition-all shadow-lg shadow-blue-100"
                  >
                    <Mail size={12} />
                    Email-Purchase Requisition
                  </button>
                </div>
                <button 
                  onClick={() => setPrPreview(null)}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6 bg-white">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requester</div>
                  <div className="text-xs font-bold text-slate-900">{prPreview.requester_department}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Budget Est.</div>
                  <div className="text-xs font-bold text-slate-900">{prPreview.estimated_budget}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Urgency</div>
                  <div className="text-xs font-bold text-amber-700">{prPreview.delivery_urgency}</div>
                </div>
              </div>

              {[
                { label: 'Technical Justification', key: 'justification' },
                { label: 'Technical Specifications', key: 'technical_specifications' },
                { label: 'Inspection Requirements', key: 'inspection_requirements' },
                { label: 'Approval Workflow', key: 'approval_workflow' }
              ].map(sec => (
                <div key={sec.key} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{sec.label}</label>
                  <div className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {prPreview[sec.key]}
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor Recommendations</label>
                <div className="flex flex-wrap gap-2">
                  {prPreview.vendor_recommendations?.map((v: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
