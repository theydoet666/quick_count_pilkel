import React from 'react';
import { ElectionSummary } from '../types/database.types';

interface SummaryCardsProps {
  summary: ElectionSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const validPercentage = summary.total_votes_entered > 0
    ? ((summary.total_valid_votes / summary.total_votes_entered) * 100).toFixed(1)
    : '0';

  const invalidPercentage = summary.total_votes_entered > 0
    ? ((summary.total_invalid_votes / summary.total_votes_entered) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-12 gap-space-sm">
      {/* Suara Sah */}
      <div className="col-span-4 bg-surface-container-lowest rounded-lg p-space-sm text-center border border-outline-variant/30 shadow-sm">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block font-semibold">
          Suara Sah
        </span>
        <span className="font-data-md text-data-md md:text-2xl font-bold text-primary block my-space-3xs tabular-nums">
          {summary.total_valid_votes.toLocaleString('id-ID')}
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
          {validPercentage}%
        </span>
      </div>

      {/* Suara Tidak Sah */}
      <div className="col-span-4 bg-surface-container-lowest rounded-lg p-space-sm text-center border border-outline-variant/30 shadow-sm">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block font-semibold">
          Tidak Sah
        </span>
        <span className="font-data-md text-data-md md:text-2xl font-bold text-error block my-space-3xs tabular-nums">
          {summary.total_invalid_votes.toLocaleString('id-ID')}
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
          {invalidPercentage}%
        </span>
      </div>

      {/* Partisipasi */}
      <div className="col-span-4 bg-surface-container-lowest rounded-lg p-space-sm text-center border border-outline-variant/30 shadow-sm">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block font-semibold">
          Partisipasi
        </span>
        <span className="font-data-md text-data-md md:text-2xl font-bold text-secondary block my-space-3xs tabular-nums">
          {summary.participation_rate.toLocaleString('id-ID')}%
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
          {summary.total_dpt.toLocaleString('id-ID')} DPT
        </span>
      </div>
    </div>
  );
};
