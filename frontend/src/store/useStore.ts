import { create } from 'zustand';

interface KPI {
  name: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  subtext: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  stage?: string;
  data_used?: any;
  confidence?: string;
}

interface MaintenanceStore {
  kpis: KPI[];
  workOrders: any[];
  chatHistory: ChatMessage[];
  isLoading: boolean;
  setKPIs: (kpis: KPI[]) => void;
  setWorkOrders: (orders: any[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<MaintenanceStore>((set) => ({
  kpis: [],
  workOrders: [],
  chatHistory: [
    { role: 'assistant', content: 'Welcome, Maintenance Manager. How can I assist you today?' }
  ],
  isLoading: false,
  setKPIs: (kpis) => set({ kpis }),
  setWorkOrders: (workOrders) => set({ workOrders }),
  addChatMessage: (message) => set((state) => ({ 
    chatHistory: [...state.chatHistory, message] 
  })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
