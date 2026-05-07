'use client';
import React from 'react';
import { 
  Bot, 
  Zap, 
  BarChart3, 
  BookOpen, 
  ShieldCheck, 
  Settings2,
  Cpu,
  LayoutDashboard,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { usePathname } from 'next/navigation';

const agents = [
  { id: 'maintenance_auto_pilot', name: 'Maintenance Auto-Pilot', icon: Bot, desc: 'Work Orders execution plan' },
  { id: 'asset_strategy', name: 'Asset Strategy Agent', icon: Cpu, desc: 'Maintenance strategy' },
  { id: 'business_analyst', name: 'Intelligent Advisor', icon: BarChart3, desc: 'Intelligent review & reporting' },
  { id: 'work_instruction_coach', name: 'Work Instruction Coach', icon: BookOpen, desc: 'Instruction guide' },
  { id: 'reliability_assistant', name: 'Reliability Assistant', icon: ShieldCheck, desc: 'Failure Prevention' },
  { id: 'asset_steward', name: 'Asset Steward', icon: Settings2, desc: 'Lifecycle Tracking' },
];

const Sidebar = () => {
  const { addChatMessage, setLoading, setActiveKpi, activeKpi } = useStore();
  const pathname = usePathname();

  const handleAgentClick = async (agentId: string, agentName: string) => {
    if (agentId === 'maintenance_auto_pilot') {
      setActiveKpi('maintenance-auto-pilot');
      setTimeout(() => {
        const container = document.getElementById('scroll-container');
        const element = document.getElementById('main-content-area');
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 20, behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    if (agentId === 'work_instruction_coach') {
      setActiveKpi('work-instruction-coach');
      setTimeout(() => {
        const container = document.getElementById('scroll-container');
        const element = document.getElementById('main-content-area');
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 20, behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    console.log(`[Stage 13] Agent Execution Triggered: ${agentName} (${agentId})`);
    setLoading(true);
    addChatMessage({ role: 'user', content: `Start ${agentName}` });
    
    try {
      const response = await fetch(`/api/agent/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "" })
      });
      const data = await response.json();
      addChatMessage({ 
        role: 'assistant', 
        content: data.answer, 
        data_used: data.data_used,
        confidence: data.confidence 
      });
    } catch (error) {
      addChatMessage({ role: 'assistant', content: "Error connecting to AI agent." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-72 h-screen flex flex-col bg-white border-r border-slate-100 z-50">
      {/* Brand Header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tighter uppercase">OmniMaintain</h1>
            <p className="text-[10px] text-indigo-600 font-bold tracking-widest uppercase">AI Engine</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-8 py-4">
        {/* Main Menu */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3 block">Dashboard</label>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveKpi(activeKpi === 'assets' ? null : null)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                activeKpi !== 'assets' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard size={18} />
              Overview
            </button>
            <button
              onClick={() => setActiveKpi(activeKpi === 'assets' ? null : 'assets')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                activeKpi === 'assets' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Boxes size={18} />
              Assets
            </button>
          </nav>
        </div>

        {/* AI Toolkit */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3 block">Agent Toolkit</label>
          <div className="grid grid-cols-1 gap-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAgentClick(agent.id, agent.name)}
                className="group w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-white group-hover:shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all">
                  <agent.icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900 leading-none">{agent.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{agent.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;
