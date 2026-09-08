import React from 'react';
import { ElectionSummary } from '../types/database.types';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';

interface SummaryCardsProps {
  summary: ElectionSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const animatedValid = useAnimatedCounter(summary.total_valid_votes, 1000, 0);
  const animatedInvalid = useAnimatedCounter(summary.total_invalid_votes, 1000, 0);
  const animatedParticipation = useAnimatedCounter(summary.participation_rate, 1000, 1);

  const validPercentage = summary.total_votes_entered > 0
    ? ((summary.total_valid_votes / summary.total_votes_entered) * 100).toFixed(1)
    : '0';

  const invalidPercentage = summary.total_votes_entered > 0
    ? ((summary.total_invalid_votes / summary.total_votes_entered) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-12 gap-2 sm:gap-space-sm">
      
      {/* Suara Sah Pod */}
      <div className="col-span-4 bg-[#111827]/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-4 text-center border border-emerald-500/30 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all">
        <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
          <span className="material-symbols-outlined text-sm sm:text-base">how_to_reg</span>
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider truncate">
            Suara Sah
          </span>
        </div>
        <span className="text-base sm:text-xl md:text-2xl font-black text-emerald-400 block my-0.5 tabular-nums">
          {animatedValid.toLocaleString('id-ID')}
        </span>
        <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] sm:text-[11px] font-bold tabular-nums border border-emerald-500/20">
          <span>{validPercentage}%</span>
        </div>
      </div>

      {/* Suara Tidak Sah Pod */}
      <div className="col-span-4 bg-[#111827]/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-4 text-center border border-rose-500/30 shadow-xl relative overflow-hidden group hover:border-rose-500/60 transition-all">
        <div className="flex items-center justify-center gap-1 text-rose-400 mb-1">
          <span className="material-symbols-outlined text-sm sm:text-base">cancel</span>
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider truncate">
            Tidak Sah
          </span>
        </div>
        <span className="text-base sm:text-xl md:text-2xl font-black text-rose-400 block my-0.5 tabular-nums">
          {animatedInvalid.toLocaleString('id-ID')}
        </span>
        <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] sm:text-[11px] font-bold tabular-nums border border-rose-500/20">
          <span>{invalidPercentage}%</span>
        </div>
      </div>

      {/* Partisipasi Pemilih Pod */}
      <div className="col-span-4 bg-[#111827]/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-4 text-center border border-amber-500/30 shadow-xl relative overflow-hidden group hover:border-amber-500/60 transition-all">
        <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
          <span className="material-symbols-outlined text-sm sm:text-base">groups</span>
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider truncate">
            Partisipasi
          </span>
        </div>
        <span className="text-base sm:text-xl md:text-2xl font-black text-amber-400 block my-0.5 tabular-nums">
          {animatedParticipation.toFixed(1)}%
        </span>
        <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] sm:text-[11px] font-bold tabular-nums border border-amber-500/20">
          <span className="truncate">{summary.total_dpt.toLocaleString('id-ID')} DPT</span>
        </div>
      </div>

    </div>
  );
};


