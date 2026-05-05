'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Boxes, Search, ChevronUp, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  asset_type: string | null;
  location: string | null;
  criticality: number | null;
  throughput_rate: number | null;
  throughput_rate_uom: string | null;
  mttr: number | null;
  mttr_uom: string | null;
  mtbf: number | null;
  mtbf_uom: string | null;
  unplanned_downtime: number | null;
  unplanned_downtime_uom: string | null;
  sop_number: number | null;
  sop_description: string | null;
  parent_name: string | null;
}

type SortKey = keyof Asset;

const CRITICALITY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Critical', color: 'bg-rose-100 text-rose-700' },
  2: { label: 'High',     color: 'bg-orange-100 text-orange-700' },
  3: { label: 'Medium',   color: 'bg-amber-100 text-amber-700' },
  4: { label: 'Low',      color: 'bg-emerald-100 text-emerald-700' },
  5: { label: 'Minimal',  color: 'bg-slate-100 text-slate-500' },
};

const fmt = (v: number | null, unit?: string | null) =>
  v != null ? `${v}${unit ? ' ' + unit : ''}` : '—';

const PAGE_SIZE = 50;

// New column order:
// 1. Asset ID  2. Name  3. Parent Asset  4. MTTR  5. MTBF
// 6. Unplanned DT  7. Location  8. SOP  9. Criticality  10. Type
const cols: { key: SortKey; label: string }[] = [
  { key: 'id',                 label: 'Asset ID' },
  { key: 'name',               label: 'Name' },
  { key: 'parent_name',        label: 'Parent Asset' },
  { key: 'mttr',               label: 'MTTR' },
  { key: 'mtbf',               label: 'MTBF' },
  { key: 'unplanned_downtime', label: 'Unplanned DT' },
  { key: 'location',           label: 'Location' },
  { key: 'sop_number',         label: 'SOP' },
  { key: 'criticality',        label: 'Criticality' },
  { key: 'asset_type',         label: 'Type' },
];

export default function AssetView({ onClose }: { onClose: () => void }) {
  const [assets, setAssets]       = useState<Asset[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [sortKey, setSortKey]     = useState<SortKey>('id');
  const [sortAsc, setSortAsc]     = useState(true);
  const [selected, setSelected]   = useState<Asset | null>(null);
  const [page, setPage]           = useState(1);

  // Refs for synced dual-scrollbar
  const topScrollRef    = useRef<HTMLDivElement>(null);
  const tableScrollRef  = useRef<HTMLDivElement>(null);
  const tableWidthRef   = useRef<HTMLTableElement>(null);
  const syncing         = useRef(false);

  useEffect(() => {
    fetch('/api/assets')
      .then(r => r.json())
      .then(data => { setAssets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Reset to page 1 when search/sort changes
  useEffect(() => { setPage(1); }, [search, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = assets
    .filter(a =>
      [a.id, a.name, a.asset_type, a.location, a.parent_name]
        .some(v => (v ?? '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return sortAsc
        ? String(av).localeCompare(String(bv), undefined, { numeric: true })
        : String(bv).localeCompare(String(av), undefined, { numeric: true });
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Sync top-scrollbar ↔ table-scrollbar
  const onTopScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (tableScrollRef.current && topScrollRef.current)
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    syncing.current = false;
  }, []);

  const onTableScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (topScrollRef.current && tableScrollRef.current)
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    syncing.current = false;
  }, []);

  // Keep top-scroll width in sync with table width
  useEffect(() => {
    const update = () => {
      if (tableWidthRef.current && topScrollRef.current) {
        const inner = topScrollRef.current.firstChild as HTMLDivElement | null;
        if (inner) inner.style.width = `${tableWidthRef.current.offsetWidth}px`;
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [loading, paginated.length]);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc
        ? <ChevronUp size={12} className="text-indigo-300 shrink-0" />
        : <ChevronDown size={12} className="text-indigo-300 shrink-0" />
      : <ChevronUp size={12} className="text-slate-500 shrink-0" />;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Panel Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Boxes size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Asset Register</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              {filtered.length} assets &bull; Page {page} of {totalPages}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by ID, name, type, location…"
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-widest">
          Loading assets…
        </div>
      ) : (
        <>
          {/* ── Top scrollbar ─────────────────────────────────── */}
          <div
            ref={topScrollRef}
            onScroll={onTopScroll}
            className="overflow-x-auto mb-0 rounded-t-xl border-x border-t border-slate-200 bg-slate-100"
            style={{ height: 12 }}
          >
            {/* phantom div matching table width */}
            <div style={{ height: 1 }} />
          </div>

          {/* ── Table ────────────────────────────────────────── */}
          <div
            ref={tableScrollRef}
            onScroll={onTableScroll}
            className="flex-1 overflow-auto rounded-b-xl border border-slate-200 shadow-sm"
          >
            <table ref={tableWidthRef} className="text-xs border-collapse" style={{ minWidth: '100%' }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  {cols.map(c => (
                    <th
                      key={c.key}
                      onClick={() => handleSort(c.key)}
                      className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer select-none whitespace-nowrap hover:bg-slate-700 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        {c.label}
                        <SortIcon k={c.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((a, idx) => {
                  const crit = CRITICALITY_LABEL[a.criticality ?? 0];
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(selected?.id === a.id ? null : a)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-indigo-50/40 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      } ${selected?.id === a.id ? '!bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''}`}
                    >
                      {/* 1. Asset ID */}
                      <td className="px-4 py-2.5 font-black text-slate-800 whitespace-nowrap">{a.id}</td>
                      {/* 2. Name */}
                      <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">{a.name}</td>
                      {/* 3. Parent Asset */}
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{a.parent_name ?? '—'}</td>
                      {/* 4. MTTR */}
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmt(a.mttr, a.mttr_uom)}</td>
                      {/* 5. MTBF */}
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmt(a.mtbf, a.mtbf_uom)}</td>
                      {/* 6. Unplanned DT */}
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmt(a.unplanned_downtime, a.unplanned_downtime_uom)}</td>
                      {/* 7. Location */}
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{a.location ?? '—'}</td>
                      {/* 8. SOP */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {a.sop_number
                          ? <span className="font-bold text-indigo-600">SOP-{a.sop_number}</span>
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                      {/* 9. Criticality (second last) */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {crit
                          ? <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${crit.color}`}>{crit.label}</span>
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                      {/* 10. Type (last) */}
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{a.asset_type ?? '—'}</td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-slate-400 italic font-medium">
                      No assets match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ───────────────────────────────────── */}
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} assets
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={12} /> Prev
              </button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-[10px] font-bold">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-black transition-colors ${
                        page === p
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )
              }

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={12} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Detail Panel ─────────────────────────────────────── */}
      {selected && (
        <div className="mt-4 p-5 bg-white border border-indigo-100 rounded-2xl shadow-sm animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selected.id}</p>
              <h3 className="text-base font-black text-slate-900 mt-0.5">{selected.name}</h3>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              ['Parent Asset',    selected.parent_name],
              ['MTTR',            fmt(selected.mttr, selected.mttr_uom)],
              ['MTBF',            fmt(selected.mtbf, selected.mtbf_uom)],
              ['Unplanned DT',    fmt(selected.unplanned_downtime, selected.unplanned_downtime_uom)],
              ['Location',        selected.location],
              ['SOP',             selected.sop_number ? `SOP-${selected.sop_number}` : null],
              ['SOP Description', selected.sop_description],
              ['Criticality',     selected.criticality != null ? (CRITICALITY_LABEL[selected.criticality]?.label ?? String(selected.criticality)) : null],
              ['Type',            selected.asset_type],
              ['Throughput',      fmt(selected.throughput_rate, selected.throughput_rate_uom)],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="font-semibold text-slate-700 mt-0.5 break-words">{val || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
