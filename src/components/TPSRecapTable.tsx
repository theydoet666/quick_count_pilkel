import React from 'react';
import { TPSRecapItem, CandidateSummary } from '../types/database.types';

interface TPSRecapTableProps {
  tpsList: TPSRecapItem[];
  candidates: CandidateSummary[];
  onViewEvidence: (tps: TPSRecapItem) => void;
}

export const TPSRecapTable: React.FC<TPSRecapTableProps> = ({
  tpsList,
  candidates,
  onViewEvidence
}) => {
  const c1Name = candidates.find(c => c.number === 1)?.name.split(',')[0] || 'Paslon 01';
  const c2Name = candidates.find(c => c.number === 2)?.name.split(',')[0] || 'Paslon 02';

  // Compute grand totals
  const grandValid = tpsList.reduce((sum, t) => sum + t.total_valid_votes, 0);
  const grandC1 = tpsList.reduce((sum, t) => sum + (t.candidate_votes['1']?.votes || 0), 0);
  const grandC2 = tpsList.reduce((sum, t) => sum + (t.candidate_votes['2']?.votes || 0), 0);

  const grandC1Pct = grandValid > 0 ? ((grandC1 / grandValid) * 100).toFixed(1) : '0';
  const grandC2Pct = grandValid > 0 ? ((grandC2 / grandValid) * 100).toFixed(1) : '0';
  const netMargin = grandC1 - grandC2;

  return (
    <div className="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col h-full">
      {/* Table Header */}
      <div className="p-space-sm border-b border-surface-container flex items-center justify-between flex-wrap gap-space-xs">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary text-xl">ballot</span>
          <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
            Rekapitulasi Suara Per TPS
          </h3>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-space-sm font-label-sm text-label-sm">
          <div className="flex items-center gap-space-3xs">
            <span className="w-3 h-3 rounded-full bg-secondary inline-block" /> 01 {c1Name}
          </div>
          <div className="flex items-center gap-space-3xs">
            <span className="w-3 h-3 rounded-full bg-tertiary inline-block" /> 02 {c2Name}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
            <tr>
              <th className="py-space-xs px-space-md font-bold">Lokasi TPS / Banjar</th>
              <th className="py-space-xs px-space-sm text-center font-bold">Suara Sah</th>
              <th className="py-space-xs px-space-sm text-center font-bold bg-secondary-fixed/30 text-on-secondary-fixed">
                01 {c1Name}
              </th>
              <th className="py-space-xs px-space-sm text-center font-bold bg-tertiary-fixed/30 text-on-tertiary-fixed">
                02 {c2Name}
              </th>
              <th className="py-space-xs px-space-md text-right font-bold">Hasil TPS</th>
              <th className="py-space-xs px-space-xs text-center font-bold">Bukti C-Hasil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-body-md font-body-md">
            {tpsList.map((tps) => {
              const v1 = tps.candidate_votes['1']?.votes || 0;
              const p1 = tps.total_valid_votes > 0 ? ((v1 / tps.total_valid_votes) * 100).toFixed(1) : '0';

              const v2 = tps.candidate_votes['2']?.votes || 0;
              const p2 = tps.total_valid_votes > 0 ? ((v2 / tps.total_valid_votes) * 100).toFixed(1) : '0';

              const isC1Leading = tps.leading_candidate_number === 1;

              return (
                <tr key={tps.polling_station_id} className="hover:bg-surface-container-low transition-colors">
                  {/* TPS Code & Banjar */}
                  <td className="py-space-xs px-space-md">
                    <span className="font-bold text-on-surface block leading-tight">{tps.code}</span>
                    <span className="text-body-sm font-body-sm text-on-surface-variant">{tps.banjar_name}</span>
                  </td>

                  {/* Valid Votes */}
                  <td className="py-space-xs px-space-sm text-center font-semibold text-on-surface tabular-nums">
                    {tps.total_valid_votes.toLocaleString('id-ID')}
                  </td>

                  {/* Paslon 01 */}
                  <td className="py-space-xs px-space-sm text-center bg-secondary-fixed/10 font-bold text-secondary tabular-nums">
                    {v1.toLocaleString('id-ID')}{' '}
                    <span className="font-normal text-body-sm text-on-surface-variant">({p1}%)</span>
                  </td>

                  {/* Paslon 02 */}
                  <td className="py-space-xs px-space-sm text-center bg-tertiary-fixed/10 font-bold text-tertiary-fixed-dim tabular-nums">
                    {v2.toLocaleString('id-ID')}{' '}
                    <span className="font-normal text-body-sm text-on-surface-variant">({p2}%)</span>
                  </td>

                  {/* Margin Badge */}
                  <td className="py-space-xs px-space-md text-right">
                    {tps.total_valid_votes > 0 ? (
                      <span
                        className={`px-space-xs py-space-3xs rounded font-label-sm text-label-sm font-bold inline-block tabular-nums ${
                          isC1Leading
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-tertiary text-on-tertiary'
                        }`}
                      >
                        {isC1Leading ? '01' : '02'} (+{tps.vote_margin})
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-on-surface-variant italic">Belum Ada Data</span>
                    )}
                  </td>

                  {/* Evidence Photo Button */}
                  <td className="py-space-xs px-space-xs text-center">
                    <button
                      onClick={() => onViewEvidence(tps)}
                      className="p-1 rounded text-primary hover:bg-surface-container-high transition-colors"
                      title="Lihat Foto Formulir C-Hasil"
                    >
                      <span className="material-symbols-outlined text-lg">image</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Total Row */}
          <tfoot className="bg-surface-container font-bold text-on-surface border-t-2 border-outline-variant/40">
            <tr>
              <td className="py-space-xs px-space-md font-label-lg text-label-lg uppercase">
                TOTAL ({tpsList.length} TPS)
              </td>
              <td className="py-space-xs px-space-sm text-center tabular-nums">
                {grandValid.toLocaleString('id-ID')}
              </td>
              <td className="py-space-xs px-space-sm text-center bg-secondary-fixed/30 text-secondary font-data-md text-data-md tabular-nums">
                {grandC1.toLocaleString('id-ID')}{' '}
                <span className="text-label-sm block font-normal text-on-surface-variant">({grandC1Pct}%)</span>
              </td>
              <td className="py-space-xs px-space-sm text-center bg-tertiary-fixed/30 text-tertiary-fixed-dim font-data-md text-data-md tabular-nums">
                {grandC2.toLocaleString('id-ID')}{' '}
                <span className="text-label-sm block font-normal text-on-surface-variant">({grandC2Pct}%)</span>
              </td>
              <td className="py-space-xs px-space-md text-right" colSpan={2}>
                <span className="font-label-sm text-label-sm text-primary font-bold tabular-nums">
                  {netMargin >= 0 ? `01 (+${netMargin.toLocaleString('id-ID')})` : `02 (+${Math.abs(netMargin).toLocaleString('id-ID')})`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Verification footer note */}
      <div className="bg-surface-container-low px-space-md py-space-xs flex items-center justify-between text-body-sm text-on-surface-variant border-t border-surface-container">
        <span className="flex items-center gap-space-2xs">
          <span className="material-symbols-outlined text-sm text-primary">verified</span>
          C-Hasil terverifikasi lengkap
        </span>
        <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
          Panwaslukel Desa Belega
        </span>
      </div>
    </div>
  );
};
