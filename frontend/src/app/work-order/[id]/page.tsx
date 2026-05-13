'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkOrderDetailView } from '@/components/WorkOrderDetailView';
import { ArrowLeft } from 'lucide-react';

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  if (!id) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Premium Navigation Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4 sticky top-0 z-50 shadow-sm">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="h-6 w-[1px] bg-slate-200 mx-2" />
        <div>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">Maintenance Intelligence Platform</h1>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">Work Order Archive • Technical Record</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <WorkOrderDetailView workOrderId={id} isFullPage={true} />
      </div>
      
      {/* Footer Branding */}
      <div className="py-12 border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">M</div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maintenance Platform</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2026 Vedanta Jharsuguda • Industrial Performance Systems</p>
        </div>
      </div>
    </div>
  );
}
