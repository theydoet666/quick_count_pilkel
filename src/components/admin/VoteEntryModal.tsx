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
    newStatus?: TPSStatus
  ) => void;
}

export const VoteEntryModal: React.FC<VoteEntryModalProps> = ({
  tps,
  candidates,
  userRole,
  onClose,
  onSaveVotes
}) => {
  const [votes1, setVotes1] = useState<number>(tps?.candidate_votes['1']?.votes || 0);
  const [votes2, setVotes2] = useState<number>(tps?.candidate_votes['2']?.votes || 0);
  const [invalidVotes, setInvalidVotes] = useState<number>(tps?.invalid_votes_count || 0);
  const [photoUrl, setPhotoUrl] = useState<string>(tps?.evidence_photo_url || '');
  const [status, setStatus] = useState<TPSStatus>(tps?.status || 'pending');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (tps) {
      setVotes1(tps.candidate_votes['1']?.votes || 0);
      setVotes2(tps.candidate_votes['2']?.votes || 0);
      setInvalidVotes(tps.invalid_votes_count || 0);
      setPhotoUrl(tps.evidence_photo_url || '');
      setStatus(tps.status);
      setErrorMsg('');
    }
  }, [tps]);

  if (!tps) return null;

  const totalCalculated = votes1 + votes2 + invalidVotes;
  const isExceeded = totalCalculated > tps.registered_voters;

  // Dynamic candidate data from database/props
  const cand1 = candidates?.find(c => c.number === 1) || candidates?.[0];
  const cand2 = candidates?.find(c => c.number === 2) || candidates?.[1];

  const cand1Name = cand1
    ? `${cand1.name}${cand1.vice_name ? ` & ${cand1.vice_name}` : ''}`
    : 'PASLON 01';
  const cand2Name = cand2
    ? `${cand2.name}${cand2.vice_name ? ` & ${cand2.vice_name}` : ''}`
    : 'PASLON 02';

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
      setErrorMsg(`Total suara (${totalCalculated}) melebihi jumlah DPT TPS (${tps.registered_voters})! Periksa kembali angka.`);
      return;
    }

    const finalStatus = targetStatus || (userRole === 'admin' ? status : 'submitted');
    onSaveVotes(tps.polling_station_id, votes1, votes2, invalidVotes, photoUrl, finalStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-lg w-full p-space-md md:p-space-lg shadow-xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container pb-space-sm mb-space-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
              Input Suara — {tps.code}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              {tps.banjar_name} (DPT: <strong className="text-on-surface">{tps.registered_voters}</strong>)
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
          <div className="bg-error-container text-on-error-container p-space-sm rounded mb-space-md text-body-sm border border-error/40 flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-lg">warning</span>
            <span>Total suara ({totalCalculated}) melebihi DPT ({tps.registered_voters}).</span>
          </div>
        )}

        {errorMsg && !isExceeded && (
          <div className="bg-error-container text-on-error-container p-space-sm rounded mb-space-md text-body-sm">
            {errorMsg}
          </div>
        )}

        {/* Locked warning */}
        {tps.status === 'locked' && userRole !== 'admin' && (
          <div className="bg-surface-container text-on-surface-variant p-space-sm rounded mb-space-md text-body-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>Data TPS ini telah dikunci oleh Ketua Panitia. Hanya Admin yang dapat mengubahnya.</span>
          </div>
        )}

        {/* Form Input Votes */}
        <div className="space-y-space-md">
          
          {/* Paslon 01 */}
          <div className="p-space-sm rounded bg-surface-container-low border border-secondary-fixed/50">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-2">
                {cand1?.photo_url && (
                  <img
                    src={cand1.photo_url}
                    alt={cand1Name}
                    className="w-6 h-6 rounded-full object-cover border border-secondary shrink-0"
                  />
                )}
                <span className="font-label-md text-label-md font-bold text-secondary">
                  PASLON 0{cand1?.number || 1} — {cand1Name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm">
              <input
                type="number"
                min="0"
                value={votes1}
                onChange={(e) => setVotes1(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={tps.status === 'locked' && userRole !== 'admin'}
                className="w-full bg-surface border border-outline-variant rounded px-space-sm py-space-xs text-body-lg font-bold text-primary tabular-nums"
              />
              <span className="text-body-sm font-semibold text-on-surface-variant">Suara</span>
            </div>
          </div>

          {/* Paslon 02 */}
          <div className="p-space-sm rounded bg-surface-container-low border border-tertiary-fixed/50">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-2">
                {cand2?.photo_url && (
                  <img
                    src={cand2.photo_url}
                    alt={cand2Name}
                    className="w-6 h-6 rounded-full object-cover border border-tertiary-fixed-dim shrink-0"
                  />
                )}
                <span className="font-label-md text-label-md font-bold text-tertiary-fixed-dim">
                  PASLON 0{cand2?.number || 2} — {cand2Name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm">
              <input
                type="number"
                min="0"
                value={votes2}
                onChange={(e) => setVotes2(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={tps.status === 'locked' && userRole !== 'admin'}
                className="w-full bg-surface border border-outline-variant rounded px-space-sm py-space-xs text-body-lg font-bold text-primary tabular-nums"
              />
              <span className="text-body-sm font-semibold text-on-surface-variant">Suara</span>
            </div>
          </div>

          {/* Suara Tidak Sah */}
          <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/40">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-md text-label-md font-bold text-error">
                Suara Tidak Sah
              </span>
            </div>
            <div className="flex items-center gap-space-sm">
              <input
                type="number"
                min="0"
                value={invalidVotes}
                onChange={(e) => setInvalidVotes(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={tps.status === 'locked' && userRole !== 'admin'}
                className="w-full bg-surface border border-outline-variant rounded px-space-sm py-space-xs text-body-lg font-bold text-error tabular-nums"
              />
              <span className="text-body-sm font-semibold text-on-surface-variant">Lembar</span>
            </div>
          </div>

          {/* Total Calculation Summary */}
          <div className="bg-surface-container p-space-sm rounded text-body-sm flex justify-between items-center">
            <span>Total Suara Masuk (Sah + Tidak Sah):</span>
            <strong className={`font-bold tabular-nums ${isExceeded ? 'text-error' : 'text-primary'}`}>
              {totalCalculated} / {tps.registered_voters} DPT
            </strong>
          </div>

          {/* Photo Evidence Upload */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-space-xs">
              Unggah Foto Bukti Formulir C-Hasil
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={tps.status === 'locked' && userRole !== 'admin'}
              className="block w-full text-body-sm text-on-surface-variant file:mr-space-sm file:py-space-xs file:px-space-md file:rounded file:border-0 file:text-label-sm file:font-semibold file:bg-surface-container-high file:text-primary hover:file:bg-primary/10"
            />
            {photoUrl && (
              <div className="mt-space-xs relative w-full h-32 rounded overflow-hidden border border-outline-variant">
                <img src={photoUrl} alt="Preview C-Hasil" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Admin Role Status Override */}
          {userRole === 'admin' && (
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-space-xs">
                Status Verifikasi Panitia
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TPSStatus)}
                className="w-full bg-surface border border-outline-variant rounded px-space-sm py-space-xs text-body-md font-semibold focus:border-primary"
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
        <div className="mt-space-lg pt-space-md border-t border-surface-container flex flex-wrap gap-space-xs justify-end">
          <button
            onClick={onClose}
            className="px-space-md py-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface rounded font-label-sm font-semibold transition-colors"
          >
            Batal
          </button>

          {userRole === 'operator' && (
            <button
              onClick={() => handleSave('submitted')}
              disabled={isExceeded || tps.status === 'locked'}
              className="px-space-md py-space-xs bg-secondary text-on-secondary rounded font-label-sm font-bold hover:bg-secondary/90 disabled:opacity-50 transition-colors"
            >
              Simpan & Ajukan Verifikasi
            </button>
          )}

          {userRole === 'admin' && (
            <>
              <button
                onClick={() => handleSave('verified')}
                disabled={isExceeded}
                className="px-space-md py-space-xs bg-primary text-on-primary rounded font-label-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-space-3xs"
              >
                <span className="material-symbols-outlined text-base">verified</span>
                Tandai Terverifikasi
              </button>
              
              {tps.status !== 'locked' ? (
                <button
                  onClick={() => handleSave('locked')}
                  disabled={isExceeded}
                  className="px-space-md py-space-xs bg-inverse-surface text-inverse-on-surface rounded font-label-sm font-bold hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-space-3xs"
                >
                  <span className="material-symbols-outlined text-base">lock</span>
                  Kunci Data
                </button>
              ) : (
                <button
                  onClick={() => handleSave('verified')}
                  className="px-space-md py-space-xs bg-error-container text-on-error-container rounded font-label-sm font-bold hover:bg-error-container/80 transition-colors flex items-center gap-space-3xs"
                >
                  <span className="material-symbols-outlined text-base">lock_open</span>
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
