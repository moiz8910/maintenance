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
  assets: any[];
  chatHistory: ChatMessage[];
  isLoading: boolean;
  activeKpi: string | null;
  activeTab: string;
  isAuthenticated: boolean;
  searchQuery: string;
  setKPIs: (kpis: KPI[]) => void;
  setWorkOrders: (orders: any[]) => void;
  setAssets: (assets: any[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setActiveKpi: (kpiId: string | null) => void;
  setActiveTab: (tab: string) => void;
  setAuthenticated: (auth: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<MaintenanceStore>((set) => ({
  kpis: [],
  workOrders: [],
  assets: [],
  chatHistory: [
    { role: 'assistant', content: 'Welcome, Maintenance Manager. How can I assist you today?' }
  ],
  isLoading: false,
  activeKpi: null,
  activeTab: 'KPIs',
  isAuthenticated: false,
  searchQuery: '',
  setKPIs: (kpis) => set({ kpis }),
  setWorkOrders: (workOrders) => set({ workOrders }),
  setAssets: (assets) => set({ assets }),
  addChatMessage: (message) => set((state) => ({ 
    chatHistory: [...state.chatHistory, message] 
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setActiveKpi: (activeKpi) => set({ activeKpi }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
