'use client';

import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Search, Package, Briefcase, X, ChevronRight } from 'lucide-react';

interface SearchViewProps {
  onClose: () => void;
}

const SearchView: React.FC<SearchViewProps> = ({ onClose }) => {
  const { searchQuery, assets, workOrders, setActiveKpi } = useStore();

  const results = useMemo(() => {
    if (!searchQuery.trim()) return { assets: [], workOrders: [] };
    
    const query = searchQuery.toLowerCase();
    
    const filteredAssets = assets.filter(a => 
      a.id.toLowerCase().includes(query) || 
      a.name.toLowerCase().includes(query) || 
      a.location?.toLowerCase().includes(query)
    );
    
    const filteredWOs = workOrders.filter(w => 
      w.id.toLowerCase().includes(query) || 
      (w.description || w.repair_description || '').toLowerCase().includes(query)
    );
    
    console.log(`Search Results for "${query}":`, { assets: filteredAssets.length, wos: filteredWOs.length });
    return { assets: filteredAssets, workOrders: filteredWOs };
  }, [searchQuery, assets, workOrders]);

  const totalCount = results.assets.length + results.workOrders.length;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Search Results</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Found {totalCount} matches for "{searchQuery}"
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Assets Section */}
        {results.assets.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package className="text-indigo-600" size={18} />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Assets ({results.assets.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.assets.map((asset) => (
                <div 
                  key={asset.id}
                  onClick={() => setActiveKpi('assets')} // Navigate to assets view
                  className="p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">
                      {asset.id}
                    </span>
                    <ChevronRight className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">{asset.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{asset.location}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Work Orders Section */}
        {results.workOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="text-amber-600" size={18} />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Work Orders ({results.workOrders.length})</h3>
            </div>
            <div className="space-y-3">
              {results.workOrders.map((wo) => (
                <div 
                  key={wo.id}
                  onClick={() => setActiveKpi('work-order')} // Drilldown to work orders
                  className="p-4 rounded-xl border border-slate-100 bg-white hover:border-amber-200 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
                      WO
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black text-slate-900">{wo.id}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                          (wo.status || wo.work_order_status) === 'Closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {wo.status || wo.work_order_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">{wo.description || wo.repair_description}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-amber-50 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" size={20} />
                </div>
              ))}
            </div>
          </section>
        )}

        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">No results found</p>
            <p className="text-sm font-medium">Try a different keyword or ID</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
