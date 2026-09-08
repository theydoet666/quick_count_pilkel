import React, { useState } from 'react';
import { useRealtimeResults } from '../hooks/useRealtimeResults';
import { VoteEntryModal } from '../components/admin/VoteEntryModal';
import { TPSAuditLogModal } from '../components/admin/TPSAuditLogModal';
import { ElectionSettingsTab } from '../components/admin/ElectionSettingsTab';
import { TPSManagementTab } from '../components/admin/TPSManagementTab';
import { CandidateManagementTab } from '../components/admin/CandidateManagementTab';
import { TPSRecapItem, UserRole, TPSStatus } from '../types/database.types';

interface AdminDashboardProps {
  userEmail: string;
  role: UserRole;
  fullName: string;
  onLogout: () => void;
  onViewPublic: () => void;
}

type AdminTab = 'recap' | 'settings' | 'tps' | 'candidates';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userEmail,
  role,
  fullName,
  onLogout,
  onViewPublic
}) => {
  const {
    summary,
    tpsList,
    candidatesList,
    electionSettings,
    updateSettings,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addTPS,
    updateTPSDetails,
    deleteTPS,
    updateTPSLocal,
    updateTPSStatusLocal
  } = useRealtimeResults();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('recap');
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
      <header className="bg-primary-container text-on-primary border-b border-tertiary-fixed-dim/30 shadow-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop h-16 flex items-center justify-between gap-space-md">
          
          <div className="flex items-center gap-3">
            {/* Custom Logo or Default Civic Emblem */}
            <div className="w-10 h-10 rounded-full bg-surface p-1 shadow-sm border border-outline-variant/30 flex items-center justify-center overflow-hidden shrink-0">
              {electionSettings.logo_url ? (
                <img src={electionSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full text-primary" fill="currentColor">
                  <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="#2F4030" strokeWidth="6" />
                  <circle cx="50" cy="50" r="22" fill="#9C4A32" />
                  <path d="M50 20 L55 35 L70 35 L58 45 L62 60 L50 50 L38 60 L42 45 L30 35 L45 35 Z" fill="#B8933F" />
                </svg>
              )}
            </div>

            <div>
              <h1 className="font-headline-sm text-base md:text-lg font-bold text-on-primary truncate max-w-xs sm:max-w-md">
                {electionSettings.title}
              </h1>
              <p className="text-body-sm text-on-primary-container hidden sm:block">
                Petugas: <strong>{fullName}</strong> ({userEmail})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-space-sm">
            {/* Role Chip */}
            <span className={`px-2.5 py-1 rounded-full font-label-sm text-xs font-bold uppercase tracking-wider ${
              role === 'admin' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-surface-container text-on-surface'
            }`}>
              {role}
            </span>

            <button
              onClick={onViewPublic}
              className="px-3 py-1.5 bg-primary hover:bg-primary/80 border border-outline-variant/40 rounded-lg text-on-primary font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">tv</span>
              <span className="hidden md:inline">Dashboard Publik</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-error-container text-on-error-container rounded-lg font-label-sm text-xs font-semibold hover:bg-error-container/80 transition-colors flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation Menu */}
        <div className="bg-[#1b2b1d] border-t border-white/10 px-margin-mobile md:px-margin-desktop">
          <div className="max-w-[1440px] mx-auto flex items-center gap-2 overflow-x-auto py-1">
            
            <button
              onClick={() => setActiveTab('recap')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'recap'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">ballot</span>
              Rekapitulasi Suara
            </button>

            {role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'settings'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">settings</span>
                  Pengaturan & Logo
                </button>

                <button
                  onClick={() => setActiveTab('tps')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'tps'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">how_to_vote</span>
                  Kelola TPS & DPT ({tpsList.length})
                </button>

                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'candidates'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">badge</span>
                  Kelola Calon & Foto ({candidatesList.length})
                </button>
              </>
            )}

          </div>
        </div>
      </header>

      {/* Main Admin Content based on active tab */}
      <main className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-space-md flex-1 w-full space-y-space-md">
        
        {/* TAB 1: REKAPITULASI SUARA */}
        {activeTab === 'recap' && (
          <>
            {/* Status Metrics Bar */}
            <div className="grid grid-cols-12 gap-space-sm">
              <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-xl border border-outline-variant/30 text-center shadow-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
                  Verified / Locked
                </span>
                <span className="font-data-lg text-data-lg font-bold text-primary block tabular-nums my-space-3xs">
                  {verifiedCount + lockedCount} / {tpsList.length}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Tampil di Publik</span>
              </div>

              <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-xl border border-outline-variant/30 text-center shadow-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
                  Submitted (Draft)
                </span>
                <span className="font-data-lg text-data-lg font-bold text-secondary block tabular-nums my-space-3xs">
                  {submittedCount}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Perlu Verifikasi</span>
              </div>

              <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-xl border border-outline-variant/30 text-center shadow-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
                  Pending
                </span>
                <span className="font-data-lg text-data-lg font-bold text-on-surface-variant block tabular-nums my-space-3xs">
                  {pendingCount}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Belum Diinput</span>
              </div>

              <div className="col-span-6 sm:col-span-3 bg-surface-container-lowest p-space-sm rounded-xl border border-outline-variant/30 text-center shadow-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold block">
                  Total DPT Terdaftar
                </span>
                <span className="font-data-lg text-data-lg font-bold text-primary block tabular-nums my-space-3xs">
                  {summary.total_dpt.toLocaleString('id-ID')}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{tpsList.length} TPS</span>
              </div>
            </div>

            {/* TPS Management Ledger Table */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
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
                  <thead className="bg-surface-container text-on-surface-variant font-label-sm text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-bold">TPS / Banjar</th>
                      <th className="py-3 px-2 text-center font-bold">DPT</th>
                      {summary.candidates.map((c) => (
                        <th key={c.id} className="py-3 px-2 text-center font-bold">
                          0{c.number} {c.name.split(',')[0]}
                        </th>
                      ))}
                      <th className="py-3 px-2 text-center font-bold">Tidak Sah</th>
                      <th className="py-3 px-2 text-center font-bold">Status TPS</th>
                      <th className="py-3 px-4 text-right font-bold">Aksi Panitia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-sm">
                    {tpsList.map((tps) => {
                      return (
                        <tr key={tps.polling_station_id} className="hover:bg-surface-container-low transition-colors">
                          {/* TPS Code & Banjar */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-on-surface block leading-tight">{tps.code}</span>
                            <span className="text-xs text-on-surface-variant">{tps.banjar_name}</span>
                          </td>

                          {/* DPT */}
                          <td className="py-3 px-2 text-center font-semibold text-on-surface tabular-nums">
                            {tps.registered_voters.toLocaleString('id-ID')}
                          </td>

                          {/* Candidate Votes */}
                          {summary.candidates.map((c) => {
                            const votes = tps.candidate_votes[String(c.number)]?.votes || 0;
                            return (
                              <td key={c.id} className="py-3 px-2 text-center font-bold tabular-nums" style={{ color: c.color_hex }}>
                                {votes.toLocaleString('id-ID')}
                              </td>
                            );
                          })}

                          {/* Invalid Votes */}
                          <td className="py-3 px-2 text-center font-bold text-error tabular-nums">
                            {tps.invalid_votes_count.toLocaleString('id-ID')}
                          </td>

                          {/* Status Chip */}
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-xs uppercase ${
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
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {/* Input/Edit Button */}
                            <button
                              onClick={() => setSelectedTpsForVote(tps)}
                              className="px-2.5 py-1 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                              title="Input / Edit Suara"
                            >
                              <span className="material-symbols-outlined text-xs align-middle mr-0.5">edit</span>
                              Input
                            </button>

                            {/* Admin Direct Verify Action */}
                            {role === 'admin' && tps.status === 'submitted' && (
                              <button
                                onClick={() => handleVerifyTPS(tps.polling_station_id)}
                                className="px-2.5 py-1 bg-tertiary-container text-tertiary-fixed-dim rounded-lg text-xs font-bold hover:bg-tertiary-container/80 transition-colors"
                                title="Tandai Terverifikasi"
                              >
                                Verifikasi
                              </button>
                            )}

                            {/* Admin Lock / Unlock Action */}
                            {role === 'admin' && (tps.status === 'verified' || tps.status === 'locked') && (
                              <button
                                onClick={() => handleLockTPS(tps.polling_station_id, tps.status)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
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
          </>
        )}

        {/* TAB 2: PENGATURAN LOGO & JUDUL (ADMIN ONLY) */}
        {activeTab === 'settings' && role === 'admin' && (
          <ElectionSettingsTab
            settings={electionSettings}
            onSaveSettings={updateSettings}
          />
        )}

        {/* TAB 3: KELOLA TPS & DPT (ADMIN ONLY) */}
        {activeTab === 'tps' && role === 'admin' && (
          <TPSManagementTab
            tpsList={tpsList}
            onAddTPS={addTPS}
            onUpdateTPS={updateTPSDetails}
            onDeleteTPS={deleteTPS}
          />
        )}

        {/* TAB 4: KELOLA CALON & FOTO (ADMIN ONLY) */}
        {activeTab === 'candidates' && role === 'admin' && (
          <CandidateManagementTab
            candidates={candidatesList}
            onAddCandidate={addCandidate}
            onUpdateCandidate={updateCandidate}
            onDeleteCandidate={deleteCandidate}
          />
        )}

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

