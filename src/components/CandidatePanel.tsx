import React from 'react';
import { CandidateSummary } from '../types/database.types';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';

interface CandidatePanelProps {
  candidates: CandidateSummary[];
  totalValidVotes: number;
}

// Individual animated candidate card in Dark Studio Contrast
const AnimatedCandidateCard: React.FC<{
  candidate: CandidateSummary;
  isLeading: boolean;
  margin: number;
  totalValidVotes: number;
}> = ({ candidate, isLeading, margin, totalValidVotes }) => {
  const animatedPercentage = useAnimatedCounter(candidate.percentage, 1200, 1);
  const animatedVotes = useAnimatedCounter(candidate.total_votes, 1200, 0);
  const animatedMargin = useAnimatedCounter(margin, 1200, 0);

  const isPaslon1 = candidate.number === 1;
  const themeColor = candidate.color_hex || (isPaslon1 ? '#f43f5e' : '#f59e0b');

  return (
    <div
      className={`relative rounded-2xl p-space-md md:p-space-lg overflow-hidden border transition-all duration-300 shadow-xl ${
        isLeading
          ? 'bg-gradient-to-br from-[#122216] via-[#0f1b13] to-[#0a140e] text-white border-amber-400/60 leader-glow'
          : 'bg-[#111827]/90 text-white border-slate-700/70 hover:border-slate-600'
      }`}
    >
      {/* Top Accent Strip with Gradient */}
      <div
        className="absolute top-0 left-0 w-full h-1.5"
        style={{
          background: isLeading
            ? 'linear-gradient(90deg, #f59e0b, #fef08a, #f59e0b)'
            : isPaslon1 ? '#f43f5e' : '#f59e0b'
        }}
      />

      {/* Header: Paslon Number & Status Badge */}
      <div className="flex items-center justify-between mb-space-sm gap-2">
        <div className="flex items-center gap-space-xs">
          <span
            className={`px-2.5 py-0.5 rounded font-black text-xs md:text-sm tracking-wider uppercase ${
              isLeading
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            PASLON 0{candidate.number}
          </span>
          <h2 className="font-headline-sm text-base md:text-xl font-bold truncate text-white">
            {candidate.name}
          </h2>
        </div>

        {/* TV Status Badge */}
        {isLeading ? (
          <div className="flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/50 px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-sm text-amber-300 animate-pulse">
              emoji_events
            </span>
            <span>UNGGUL</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded uppercase shrink-0 border border-slate-700">
            PERINGKAT 2
          </span>
        )}
      </div>

      {/* Content Body: Photo + Metric Data */}
      <div className="flex items-center gap-space-md">
        
        {/* Photo with TV Studio Ring */}
        <div className="relative shrink-0">
          <div
            className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 shadow-xl ${
              isLeading ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-700'
            }`}
          >
            <img
              src={candidate.photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300'}
              alt={candidate.name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Number Overlay Pill */}
          <div
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs text-white shadow-lg border-2 border-slate-900 ${
              isPaslon1 ? 'bg-rose-600' : 'bg-amber-600'
            }`}
          >
            {candidate.number}
          </div>
        </div>

        {/* Vote Metrics */}
        <div className="flex-1 min-w-0">
          {candidate.vice_name && (
            <p className="text-xs md:text-sm font-medium mb-1 truncate text-slate-300">
              Wakil: <span className="font-semibold text-white">{candidate.vice_name}</span>
            </p>
          )}

          {/* Main Percentage & Vote Count */}
          <div className="flex items-baseline gap-2.5 flex-wrap my-0.5">
            <span
              className={`font-data-xl text-3xl md:text-5xl font-black leading-none tabular-nums tracking-tight ${
                isLeading ? 'text-amber-300 drop-shadow-[0_2px_10px_rgba(252,211,77,0.3)]' : isPaslon1 ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {animatedPercentage.toFixed(1)}%
            </span>
            <span className="text-sm md:text-base font-bold tabular-nums text-slate-200">
              {animatedVotes.toLocaleString('id-ID')} Suara
            </span>
          </div>

          {/* Progress Bar with Shimmer */}
          <div className="relative w-full h-3 rounded-full mt-2 overflow-hidden bg-slate-950/80 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                isPaslon1 ? 'bg-gradient-to-r from-rose-600 to-rose-500' : 'bg-gradient-to-r from-amber-600 to-amber-500'
              }`}
              style={{
                width: `${Math.min(candidate.percentage, 100)}%`
              }}
            >
              {/* Animated Light Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-tv-shimmer" />
            </div>
          </div>

          {/* Banjar Leading Count & Margin Delta */}
          <div className="flex justify-between items-center mt-2 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-amber-400">location_on</span>
              Unggul di {candidate.banjar_leading_count} Banjar
            </span>
            {isLeading ? (
              <span className="text-amber-300 font-bold tabular-nums flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">arrow_upward</span>
                +{animatedMargin.toLocaleString('id-ID')} Suara
              </span>
            ) : (
              <span className="tabular-nums text-slate-400">
                Dari {totalValidVotes.toLocaleString('id-ID')} suara sah
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export const CandidatePanel: React.FC<CandidatePanelProps> = ({
  candidates,
  totalValidVotes
}) => {
  if (!candidates || candidates.length === 0) return null;

  // Determine leading candidate
  const sorted = [...candidates].sort((a, b) => b.total_votes - a.total_votes);
  const leadingId = sorted[0]?.total_votes > sorted[1]?.total_votes ? sorted[0]?.id : null;
  const margin = Math.abs((candidates[0]?.total_votes || 0) - (candidates[1]?.total_votes || 0));

  const c1 = candidates.find(c => c.number === 1);
  const c2 = candidates.find(c => c.number === 2);
  const c1Pct = c1?.percentage || 0;
  const c2Pct = c2?.percentage || 0;

  return (
    <div className="flex flex-col gap-space-md">
      
      {/* TV Head-to-Head Clash Bar */}
      {c1 && c2 && (
        <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/60 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase mb-2 px-1">
            <span className="text-rose-400 flex items-center gap-1.5 font-extrabold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm" />
              01 {c1.name.split(',')[0]} ({c1Pct.toFixed(1)}%)
            </span>
            <span className="text-amber-400 flex items-center gap-1.5 font-extrabold">
              ({c2Pct.toFixed(1)}%) {c2.name.split(',')[0]} 02
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm" />
            </span>
          </div>

          {/* Dual Split Bar */}
          <div className="relative w-full h-4 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-700 relative overflow-hidden"
              style={{ width: `${c1Pct}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-tv-shimmer" />
            </div>
            {/* Center clash divider line */}
            <div className="w-1.5 h-full bg-white z-10 shadow-md" />
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700 relative overflow-hidden flex-1"
              style={{ width: `${c2Pct}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-tv-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Individual Candidate Cards */}
      {candidates.map((candidate) => (
        <AnimatedCandidateCard
          key={candidate.id}
          candidate={candidate}
          isLeading={candidate.id === leadingId}
          margin={margin}
          totalValidVotes={totalValidVotes}
        />
      ))}

    </div>
  );
};


