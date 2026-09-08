import React, { useState } from 'react';
import { TPSRecapItem, CandidateSummary } from '../types/database.types';

interface TPSRecapTableProps {
  tpsList: TPSRecapItem[];
  candidates: CandidateSummary[];
  onViewEvidence: (tps: TPSRecapItem) => void;
}

// Shared colgroup to ensure 100% pixel-perfect alignment across header, body, and footer
const TableColGroup: React.FC = () => (
  <colgroup>
    <col className="w-[26%] md:w-[23%]" />
    <col className="w-[14%] md:w-[12%]" />
    <col className="w-[18%] md:w-[16%]" />
    <col className="w-[18%] md:w-[16%]" />
    <col className="hidden md:table-column md:w-[14%]" />
    <col className="w-[14%] md:w-[11%]" />
    <col className="w-[10%] md:w-[8%]" />
  </colgroup>
);

export const TPSRecapTable: React.FC<TPSRecapTableProps> = ({
  tpsList,
  candidates,
  onViewEvidence
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScrollActive, setIsAutoScrollActive] = useState(true);

  const c1Name = candidates.find(c => c.number === 1)?.name.split(',')[0] || 'Paslon 01';
  const c2Name = candidates.find(c => c.number === 2)?.name.split(',')[0] || 'Paslon 02';

  // Filtered TPS list
  const filteredList = tpsList.filter(
    t =>
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.banjar_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Duplicated list for seamless infinite loop (only when auto-scroll is active and list is long enough)
  const displayRows = isAutoScrollActive && searchQuery === ''
    ? [...filteredList, ...filteredList]
    : filteredList;

  // Compute grand totals
  const grandValid = tpsList.reduce((sum, t) => sum + t.total_valid_votes, 0);
  const grandC1 = tpsList.reduce((sum, t) => sum + (t.candidate_votes['1']?.votes || 0), 0);
  const grandC2 = tpsList.reduce((sum, t) => sum + (t.candidate_votes['2']?.votes || 0), 0);

  const grandC1Pct = grandValid > 0 ? ((grandC1 / grandValid) * 100).toFixed(1) : '0';
  const grandC2Pct = grandValid > 0 ? ((grandC2 / grandValid) * 100).toFixed(1) : '0';
  const netMargin = grandC1 - grandC2;

  const renderRow = (tps: TPSRecapItem, keyIndex: string | number) => {
    const v1 = tps.candidate_votes['1']?.votes || 0;
    const p1 = tps.total_valid_votes > 0 ? ((v1 / tps.total_valid_votes) * 100).toFixed(1) : '0';

    const v2 = tps.candidate_votes['2']?.votes || 0;
    const p2 = tps.total_valid_votes > 0 ? ((v2 / tps.total_valid_votes) * 100).toFixed(1) : '0';

    const isC1Leading = tps.leading_candidate_number === 1;
    const isC2Leading = tps.leading_candidate_number === 2;

    return (
      <tr
        key={`${tps.polling_station_id}-${keyIndex}`}
        className="border-b border-slate-800/60 hover:bg-slate-800/50 transition-colors group"
      >
        {/* TPS Code & Banjar */}
        <td className="py-2.5 px-3">
          <span className="font-bold text-white text-xs md:text-sm block leading-tight truncate">
            {tps.code}
          </span>
          <span className="text-[11px] text-slate-400 font-medium truncate block">
            {tps.banjar_name}
          </span>
        </td>

        {/* Valid Votes */}
        <td className="py-2.5 px-2 text-center font-bold text-slate-200 tabular-nums">
          {tps.total_valid_votes.toLocaleString('id-ID')}
        </td>

        {/* Paslon 01 */}
        <td className="py-2.5 px-2 text-center bg-red-950/20 font-black text-rose-400 tabular-nums border-x border-slate-800/30">
          <span className="block text-xs md:text-sm">{v1.toLocaleString('id-ID')}</span>
          <span className="text-[10px] font-normal text-rose-300/80">({p1}%)</span>
        </td>

        {/* Paslon 02 */}
        <td className="py-2.5 px-2 text-center bg-amber-950/20 font-black text-amber-400 tabular-nums border-r border-slate-800/30">
          <span className="block text-xs md:text-sm">{v2.toLocaleString('id-ID')}</span>
          <span className="text-[10px] font-normal text-amber-300/80">({p2}%)</span>
        </td>

        {/* Mini Visual Distribution Bar */}
        <td className="py-2.5 px-2 hidden md:table-cell align-middle text-center">
          {tps.total_valid_votes > 0 ? (
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
              <div className="h-full bg-rose-500" style={{ width: `${p1}%` }} />
              <div className="h-full bg-amber-500" style={{ width: `${p2}%` }} />
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 italic">Belum terisi</span>
          )}
        </td>

        {/* Margin Badge */}
        <td className="py-2.5 px-2 text-center">
          {tps.total_valid_votes > 0 ? (
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[10px] md:text-xs inline-block tabular-nums shadow-sm ${
                isC1Leading
                  ? 'bg-rose-600/90 text-white'
                  : isC2Leading
                  ? 'bg-amber-600/90 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {isC1Leading ? '01' : isC2Leading ? '02' : '='} (+{tps.vote_margin})
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 italic">Belum</span>
          )}
        </td>

        {/* Evidence Photo Button */}
        <td className="py-2.5 px-1.5 text-center">
          <button
            onClick={() => onViewEvidence(tps)}
            className="p-1 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-all active:scale-95"
            title="Lihat Foto Formulir C-Hasil"
          >
            <span className="material-symbols-outlined text-base md:text-lg align-middle">
              photo_camera
            </span>
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden flex flex-col h-full text-slate-200">
      
      {/* Table Top Toolbar */}
      <div className="p-3 md:p-4 border-b border-slate-800 bg-[#0f172a]/95 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-base">analytics</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-sm md:text-base text-white font-bold tracking-wide">
                Rekap Tabulasi TPS
              </h3>
              {/* Auto Scroll Pulse Indicator */}
              {isAutoScrollActive && searchQuery === '' && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Auto Loop
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Perolehan suara C-Hasil per banjar (bergulir otomatis)
            </p>
          </div>
        </div>
        
        {/* Controls: Auto-Scroll Toggle, Search, and Legend */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Toggle Auto Scroll Button */}
          <button
            onClick={() => setIsAutoScrollActive(prev => !prev)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center gap-1 transition-all ${
              isAutoScrollActive
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isAutoScrollActive ? 'Jeda gulir otomatis' : 'Aktifkan gulir otomatis'}
          >
            <span className="material-symbols-outlined text-sm">
              {isAutoScrollActive ? 'pause' : 'play_arrow'}
            </span>
            <span className="hidden sm:inline">
              {isAutoScrollActive ? 'Jeda Gulir' : 'Auto-Scroll'}
            </span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari TPS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs rounded-md bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-28 sm:w-36"
            />
            <span className="material-symbols-outlined text-sm absolute left-1.5 top-1.5 text-slate-500">
              search
            </span>
          </div>

          {/* Mini Legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold pl-1">
            <span className="inline-flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> 01
            </span>
            <span className="inline-flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 02
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Sticky Header for Table */}
      <div className="overflow-x-auto flex-1 flex flex-col">
        <table className="w-full table-fixed text-left border-collapse">
          <TableColGroup />
          <thead className="bg-[#0b0f17] text-slate-400 font-label-sm text-[11px] md:text-xs uppercase tracking-wider border-b border-slate-800 shadow-sm">
            <tr>
              <th className="py-2.5 px-3 font-bold truncate">Lokasi / Banjar</th>
              <th className="py-2.5 px-2 text-center font-bold truncate">Suara Sah</th>
              <th className="py-2.5 px-2 text-center font-bold bg-rose-950/30 text-rose-300 truncate">
                01 {c1Name}
              </th>
              <th className="py-2.5 px-2 text-center font-bold bg-amber-950/30 text-amber-300 truncate">
                02 {c2Name}
              </th>
              <th className="py-2.5 px-2 text-center font-bold hidden md:table-cell truncate">Visual Sebaran</th>
              <th className="py-2.5 px-2 text-center font-bold truncate">Keunggulan</th>
              <th className="py-2.5 px-1.5 text-center font-bold truncate">C-Hasil</th>
            </tr>
          </thead>
        </table>

        {/* Auto Scrolling Body Container */}
        <div className="overflow-hidden relative h-[340px] md:h-[380px] bg-[#0c121e]/80">
          <div
            className={`w-full ${
              isAutoScrollActive && searchQuery === '' ? 'animate-scroll-vertical' : 'overflow-y-auto h-full'
            }`}
          >
            <table className="w-full table-fixed text-left border-collapse">
              <TableColGroup />
              <tbody className="divide-y divide-slate-800/40 text-xs md:text-sm">
                {displayRows.map((tps, index) => renderRow(tps, index))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fixed Total Summary Footer */}
        <table className="w-full table-fixed text-left border-collapse bg-[#0b0f17] font-bold text-white border-t-2 border-slate-700 shadow-lg">
          <TableColGroup />
          <tfoot>
            <tr>
              <td className="py-2.5 px-3 uppercase text-xs md:text-sm font-black text-amber-300 truncate">
                TOTAL ({tpsList.length} TPS)
              </td>
              <td className="py-2.5 px-2 text-center tabular-nums text-xs md:text-sm font-black text-white">
                {grandValid.toLocaleString('id-ID')}
              </td>
              <td className="py-2.5 px-2 text-center bg-rose-950/40 text-rose-400 tabular-nums text-xs md:text-sm font-black">
                {grandC1.toLocaleString('id-ID')}
                <span className="text-[10px] block font-medium text-rose-300/70">({grandC1Pct}%)</span>
              </td>
              <td className="py-2.5 px-2 text-center bg-amber-950/40 text-amber-400 tabular-nums text-xs md:text-sm font-black">
                {grandC2.toLocaleString('id-ID')}
                <span className="text-[10px] block font-medium text-amber-300/70">({grandC2Pct}%)</span>
              </td>
              <td className="hidden md:table-cell py-2.5 px-2">
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
                  <div className="h-full bg-rose-500" style={{ width: `${grandC1Pct}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${grandC2Pct}%` }} />
                </div>
              </td>
              <td className="py-2.5 px-2 text-center" colSpan={2}>
                <span className="font-black text-xs md:text-sm text-amber-300 tabular-nums block truncate">
                  {netMargin >= 0 ? `01 (+${netMargin.toLocaleString('id-ID')})` : `02 (+${Math.abs(netMargin).toLocaleString('id-ID')})`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Verification footer note */}
      <div className="bg-[#0b0f17] px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="material-symbols-outlined text-sm">verified</span>
          Data terverifikasi C-Hasil TPS
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Panwaslukel Desa Belega
        </span>
      </div>
    </div>
  );
};



