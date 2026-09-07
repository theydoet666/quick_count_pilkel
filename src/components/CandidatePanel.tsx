import React from 'react';
import { CandidateSummary } from '../types/database.types';

interface CandidatePanelProps {
  candidates: CandidateSummary[];
  totalValidVotes: number;
}

export const CandidatePanel: React.FC<CandidatePanelProps> = ({
  candidates,
  totalValidVotes
}) => {
  if (!candidates || candidates.length === 0) return null;

  // Determine leading candidate
  const sorted = [...candidates].sort((a, b) => b.total_votes - a.total_votes);
  const leadingId = sorted[0]?.total_votes > sorted[1]?.total_votes ? sorted[0]?.id : null;
  const margin = Math.abs((candidates[0]?.total_votes || 0) - (candidates[1]?.total_votes || 0));

  return (
    <div className="flex flex-col gap-space-md">
      {candidates.map((candidate) => {
        const isLeading = candidate.id === leadingId;
        const isPaslon1 = candidate.number === 1;

        return (
          <div
            key={candidate.id}
            className={`relative rounded-lg p-space-md shadow-md overflow-hidden border transition-all ${
              isLeading
                ? 'bg-primary-container text-on-primary border-tertiary-fixed-dim/40'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant/40'
            }`}
          >
            {/* Top Accent Strip */}
            <div
              className="absolute top-0 left-0 w-full h-1"
              style={{ backgroundColor: candidate.color_hex }}
            />

            {/* Header: Paslon Number & Status Badge */}
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span
                  className={`px-space-xs py-space-3xs rounded font-bold text-label-sm ${
                    isLeading
                      ? 'bg-tertiary-container text-tertiary-fixed-dim'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  PASLON 0{candidate.number}
                </span>
                <h2
                  className={`font-headline-sm text-headline-sm font-bold ${
                    isLeading ? 'text-on-primary' : 'text-on-surface'
                  }`}
                >
                  {candidate.name}
                </h2>
              </div>

              {/* Status Badge */}
              {isLeading ? (
                <div className="flex items-center gap-space-3xs bg-tertiary-container text-tertiary-fixed-dim px-space-xs py-space-3xs rounded font-label-sm text-label-sm font-bold tracking-wider">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  UNGGUL
                </div>
              ) : (
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold bg-surface-container px-space-xs py-space-3xs rounded">
                  PERINGKAT 2
                </span>
              )}
            </div>

            {/* Content Body: Photo + Votes & Progress */}
            <div className="flex items-center gap-space-md">
              {/* Photo */}
              <div
                className={`w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden shrink-0 border-2 shadow-sm ${
                  isLeading ? 'border-tertiary-fixed-dim/60' : 'border-outline-variant/40'
                }`}
              >
                <img
                  src={candidate.photo_url || 'https://via.placeholder.com/150'}
                  alt={candidate.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Vote Metrics */}
              <div className="flex-1 min-w-0">
                {candidate.vice_name && (
                  <p
                    className={`font-body-sm text-body-sm mb-space-2xs truncate ${
                      isLeading ? 'text-on-primary-container' : 'text-on-surface-variant'
                    }`}
                  >
                    Wakil: {candidate.vice_name}
                  </p>
                )}

                {/* Main Percentage & Vote Count */}
                <div className="flex items-baseline gap-space-2xs flex-wrap">
                  <span
                    className={`font-data-xl text-3xl md:text-data-xl font-bold leading-none tabular-nums ${
                      isLeading ? 'text-tertiary-fixed' : 'text-secondary'
                    }`}
                  >
                    {candidate.percentage.toLocaleString('id-ID', { minimumFractionDigits: 1 })}%
                  </span>
                  <span
                    className={`font-data-md text-data-md font-semibold tabular-nums ${
                      isLeading ? 'text-on-primary' : 'text-on-surface'
                    }`}
                  >
                    {candidate.total_votes.toLocaleString('id-ID')} Suara
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  className={`w-full h-2 rounded-full mt-space-xs overflow-hidden ${
                    isLeading ? 'bg-primary/80' : 'bg-surface-container-highest'
                  }`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(candidate.percentage, 100)}%`,
                      backgroundColor: candidate.color_hex
                    }}
                  />
                </div>

                {/* Banjar Leading Count & Margin */}
                <div
                  className={`flex justify-between items-center mt-space-3xs text-label-sm font-label-sm ${
                    isLeading ? 'text-on-primary-container' : 'text-on-surface-variant'
                  }`}
                >
                  <span>Unggul di {candidate.banjar_leading_count} Banjar</span>
                  {isLeading ? (
                    <span className="text-tertiary-fixed font-bold tabular-nums">
                      +{margin.toLocaleString('id-ID')} Suara
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums">
                      {totalValidVotes.toLocaleString('id-ID')} Total Masuk
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
