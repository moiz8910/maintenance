'use client';
import React, { useState, useEffect } from 'react';
import { Brain, X, Loader2, ShieldAlert, Wrench, ListChecks, Info, Factory } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ExecutionAdviseModalProps {
  workOrderId: string;
  onClose: () => void;
}

const ExecutionAdviseModal: React.FC<ExecutionAdviseModalProps> = ({ workOrderId, onClose }) => {
  const [advise, setAdvise] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdvise = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/work-order/${workOrderId}/execution-advise`, { method: 'POST' });
        const data = await res.json();
        setAdvise(data.advise);
      } catch (error) {
        setAdvise("Failed to generate AI execution advice. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAdvise();
  }, [workOrderId]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Execution Advise</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Work Order: {workOrderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Generating Strategy...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-2xl font-black text-slate-900 mb-8 border-b border-indigo-100 pb-4 w-full tracking-tight" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-12 mb-6 flex items-center gap-2" {...props} />,
                  h3: ({node, ...props}) => {
                    const text = String(props.children).toLowerCase();
                    let icon = <Info size={18} className="text-indigo-600" />;
                    let bgClass = "bg-slate-50 border-slate-200";
                    let iconBg = "bg-white";
                    
                    if (text.includes('safety')) {
                      icon = <ShieldAlert size={18} className="text-rose-600" />;
                      bgClass = "bg-rose-50/50 border-rose-100";
                      iconBg = "bg-rose-100/50";
                    } else if (text.includes('tooling') || text.includes('equipment')) {
                      icon = <Wrench size={18} className="text-blue-600" />;
                      bgClass = "bg-blue-50/50 border-blue-100";
                      iconBg = "bg-blue-100/50";
                    } else if (text.includes('execution') || text.includes('step')) {
                      icon = <ListChecks size={18} className="text-emerald-600" />;
                      bgClass = "bg-emerald-50/50 border-emerald-100";
                      iconBg = "bg-emerald-100/50";
                    } else if (text.includes('quality') || text.includes('check')) {
                      icon = <Info size={18} className="text-cyan-600" />;
                      bgClass = "bg-cyan-50/50 border-cyan-100";
                      iconBg = "bg-cyan-100/50";
                    } else if (text.includes('oem')) {
                      icon = <Factory size={18} className="text-violet-600" />;
                      bgClass = "bg-violet-50/50 border-violet-100";
                      iconBg = "bg-violet-100/50";
                    } else if (text.includes('pitfall') || text.includes('tip')) {
                      icon = <ShieldAlert size={18} className="text-amber-600" />;
                      bgClass = "bg-amber-50/50 border-amber-100";
                      iconBg = "bg-amber-100/50";
                    }
                    
                    return (
                      <h3 className={`text-[14px] font-bold text-slate-900 uppercase tracking-widest mt-10 mb-6 flex items-center gap-4 p-4 rounded-2xl border shadow-sm ${bgClass}`} {...props}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/50 shadow-sm ${iconBg}`}>
                          {icon}
                        </div>
                        {props.children}
                      </h3>
                    );
                  },
                  p: ({node, ...props}) => <p className="text-[13px] leading-relaxed text-slate-600 mb-5 font-medium" {...props} />,
                  ul: ({node, ...props}) => <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" {...props} />,
                  li: ({node, ...props}) => (
                    <li className="flex items-start gap-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group cursor-default">
                      <div className="w-2 h-2 rounded-full bg-indigo-200 mt-1.5 shrink-0 group-hover:bg-indigo-500 group-hover:scale-125 transition-all" />
                      <span className="text-[12px] font-medium text-slate-700 leading-relaxed">{props.children}</span>
                    </li>
                  ),
                  strong: ({node, ...props}) => <strong className="font-bold text-indigo-950 bg-indigo-50 px-1.5 py-0.5 rounded-md" {...props} />,
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-5 py-3 my-6 bg-gradient-to-r from-indigo-50/50 to-transparent rounded-r-2xl text-[13px] italic text-slate-700 font-medium" {...props} />
                  ),
                }}
              >
                {advise}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionAdviseModal;
