'use client';
import React, { useState, useEffect } from 'react';
import { Activity, X, Loader2, CheckCircle2, ShieldAlert, Wrench, Trash2, Plus } from 'lucide-react';

interface DiagnosisReviewModalProps {
  workOrderId: string;
  assetId: string;
  onClose: (approved?: boolean) => void;
}

const DiagnosisReviewModal: React.FC<DiagnosisReviewModalProps> = ({ workOrderId, assetId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [diagnosis, setDiagnosis] = useState<{
    probable_cause: string, 
    suggested_tasks: string[], 
    reported_issue?: string,
    asset_details?: { id: string, name: string, location: string, criticality: string }
  } | null>(null);
  const [editedTasks, setEditedTasks] = useState<string[]>([]);

  useEffect(() => {
    const fetchDiagnosis = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/work-order/${workOrderId}/diagnose`, { method: 'POST' });
        const data = await res.json();
        setDiagnosis(data);
        setEditedTasks(data.suggested_tasks || []);
      } catch (error) {
        console.error("Diagnosis failed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnosis();
  }, [workOrderId]);

  const handleAddTask = () => setEditedTasks([...editedTasks, ""]);
  const handleRemoveTask = (idx: number) => setEditedTasks(editedTasks.filter((_, i) => i !== idx));
  const handleTaskChange = (idx: number, val: string) => {
    const next = [...editedTasks];
    next[idx] = val;
    setEditedTasks(next);
  };

  const handleApprove = async (assetId: string) => {
    console.log("[DiagnosisReviewModal] Approving WO:", workOrderId, "with Asset:", assetId);
    setApproving(true);
    try {
      const res = await fetch(`/api/work-order/${workOrderId}/approve-diagnosis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tasks: editedTasks.filter(t => t.trim() !== ""),
          asset_id: assetId
        })
      });
      console.log("[DiagnosisReviewModal] Response received:", res.status);
      if (res.ok) {
        console.log("[DiagnosisReviewModal] Approval successful!");
        onClose(true);
      } else {
        const error = await res.text();
        console.error("[DiagnosisReviewModal] Approval failed:", error);
        alert("Failed to release work order: " + error);
        setApproving(false);
      }
    } catch (error) {
      console.error("[DiagnosisReviewModal] Network error:", error);
      alert("Network error during release.");
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => onClose()} />
      <div className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-100">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Anomaly Diagnosis</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Analysis Queue: {workOrderId}</p>
            </div>
          </div>
          <button onClick={() => onClose()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-rose-600" size={40} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">AI is analyzing failure patterns...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Asset Info */}
              {diagnosis?.asset_details && (
                <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">Asset Technical Info</h4>
                      <p className="text-sm font-bold text-slate-900">{diagnosis.asset_details.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">ID</p>
                      <p className="text-[10px] font-black text-slate-900">{diagnosis.asset_details.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                      <p className="text-[10px] font-black text-slate-900">{diagnosis.asset_details.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Criticality</p>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                        diagnosis.asset_details.criticality === 'High' ? 'bg-rose-100 text-rose-600' : 
                        diagnosis.asset_details.criticality === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {diagnosis.asset_details.criticality}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {/* Reported Issue */}
              <div className="bg-slate-100/50 p-6 rounded-2xl border border-slate-200/50">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-slate-500" />
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Issue Reported</h3>
                </div>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {diagnosis?.reported_issue || "No description provided."}
                </p>
              </div>

              {/* Probable Cause */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert size={16} className="text-rose-600" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Probable Root Cause</h3>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                  "{diagnosis?.probable_cause}"
                </p>
              </div>

              {/* Tasks Review */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-indigo-600" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommended Actions</h3>
                  </div>
                  <button 
                    onClick={handleAddTask}
                    className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={12} /> Add Task
                  </button>
                </div>

                <div className="space-y-3">
                  {editedTasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <div className="flex-1 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm focus-within:border-indigo-300 transition-all">
                        <span className="text-[10px] font-black text-slate-300">{i + 1}</span>
                        <input 
                          value={task}
                          onChange={(e) => handleTaskChange(i, e.target.value)}
                          className="w-full text-sm font-medium text-slate-700 bg-transparent focus:outline-none"
                          placeholder="Describe the corrective task..."
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveTask(i)}
                        className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium">
            Once approved, this order moves to the active <span className="font-bold text-indigo-600">Pending</span> list.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => onClose()}
              className="px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleApprove(assetId)}
              disabled={loading || approving || editedTasks.length === 0}
              style={{
                backgroundColor: approving ? '#e2e8f0' : '#4f46e5',
                color: approving ? '#94a3b8' : '#ffffff',
                cursor: approving ? 'not-allowed' : 'pointer',
                opacity: (loading || approving || editedTasks.length === 0) ? 0.6 : 1
              }}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-100"
            >
              {approving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Approve & Release
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisReviewModal;
