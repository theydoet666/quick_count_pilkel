import React, { useState } from 'react';
import { useRealtimeResults } from '../hooks/useRealtimeResults';
import { VoteEntryModal } from '../components/admin/VoteEntryModal';
import { TPSAuditLogModal } from '../components/admin/TPSAuditLogModal';
import { TPSRecapItem, UserRole, TPSStatus } from '../types/database.types';

interface AdminDashboardProps {
  userEmail: string;
  role: UserRole;
  fullName: string;
  onLogout: () => void;
  onViewPublic: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userEmail,
  role,
  fullName,
  onLogout,
  onViewPublic
}) => {
  const { summary, tpsList, updateTPSLocal, updateTPSStatusLocal } = useRealtimeResults();
  
  const [selectedTpsForVote, setSelectedTpsForVote] = useState<TPSRecapItem | null>(null);
  const [selectedTpsForAudit, setSelectedTpsForAudit] = useState<TPSRecapItem | null>(null);

  // Status counts
  const pendingCount = tpsList.filter(t => t.status === 'pending').length;
  const submittedCount = tpsList.filter(t => t.status === 'submitted').length;
  const verifiedCount = tpsList.filter(t => t.status === 'verified').length;
  const lockedCount = tpsList.filter(t => t.status === 'locked').length;

  const handleVerifyTPS = (tpsId: string) => {
    updateTPSStatusLocal(tpsId, 'verified');
  };

  const handleLockTPS = (tpsId: string, currentStatus: TPSStatus) => {
    const nextStatus = currentStatus === 'locked' ? 'verified' : 'locked';
    updateTPSStatusLocal(tpsId, nextStatus);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col select-none antialiased">
      
      {/* Top Navbar */}
      <header className="bg-primary-container text-on-primary border-b border-tertiary-fixed-dim/30 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop h-16 flex items-center justify-between gap-space-md">
          
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-2xl text-tertiary-fixed">admin_panel_settings</span>
            <div>
              <h1 className="font-headline-sm text-headline-sm font-bold text-on-primary">
                Panel Panitia Pilkel Belega 2026
              </h1>
              <p className="text-body-sm text-on-primary-container hidden sm:block">
                Petugas: <strong>{fullName}</strong> ({userEmail})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            {/* Role Chip */}
            <span className={`px-space-xs py-space-3xs rounded font-label-sm text-label-sm font-bold uppercase tracking-wider ${
              role === 'admin' ? 'bg-tertiary-container text-tertiary-fixed-dim' : 'bg-surface-container text-on-surface'
            }`}>
              Role: {role}
            </span>

            <button
              onClick={onViewPublic}
              className="px-space-sm py-space-3xs bg-primary hover:bg-primary/80 border border-outline-variant/40 rounded text-on-primary font-label-sm text-label-sm font-semibold flex items-center gap-space-3xs transition-colors"
            >
              <span className="material-symbols-outlined text-base">tv</span>
              <span className="hidden md:inline">Dashboard Publik</span>
            </button>

            <button
              onClick={onLogout}
              className="px-space-sm py-space-3xs bg-error-container text-on-error-container rounded font-label-sm text-label-sm font-semibold hover:bg-error-container/80 transition-colors flex items-center gap-space-3xs"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-space-md flex-1 w-full space-y-space-md">
        
        {/* Status Metrics Bar */}
        <div className="grid grid-cols-12 gap-space-sm">
          
          <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-lg border border-outline-variant/30 text-center shadow-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
              Verified / Locked
            </span>
            <span className="font-data-lg text-data-lg font-bold text-primary block tabular-nums my-space-3xs">
              {verifiedCount + lockedCount} / {tpsList.length}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Tampil di Publik</span>
          </div>

          <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-lg border border-outline-variant/30 text-center shadow-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
              Submitted (Draft)
            </span>
            <span className="font-data-lg text-data-lg font-bold text-secondary block tabular-nums my-space-3xs">
              {submittedCount}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Perlu Verifikasi</span>
          </div>

          <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-lg border border-outline-variant/30 text-center shadow-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
              Pending
            </span>
            <span className="font-data-lg text-data-lg font-bold text-on-surface-variant block tabular-nums my-space-3xs">
              {pendingCount}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Belum Diinput</span>
          </div>

          <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-lg border border-outline-variant/30 text-center shadow-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
              Total DPT Desa
            </span>
            <span className="font-data-lg text-data-lg font-bold text-primary block tabular-nums my-space-3xs">
              {summary.total_dpt.toLocaleString('id-ID')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">6 Banjar</span>
          </div>

        </div>

        {/* TPS Management Ledger Table */}
        <div className="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 overflow-hidden">
          
          <div className="p-space-md border-b border-surface-container flex items-center justify-between flex-wrap gap-space-xs">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                Daftar TPS & Rekapitulasi Panitia
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Kelola input suara, verifikasi data, dan penguncian per TPS Desa Belega.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <tr>
                  <th className="py-space-xs px-space-md font-bold">TPS / Banjar</th>
                  <th className="py-space-xs px-space-sm text-center font-bold">DPT</th>
                  <th className="py-space-xs px-space-sm text-center font-bold">01 Suardika</th>
                  <th className="py-space-xs px-space-sm text-center font-bold">02 Putra Astawa</th>
                  <th className="py-space-xs px-space-sm text-center font-bold">Tidak Sah</th>
                  <th className="py-space-xs px-space-sm text-center font-bold">Status TPS</th>
                  <th className="py-space-xs px-space-md text-right font-bold">Aksi Panitia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-body-md font-body-md">
                {tpsList.map((tps) => {
                  const v1 = tps.candidate_votes['1']?.votes || 0;
                  const v2 = tps.candidate_votes['2']?.votes || 0;

                  return (
                    <tr key={tps.polling_station_id} className="hover:bg-surface-container-low transition-colors">
                      {/* TPS Code & Banjar */}
                      <td className="py-space-xs px-space-md">
                        <span className="font-bold text-on-surface block leading-tight">{tps.code}</span>
                        <span className="text-body-sm text-on-surface-variant">{tps.banjar_name}</span>
                      </td>

                      {/* DPT */}
                      <td className="py-space-xs px-space-sm text-center font-semibold text-on-surface tabular-nums">
                        {tps.registered_voters.toLocaleString('id-ID')}
                      </td>

                      {/* Paslon 01 */}
                      <td className="py-space-xs px-space-sm text-center font-bold text-secondary tabular-nums">
                        {v1.toLocaleString('id-ID')}
                      </td>

                      {/* Paslon 02 */}
                      <td className="py-space-xs px-space-sm text-center font-bold text-tertiary-fixed-dim tabular-nums">
                        {v2.toLocaleString('id-ID')}
                      </td>

                      {/* Invalid Votes */}
                      <td className="py-space-xs px-space-sm text-center font-bold text-error tabular-nums">
                        {tps.invalid_votes_count.toLocaleString('id-ID')}
                      </td>

                      {/* Status Chip */}
                      <td className="py-space-xs px-space-sm text-center">
                        <span className={`px-space-xs py-space-3xs rounded font-label-sm text-label-sm font-bold uppercase tracking-wider ${
                          tps.status === 'verified'
                            ? 'bg-primary-container text-on-primary'
                            : tps.status === 'locked'
                            ? 'bg-inverse-surface text-inverse-on-surface'
                            : tps.status === 'submitted'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {tps.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-space-xs px-space-md text-right space-x-space-2xs">
                        {/* Input/Edit Button */}
                        <button
                          onClick={() => setSelectedTpsForVote(tps)}
                          className="px-space-xs py-space-3xs bg-primary text-on-primary rounded font-label-sm text-label-sm font-semibold hover:bg-primary/90 transition-colors"
                          title="Input / Edit Suara"
                        >
                          <span className="material-symbols-outlined text-sm align-middle mr-1">edit</span>
                          Input
                        </button>

                        {/* Admin Direct Verify Action */}
                        {role === 'admin' && tps.status === 'submitted' && (
                          <button
                            onClick={() => handleVerifyTPS(tps.polling_station_id)}
                            className="px-space-xs py-space-3xs bg-tertiary-container text-tertiary-fixed-dim rounded font-label-sm text-label-sm font-bold hover:bg-tertiary-container/80 transition-colors"
                            title="Tandai Terverifikasi"
                          >
                            Verifikasi
                          </button>
                        )}

                        {/* Admin Lock / Unlock Action */}
                        {role === 'admin' && (tps.status === 'verified' || tps.status === 'locked') && (
                          <button
                            onClick={() => handleLockTPS(tps.polling_station_id, tps.status)}
                            className={`px-space-xs py-space-3xs rounded font-label-sm text-label-sm font-bold transition-colors ${
                              tps.status === 'locked'
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container-high text-on-surface'
                            }`}
                            title={tps.status === 'locked' ? 'Buka Kunci' : 'Kunci TPS'}
                          >
                            {tps.status === 'locked' ? 'Unlock' : 'Lock'}
                          </button>
                        )}

                        {/* Audit Log Button */}
                        <button
                          onClick={() => setSelectedTpsForAudit(tps)}
                          className="p-1 text-on-surface-variant hover:text-primary rounded transition-colors"
                          title="Lihat Riwayat Audit Log"
                        >
                          <span className="material-symbols-outlined text-base align-middle">history</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

      </main>

      {/* Modals */}
      <VoteEntryModal
        tps={selectedTpsForVote}
        candidates={summary.candidates}
        userRole={role}
        onClose={() => setSelectedTpsForVote(null)}
        onSaveVotes={updateTPSLocal}
      />

      <TPSAuditLogModal
        tps={selectedTpsForAudit}
        onClose={() => setSelectedTpsForAudit(null)}
      />

    </div>
  );
};
