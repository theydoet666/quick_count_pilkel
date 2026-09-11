import React, { useState, useEffect } from 'react';
import { TPSRecapItem, CandidateSummary, TPSStatus } from '../../types/database.types';

interface VoteEntryModalProps {
  tps: TPSRecapItem | null;
  candidates: CandidateSummary[];
  userRole: 'admin' | 'operator' | 'viewer';
  onClose: () => void;
  onSaveVotes: (
    tpsId: string,
    votes1: number,
    votes2: number,
    invalid: number,
    photoUrl?: string,
    newStatus?: TPSStatus,
    additionalVoters?: number
  ) => void;
}

export const VoteEntryModal: React.FC<VoteEntryModalProps> = ({
  tps,
  candidates,
  userRole,
  onClose,
  onSaveVotes
}) => {
  const [additionalVoters, setAdditionalVoters] = useState<number>(tps?.additional_voters || 0);
  const [votes1, setVotes1] = useState<number>(tps?.candidate_votes['1']?.votes || 0);
  const [votes2, setVotes2] = useState<number>(tps?.candidate_votes['2']?.votes || 0);
  const [invalidVotes, setInvalidVotes] = useState<number>(tps?.invalid_votes_count || 0);
  const [photoUrl, setPhotoUrl] = useState<string>(tps?.evidence_photo_url || '');
  const [status, setStatus] = useState<TPSStatus>(tps?.status || 'pending');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (tps) {
      setAdditionalVoters(tps.additional_voters || 0);
      setVotes1(tps.candidate_votes['1']?.votes || 0);
      setVotes2(tps.candidate_votes['2']?.votes || 0);
      setInvalidVotes(tps.invalid_votes_count || 0);
      setPhotoUrl(tps.evidence_photo_url || '');
      setStatus(tps.status);
      setErrorMsg('');
    }
  }, [tps]);

  if (!tps) return null;

  // Calculation Logic
  const dptPokok = tps.registered_voters || 0;
  const dptTambahan = additionalVoters || 0;
  const totalHakPilih = dptPokok + dptTambahan; // DPT + DPT Tambahan

  const totalValidVotes = votes1 + votes2; // Suara Calon 1 + Suara Calon 2
  const totalEnteredVotes = totalValidVotes + invalidVotes; // Total Suara Masuk
  const sisaHakPilih = Math.max(0, totalHakPilih - totalEnteredVotes);
  const participationPct = totalHakPilih > 0 ? ((totalEnteredVotes / totalHakPilih) * 100).toFixed(1) : '0';
  
  const isExceeded = totalEnteredVotes > totalHakPilih;

  // Dynamic candidate data from database/props
  const cand1 = candidates?.find(c => c.number === 1) || candidates?.[0];
  const cand2 = candidates?.find(c => c.number === 2) || candidates?.[1];

  const cand1Name = cand1
    ? `${cand1.name}${cand1.vice_name ? ` & ${cand1.vice_name}` : ''}`
    : 'PASLON 01';
  const cand2Name = cand2
    ? `${cand2.name}${cand2.vice_name ? ` & ${cand2.vice_name}` : ''}`
    : 'PASLON 02';

  const cand1Pct = totalValidVotes > 0 ? ((votes1 / totalValidVotes) * 100).toFixed(1) : '0';
  const cand2Pct = totalValidVotes > 0 ? ((votes2 / totalValidVotes) * 100).toFixed(1) : '0';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (targetStatus?: TPSStatus) => {
    if (isExceeded) {
      setErrorMsg(`Total suara (${totalEnteredVotes}) melebihi total hak pilih (${totalHakPilih} = ${dptPokok} DPT + ${dptTambahan} DPT Tambahan)! Periksa kembali angka.`);
      return;
    }

    const finalStatus = targetStatus || (userRole === 'admin' ? status : 'submitted');
    onSaveVotes(tps.polling_station_id, votes1, votes2, invalidVotes, photoUrl, finalStatus, dptTambahan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-space-md bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-lg w-full p-4 sm:p-space-lg shadow-2xl overflow-y-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container pb-space-sm mb-space-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">
                {tps.code}
              </span>
              <h3 className="font-headline-sm text-base sm:text-lg text-primary font-bold">
                Input & Rekap Suara TPS
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {tps.banjar_name} • DPT Pokok: <strong className="text-on-surface">{dptPokok}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Validation Warning */}
        {isExceeded && (
          <div className="bg-error-container text-on-error-container p-3.5 rounded-xl mb-space-md text-xs sm:text-sm border border-error/40 shadow-xs space-y-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-lg text-error shrink-0">warning</span>
              <div>
                <strong className="block font-bold text-error">Total Suara Melebihi Hak Pilih!</strong>
                <span>Total suara masuk ({totalEnteredVotes}) melebihi total hak pilih DPT + DPT Tambahan ({totalHakPilih}).</span>
              </div>
            </div>
            
            {/* Quick-fix Auto Button */}
            {totalEnteredVotes > dptPokok && (
              <div className="pt-1.5 border-t border-error/20 flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] text-on-error-container">Selisih pemilih tambahan: <strong>+{totalEnteredVotes - dptPokok}</strong></span>
                <button
                  type="button"
                  onClick={() => setAdditionalVoters(totalEnteredVotes - dptPokok)}
                  className="px-2.5 py-1 rounded-lg bg-error text-white font-bold text-xs hover:bg-error/90 transition-all flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                  Set DPT Tambahan = +{totalEnteredVotes - dptPokok}
                </button>
              </div>
            )}
          </div>
        )}

        {errorMsg && !isExceeded && (
          <div className="bg-error-container text-on-error-container p-3 rounded-xl mb-space-md text-xs sm:text-sm">
            {errorMsg}
          </div>
        )}

        {/* Locked warning */}
        {tps.status === 'locked' && userRole !== 'admin' && (
          <div className="bg-surface-container text-on-surface-variant p-3 rounded-xl mb-space-md text-xs sm:text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-amber-500">lock</span>
            <span>Data TPS ini telah dikunci oleh Ketua Panitia. Hanya Admin yang dapat mengubahnya.</span>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3.5">
          
          {/* Section 1: DPT & Pemilih Tambahan */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">badge</span>
                1. Data Pemilih (DPT & Pemilih Tambahan)
              </span>
              <span className="text-[11px] font-bold text-primary tabular-nums">
                Total Hak Pilih: {totalHakPilih} Orang
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-surface p-2 rounded-lg border border-outline-variant/40">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">DPT (Daftar Pemilih Tetap)</span>
                <span className="text-base font-black text-on-surface tabular-nums">{dptPokok}</span>
                <span className="text-[10px] text-on-surface-variant block">Pemilih terdaftar di TPS</span>
              </div>

              <div className="bg-surface p-2 rounded-lg border-2 border-primary/40 focus-within:border-primary shadow-xs">
                <label className="text-[10px] uppercase font-bold text-primary block">Pemilih Tambahan (Luar DPT)</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min="0"
                    value={additionalVoters === 0 ? '' : additionalVoters}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAdditionalVoters(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={tps.status === 'locked' && userRole !== 'admin'}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-0.5 text-sm font-bold text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[11px] font-semibold text-on-surface-variant shrink-0">Org</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Perolehan Suara Sah Calon */}
          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-secondary">how_to_vote</span>
              2. Perolehan Suara Sah Calon
            </span>

            {/* Paslon 01 */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-secondary-fixed/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {cand1?.photo_url && (
                    <img
                      src={cand1.photo_url}
                      alt={cand1Name}
                      className="w-6 h-6 rounded-full object-cover border border-secondary shrink-0"
                    />
                  )}
                  <span className="text-xs font-bold text-secondary truncate">
                    PASLON 0{cand1?.number || 1} — {cand1Name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-secondary tabular-nums">
                  {cand1Pct}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={votes1 === 0 ? '' : votes1}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setVotes1(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={tps.status === 'locked' && userRole !== 'admin'}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-base font-bold text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <span className="text-xs font-semibold text-on-surface-variant shrink-0">Suara</span>
              </div>
            </div>

            {/* Paslon 02 */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-tertiary-fixed/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {cand2?.photo_url && (
                    <img
                      src={cand2.photo_url}
                      alt={cand2Name}
                      className="w-6 h-6 rounded-full object-cover border border-tertiary-fixed-dim shrink-0"
                    />
                  )}
                  <span className="text-xs font-bold text-tertiary-fixed-dim truncate">
                    PASLON 0{cand2?.number || 2} — {cand2Name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-tertiary-fixed-dim tabular-nums">
                  {cand2Pct}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={votes2 === 0 ? '' : votes2}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setVotes2(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={tps.status === 'locked' && userRole !== 'admin'}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-base font-bold text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
                />
                <span className="text-xs font-semibold text-on-surface-variant shrink-0">Suara</span>
              </div>
            </div>
          </div>

          {/* Section 3: Suara Tidak Sah */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs uppercase tracking-wider text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-base">cancel</span>
                3. Suara Tidak Sah (Surat Suara Rusak / Blanko)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={invalidVotes === 0 ? '' : invalidVotes}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => setInvalidVotes(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={tps.status === 'locked' && userRole !== 'admin'}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-base font-bold text-error tabular-nums focus:outline-none focus:ring-1 focus:ring-error"
              />
              <span className="text-xs font-semibold text-on-surface-variant shrink-0">Lembar</span>
            </div>
          </div>

          {/* Section 4: Live Breakdown & Reconciliation */}
          <div className="bg-surface-container p-3.5 rounded-xl text-xs space-y-2 border border-outline-variant/30">
            <div className="flex items-center justify-between font-bold text-on-surface pb-1 border-b border-surface-container-high">
              <span>Rekonsiliasi Pengguna Hak Pilih & Suara</span>
              <span className="text-[11px] text-primary">Partisipasi Hadir: {participationPct}%</span>
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-on-surface-variant">
              <div className="flex justify-between">
                <span>DPT Pokok:</span>
                <strong className="text-on-surface tabular-nums">{dptPokok}</strong>
              </div>
              <div className="flex justify-between">
                <span>Pemilih Tambahan:</span>
                <strong className="text-primary tabular-nums">+{dptTambahan}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Suara Sah Calon:</span>
                <strong className="text-emerald-700 tabular-nums">{totalValidVotes}</strong>
              </div>
              <div className="flex justify-between">
                <span>Suara Tidak Sah:</span>
                <strong className="text-rose-600 tabular-nums">{invalidVotes}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-surface-container-high flex justify-between items-center text-sm">
              <span className="font-bold text-on-surface">Pemilih yang Hadir (Total Suara Masuk):</span>
              <strong className={`text-base font-black tabular-nums ${isExceeded ? 'text-error' : 'text-primary'}`}>
                {totalEnteredVotes} / {totalHakPilih} Pemilih
              </strong>
            </div>
            
            <div className="flex justify-between text-[11px] text-on-surface-variant italic">
              <span>Pemilih Tidak Hadir (Golput):</span>
              <span className="font-semibold tabular-nums">{sisaHakPilih} orang</span>
            </div>
          </div>

          {/* Section 5: Photo Evidence Upload */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-primary">photo_camera</span>
              Unggah Foto Bukti Formulir C-Hasil
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={tps.status === 'locked' && userRole !== 'admin'}
              className="block w-full text-xs text-on-surface-variant file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-container-high file:text-primary hover:file:bg-primary/10"
            />
            {photoUrl && (
              <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden border border-outline-variant shadow-inner">
                <img src={photoUrl} alt="Preview C-Hasil" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Admin Role Status Override */}
          {userRole === 'admin' && (
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Status Verifikasi Panitia
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TPSStatus)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:border-primary"
              >
                <option value="pending">Pending (Belum Diinput)</option>
                <option value="submitted">Submitted (Perlu Verifikasi Admin)</option>
                <option value="verified">Verified (Tampil di Dashboard Publik)</option>
                <option value="locked">Locked (Kunci Data)</option>
                <option value="disputed">Disputed (Sengketa)</option>
              </select>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="mt-5 pt-3 border-t border-surface-container flex flex-wrap gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-semibold transition-colors"
          >
            Batal
          </button>

          {userRole === 'operator' && (
            <button
              onClick={() => handleSave('submitted')}
              disabled={isExceeded || tps.status === 'locked'}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:bg-secondary/90 disabled:opacity-50 transition-colors shadow-xs"
            >
              Simpan & Ajukan Verifikasi
            </button>
          )}

          {userRole === 'admin' && (
            <>
              <button
                onClick={() => handleSave('verified')}
                disabled={isExceeded}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                Tandai Terverifikasi
              </button>
              
              {tps.status !== 'locked' ? (
                <button
                  onClick={() => handleSave('locked')}
                  disabled={isExceeded}
                  className="px-4 py-2 bg-inverse-surface text-inverse-on-surface rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  Kunci Data
                </button>
              ) : (
                <button
                  onClick={() => handleSave('verified')}
                  className="px-4 py-2 bg-error-container text-on-error-container rounded-xl text-xs font-bold hover:bg-error-container/80 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  Buka Kunci
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
