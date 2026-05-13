'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import KPIStats from '@/components/KPIStats';

import ChatPanel from '@/components/ChatPanel';
import Header from '@/components/Header';
import DrilldownView from '@/components/DrilldownView';
import LoginPage from '@/components/LoginPage';
import MaintenanceSchedule from '@/components/MaintenanceSchedule';
import AssetView from '@/components/AssetView';
import SearchView from '@/components/SearchView';
import AIInsightsCard from '@/components/AIInsightsCard';
import DiagnosticView from '@/components/DiagnosticView';
import { useStore } from '@/store/useStore';
import { BellRing, ArrowRight, List, Calendar as CalendarIcon, X, AlertTriangle } from 'lucide-react';

export default function Home() {
  const { setKPIs, setWorkOrders, setAssets, activeKpi, setActiveKpi, setSearchQuery, activeTab, isAuthenticated } = useStore();
  const [autoPilotMode, setAutoPilotMode] = useState<'schedule' | 'list'>('list');
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [pendingPrs, setPendingPrs] = useState<any[]>([]);
  const [criticalOos, setCriticalOos] = useState<any[]>([]);
  const [obsolescenceData, setObsolescenceData] = useState<any[]>([]);
  const [showPrModal, setShowPrModal] = useState(false);
  const [showOosModal, setShowOosModal] = useState(false);
  const [showObsolescenceModal, setShowObsolescenceModal] = useState(false);
  const [selectedPr, setSelectedPr] = useState<any>(null);
  const [generatingPr, setGeneratingPr] = useState<string | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const handleViewPr = async (materialName: string, id: string) => {
    setGeneratingPr(id);
    try {
      const res = await fetch('/api/purchase-requisition/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: materialName,
          quantity: 5,
          work_order_id: `WO-PR-${id}`,
          asset_id: "ASSET-GENERIC",
          asset_name: "Smelter Component"
        })
      });
      if (!res.ok) throw new Error('Generation failed');
      const json = await res.json();
      setSelectedPr({ ...json, matName: materialName, matQty: 5 });
    } catch (e) {
      console.error('Failed to generate PR:', e);
      alert('Failed to generate AI Purchase Requisition.');
    } finally {
      setGeneratingPr(null);
    }
  };

  const handleDownloadPr = async () => {
    if (!selectedPr) return;
    setDownloadingDocx(true);
    try {
      const res = await fetch('/api/purchase-requisition/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedPr)
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PurchaseRequisition_${selectedPr.pr_number}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download PR docx:', e);
    } finally {
      setDownloadingDocx(false);
    }
  };


  useEffect(() => {
    if (activeKpi && !['search', 'assets', 'maintenance-auto-pilot', 'work-instruction-coach', 'diagnostic'].includes(activeKpi)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeKpi]);

  useEffect(() => {
    // Reset mode when activeKpi changes
    if (activeKpi === 'maintenance-auto-pilot') {
      setAutoPilotMode('list');
    }
  }, [activeKpi]);

  const fetchInventorySummary = async () => {
    try {
      const res = await fetch('/api/inventory/summary');
      if (res.ok) setInventorySummary(await res.json());
    } catch (e) { console.error("Error fetching inventory summary", e); }
  };

  const fetchPendingPrs = async () => {
    try {
      const res = await fetch('/api/inventory/pending-prs');
      if (res.ok) setPendingPrs(await res.json());
    } catch (e) { console.error("Error fetching PRs", e); }
  };

  const fetchCriticalOos = async () => {
    try {
      const res = await fetch('/api/inventory/critical-spares-oos');
      if (res.ok) setCriticalOos(await res.json());
    } catch (e) { console.error("Error fetching OOS spares", e); }
  };

  const fetchObsolescenceData = async () => {
    try {
      const res = await fetch('/api/inventory/obsolescence');
      if (res.ok) setObsolescenceData(await res.json());
    } catch (e) { console.error("Error fetching obsolescence data", e); }
  };

  useEffect(() => {
    if (activeTab === 'Inventory Status') {
      fetchInventorySummary();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const res = await fetch('/api/kpis');
        if (res.ok) {
          const data = await res.json();
          console.log("[Stage 3] KPI Data Fetched Successfully");
          setKPIs(data);
        }
      } catch (error) {
        console.error('[Stage 3] Error fetching KPIs:', error);
      }
    };

    const fetchWorkOrders = async () => {
      try {
        const res = await fetch('/api/work-orders');
        if (res.ok) {
          const data = await res.json();
          console.log("[Stage 4] Work Order Data Fetched Successfully");
          setWorkOrders(data || []);
        }
      } catch (error) {
        console.error('[Stage 4] Error fetching Work Orders:', error);
      }
    };

    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/assets');
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    fetchKPIs();
    fetchWorkOrders();
    fetchAssets();

    const ws = new WebSocket('ws://127.0.0.1:8000/ws/kpis');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setKPIs(data);
      } catch (error) {
        console.error('WebSocket parse error:', error);
      }
    };

    return () => ws.close();
  }, [setKPIs, setWorkOrders]);

  const handleKpiClick = (name: string) => {
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/%/g, '');
    console.log(`[Stage 5] KPI Clicked: ${name} (Slug: ${slug})`);
    setActiveKpi(activeKpi === slug ? null : slug); // Toggle
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Asset Info':
        return <AssetView onClose={() => {}} />; // Pinned view
      case 'Inventory Status':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto">
             <div className="flex flex-col px-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Inventory & Procurement</h2>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-2">Material Lead-times • Stock Levels • PR Status</p>
             </div>
             <div className="grid grid-cols-4 gap-6">
                {/* Inventory KPIs */}
                <div className="bg-white/60 backdrop-blur-md p-8 rounded-[40px] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Inventory Value</p>
                   <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                     {inventorySummary && inventorySummary.total_value_inr !== undefined 
                       ? `₹${(inventorySummary.total_value_inr / 1e7).toFixed(1)} Cr` 
                       : "₹—"}
                   </h3>
                </div>
                <div 
                  onClick={() => { fetchPendingPrs(); setShowPrModal(true); }}
                  className="bg-white/60 backdrop-blur-md p-8 rounded-[40px] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group cursor-pointer hover:border-indigo-300 transition-all active:scale-95"
                >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pending PRs</p>
                   <h3 className="text-4xl font-black text-indigo-600 tracking-tighter">{inventorySummary?.pending_pr_count ?? "—"}</h3>
                   <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                     View Details <ArrowRight size={10} />
                   </div>
                </div>
                <div 
                  onClick={() => { fetchCriticalOos(); setShowOosModal(true); }}
                  className="bg-white/60 backdrop-blur-md p-8 rounded-[40px] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group cursor-pointer hover:border-rose-300 transition-all active:scale-95"
                >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/10 transition-colors" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Material Nearing Safety Stock</p>
                   <h3 className="text-4xl font-black text-rose-600 tracking-tighter">{inventorySummary?.critical_oos_count ?? "—"}</h3>
                   <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-rose-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                     View Details <ArrowRight size={10} />
                   </div>
                </div>
                <div 
                  onClick={() => { fetchObsolescenceData(); setShowObsolescenceModal(true); }}
                  className="bg-white/60 backdrop-blur-md p-8 rounded-[40px] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group cursor-pointer hover:border-amber-300 transition-all active:scale-95"
                >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Obsolescence Risk</p>
                   <h3 className="text-4xl font-black text-amber-600 tracking-tighter">{inventorySummary?.obsolescence_count ?? "—"}</h3>
                   <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                     View Details <ArrowRight size={10} />
                   </div>
                </div>
             </div>

             {/* PR Modal */}
             {showPrModal && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center pl-72 p-10 animate-in fade-in duration-300">
                 <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPrModal(false)} />
                 <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                   <div className="p-8">
                     <div className="flex items-center justify-between mb-8">
                       <h3 className="text-2xl font-black text-slate-900">Pending Purchase Requisitions</h3>
                       <button onClick={() => setShowPrModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                     </div>
                     <div className="overflow-auto max-h-[500px] rounded-2xl border border-slate-100">
                       <table className="w-full text-left border-collapse">
                         <thead className="sticky top-0 bg-slate-50 z-10">
                           <tr className="border-b border-slate-100">
                             <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">PR Number</th>
                             <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Material</th>
                             <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                             <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Est. Cost</th>
                           </tr>
                         </thead>
                         <tbody>
                           {pendingPrs.map(pr => (
                             <tr 
                               key={pr.id} 
                               className="border-b border-slate-50 hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                               onClick={() => handleViewPr(pr.material_name, pr.id)}
                             >
                               <td className="px-6 py-4 text-xs font-black text-indigo-600 group-hover:underline">{pr.id}</td>
                               <td className="px-6 py-4 text-xs font-bold text-slate-600">{pr.material_name}</td>
                               <td className="px-6 py-4">
                                 <div className="flex items-center justify-between">
                                   <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[9px] font-black uppercase tracking-wider">{pr.status}</span>
                                   {generatingPr === pr.id ? (
                                     <Loader2 size={12} className="animate-spin text-indigo-600" />
                                   ) : (
                                     <Sparkles size={12} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                   )}
                                 </div>
                                </td>
                               <td className="px-6 py-4 text-xs font-bold text-slate-900 text-right">₹{(pr.unit_price || 0).toLocaleString()}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {/* OOS Modal */}
             {showOosModal && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center pl-72 p-10 animate-in fade-in duration-300">
                 <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowOosModal(false)} />
                 <div className="relative w-full max-w-5xl bg-white rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                   <div className="p-10">
                     <div className="flex items-start justify-between mb-10">
                       <div>
                         <div className="flex items-center gap-3 mb-2">
                           <div className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                             <AlertTriangle size={12} />
                             Stock Alert
                           </div>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inventory Management</span>
                         </div>
                         <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Material Nearing Safety Stock</h3>
                       </div>
                       <button 
                         onClick={() => setShowOosModal(false)} 
                         className="p-4 hover:bg-slate-50 rounded-full transition-all group"
                       >
                         <X size={24} className="text-slate-400 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300" />
                       </button>
                     </div>

                     <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-slate-50/50 shadow-inner">
                       <table className="w-full text-left border-collapse">
                         <thead>
                           <tr className="bg-white/80 border-b border-slate-100">
                             <th className="pl-10 pr-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Material & Specification</th>
                             <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Linked Asset</th>
                             <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Stock</th>
                             <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">PR Status</th>
                             <th className="pr-10 pl-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                           </tr>
                         </thead>
                         <tbody className="bg-white/40">
                           {criticalOos.map((item, idx) => (
                             <tr key={item.material_id} className={`group hover:bg-white transition-all duration-300 ${idx !== criticalOos.length - 1 ? 'border-b border-slate-50' : ''}`}>
                               <td className="pl-10 pr-6 py-6">
                                 <div className="flex flex-col">
                                   <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">{item.material_id}</span>
                                   <span className="text-sm font-bold text-slate-900 tracking-tight">{item.material_name}</span>
                                 </div>
                               </td>
                               <td className="px-6 py-6">
                                 <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                   <span className="text-xs font-bold text-slate-600">{item.asset_name || "Enterprise-wide"}</span>
                                 </div>
                               </td>
                               <td className="px-6 py-6">
                                 <div className="flex flex-col">
                                   <span className="text-xs font-black text-rose-600">0.00</span>
                                   <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-0.5">OUT OF STOCK</span>
                                 </div>
                               </td>
                               <td className="px-6 py-6 text-center">
                                 {item.pr_status ? (
                                   <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                     item.pr_status.toLowerCase() === 'issued' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                   }`}>
                                     {item.pr_status}
                                   </span>
                                 ) : (
                                   <span className="text-slate-300 text-[10px] font-bold italic tracking-wide">None Active</span>
                                 )}
                               </td>
                               <td className="pr-10 pl-6 py-6 text-right">
                                 {!item.pr_status && (
                                   <button 
                                     onClick={() => alert(`Purchase Requisition Triggered for ${item.material_id}`)}
                                     className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                   >
                                     Create PR
                                     <ArrowRight size={12} />
                                   </button>
                                 )}
                               </td>
                             </tr>
                           ))}
                           {criticalOos.length === 0 && (
                             <tr>
                               <td colSpan={5} className="py-20 text-center">
                                 <div className="flex flex-col items-center">
                                   <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                     <div className="w-8 h-8 bg-emerald-100 rounded-full" />
                                   </div>
                                   <p className="text-sm font-bold text-slate-900">All Spares Above Safety Stock</p>
                                   <p className="text-xs text-slate-400 mt-1">No critical stock-out alerts at this time.</p>
                                 </div>
                               </td>
                             </tr>
                           )}
                         </tbody>
                       </table>
                     </div>

                     <div className="mt-8 flex items-center justify-between px-2">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                         Note: PR Generation uses AI to analyze failure consequences and justify urgency.
                       </p>
                       <button 
                         onClick={() => setShowOosModal(false)}
                         className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:underline"
                       >
                         Dismiss All Alerts
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {/* Obsolescence Modal */}
             {showObsolescenceModal && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center pl-72 p-10 animate-in fade-in duration-300">
                 <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowObsolescenceModal(false)} />
                 <div className="relative w-full max-w-5xl bg-white rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                   <div className="p-10">
                     <div className="flex items-start justify-between mb-10">
                       <div>
                         <div className="flex items-center gap-3 mb-2">
                           <div className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                             <AlertTriangle size={12} />
                             Obsolescence Alert
                           </div>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inventory Health</span>
                         </div>
                         <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Material at Risk of Obsolescence</h3>
                         <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Rule: (Receipt Date + Shelf Life) ≤ 30 days from today</p>
                       </div>
                       <button 
                         onClick={() => setShowObsolescenceModal(false)} 
                         className="p-4 hover:bg-slate-50 rounded-full transition-all group"
                       >
                         <X size={24} className="text-slate-400 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300" />
                       </button>
                     </div>

                     <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-slate-50/50 shadow-inner">
                       <div className="max-h-[400px] overflow-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white/80 border-b border-slate-100 sticky top-0 z-10">
                              <th className="pl-10 pr-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Material ID & Description</th>
                              <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Receipt Date</th>
                              <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Shelf Life (Days)</th>
                              <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Expiry Date</th>
                              <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Days Remaining</th>
                              <th className="pr-10 pl-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Current Stock</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white/40">
                            {obsolescenceData.map((item, idx) => (
                              <tr key={item.material_id} className={`group hover:bg-white transition-all duration-300 ${idx !== obsolescenceData.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                <td className="pl-10 pr-6 py-6">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{item.material_id}</span>
                                    <span className="text-sm font-bold text-slate-900 tracking-tight">{item.material_name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-6 text-xs font-bold text-slate-600">{item.receipt_date}</td>
                                <td className="px-6 py-6 text-xs font-black text-slate-900">{item.shelf_life}</td>
                                <td className="px-6 py-6 text-xs font-black text-rose-600">{item.expiry_date}</td>
                                <td className="px-6 py-6">
                                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${item.days_remaining <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                     {item.days_remaining <= 0 ? 'EXPIRED' : `${item.days_remaining} Days Left`}
                                   </span>
                                </td>
                                <td className="pr-10 pl-6 py-6 text-right text-sm font-black text-slate-900">{item.stock}</td>
                              </tr>
                            ))}
                            {obsolescenceData.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-20 text-center">
                                  <p className="text-sm font-bold text-slate-900">No Obsolescence Risk Detected</p>
                                  <p className="text-xs text-slate-400 mt-1">All materials have healthy remaining shelf life.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
          </div>
        );
      case 'Work Mgmt.':
        return (
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto">
              <div className="flex flex-col px-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Work Mgmt. Hub</h2>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-2">Live Execution Tracker • Scheduling • Backlog</p>
              </div>
              <div className="bg-white/40 backdrop-blur-xl rounded-[48px] border border-white shadow-2xl shadow-slate-900/5">
                <div className="p-10">
                  <DrilldownView kpiId="work-order" onClose={() => {}} />
                </div>
              </div>
           </div>
        );
      case 'Resource Mgmt.':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto">
             <div className="flex flex-col px-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Resource Mgmt.</h2>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-2">Manpower Utilization • Skill Matrix • Overtime Tracker</p>
             </div>
             <div className="bg-white/40 backdrop-blur-xl rounded-[48px] border border-white shadow-2xl shadow-slate-900/5">
                <div className="p-10">
                  <DrilldownView kpiId="manpower-utilization" onClose={() => {}} />
                </div>
             </div>
          </div>
        );
      case 'Safety':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto">
             <div className="flex flex-col px-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Health, Safety & Environment</h2>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-2">Permit Compliance • Incident Log • LOTO Status</p>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/40 backdrop-blur-xl rounded-[48px] border border-white shadow-2xl shadow-slate-900/5">
                  <div className="p-10">
                    <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Incident Log</h3>
                    <DrilldownView kpiId="safety-incidents" onClose={() => {}} />
                  </div>
                </div>
                <div className="bg-white/40 backdrop-blur-xl rounded-[48px] border border-white shadow-2xl shadow-slate-900/5">
                  <div className="p-10">
                    <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Permit Compliance</h3>
                    <DrilldownView kpiId="safety-compliance" onClose={() => {}} />
                  </div>
                </div>
              </div>
          </div>
        );
      case 'Performance Mgmt.':
      default:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Section */}
            <section>
              <div className="flex items-end justify-between mb-6 px-2">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Performance</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Click any card to drill down • Real-time Metrics
                  </p>
                </div>
                {activeKpi && (
                  <button 
                    onClick={() => setActiveKpi(null)}
                    className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <KPIStats onKpiClick={handleKpiClick} activeKpi={activeKpi} />
            </section>

            <section id="main-content-area" className="flex flex-col gap-6 px-2 pb-8">
              <div className="w-full">
                <div className="space-y-6">
                  <AIInsightsCard />
                </div>
              </div>
            </section>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-3xl -z-10 translate-y-1/3 pointer-events-none" />

      <Sidebar />

      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        <Header />

        <div id="scroll-container" className="flex-1 flex flex-col overflow-y-auto p-8 scroll-smooth">
          {renderTabContent()}
        </div>
      </div>

      {/* Floating KPI Modal */}
      {activeKpi && !['search', 'assets', 'maintenance-auto-pilot'].includes(activeKpi) && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-300"
          onClick={() => setActiveKpi(null)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
          <div 
            className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DrilldownView 
                kpiId={activeKpi.startsWith('work-order') || activeKpi === 'pending-work-orders' ? 'work-order' : activeKpi} 
                initialStatus={
                  activeKpi === 'pending-work-orders' ? 'Pending' : 
                  activeKpi === 'work-order-in-progress' ? 'In Progress' :
                  activeKpi === 'work-order-closed' ? 'Closed' : undefined
                }
                onClose={() => setActiveKpi(null)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Specialty Full-Screen Views (Scheduler, Search, Assets, Work Instruction Coach, Diagnostic) */}
      {(activeKpi === 'maintenance-auto-pilot' || activeKpi === 'search' || activeKpi === 'assets' || activeKpi === 'work-instruction-coach' || activeKpi === 'diagnostic') && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-500">
           <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                 <button onClick={() => setActiveKpi(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2">
                   &larr; Back to Dashboard
                 </button>
                 <div className="px-3 py-1 bg-indigo-50 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                   {activeKpi === 'work-instruction-coach' ? 'Work Order Execution Advice' : activeKpi.replace(/-/g, ' ')}
                 </div>
              </div>
              <div className="flex-1 flex flex-col min-h-0 p-8 overflow-y-auto custom-scrollbar">
                {activeKpi === 'maintenance-auto-pilot' ? (
                   <div className="space-y-6 max-w-7xl mx-auto">
                      <div className="flex justify-end gap-2 px-2">
                        <button 
                          onClick={() => setAutoPilotMode('list')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            autoPilotMode === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100'
                          }`}
                        >
                          <List size={14} />
                          Detailed List
                        </button>
                        <button 
                          onClick={() => setAutoPilotMode('schedule')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            autoPilotMode === 'schedule' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100'
                          }`}
                        >
                          <CalendarIcon size={14} />
                          Schedule
                        </button>
                      </div>
                      <div className="modular-container p-6">
                        {autoPilotMode === 'list' ? <DrilldownView kpiId="work-order" initialStatus="Pending" viewSource="auto-pilot" onClose={() => setActiveKpi(null)} /> : <MaintenanceSchedule />}
                      </div>
                   </div>
                ) : activeKpi === 'work-instruction-coach' ? (
                  <div className="max-w-7xl mx-auto w-full">
                    <DrilldownView kpiId="work-order" initialStatus="Pending" viewSource="coach" onClose={() => setActiveKpi(null)} />
                  </div>
                ) : activeKpi === 'search' ? (
                  <div className="max-w-7xl mx-auto w-full">
                    <SearchView onClose={() => { setActiveKpi(null); setSearchQuery(''); }} />
                  </div>
                ) : activeKpi === 'diagnostic' ? (
                   <div className="max-w-7xl mx-auto w-full">
                     <DiagnosticView />
                   </div>
                ) : (
                  <div className="max-w-7xl mx-auto w-full">
                    <AssetView onClose={() => setActiveKpi(null)} />
                  </div>
                )}
              </div>
           </div>
        </div>
      )}
      <ChatPanel />

      {/* AI PR Modal Overlay */}
      {selectedPr && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <List size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Purchase Requisition</h3>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{selectedPr.pr_number}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPr(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</p>
                    <p className="text-sm font-bold text-slate-900">{selectedPr.matName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                    <p className="text-sm font-black text-slate-900">{selectedPr.matQty} Units</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Budget</p>
                    <p className="text-sm font-black text-emerald-600">{selectedPr.estimated_budget}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Urgency</p>
                    <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md">{selectedPr.delivery_urgency}</span>
                  </div>
                </div>

                <section>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500" /> Technical Justification (Rule 12 Compliant)
                  </h4>
                  <div className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{selectedPr.justification}</p>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Technical Specifications</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{selectedPr.technical_specifications}</p>
                  </section>
                  <section>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Vendor Recommendations</h4>
                    <ul className="space-y-2">
                      {selectedPr.vendor_recommendations?.map((v: string, i: number) => (
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
                onClick={handleDownloadPr}
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
    </main>
  );
}
