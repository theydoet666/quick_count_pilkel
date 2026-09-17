import React, { useState, useEffect, useRef } from 'react';
import { TPSRecapItem, CandidateSummary, TPSStatus } from '../../types/database.types';
import { showAlert } from '../../lib/alerts';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

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
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  // Calculation helpers
  const dptPokok = tps.registered_voters || 0;
  const dptTambahan = additionalVoters || 0;
  const totalHakPilih = dptPokok + dptTambahan; // Total DPT + DPTb

  const totalValidVotes = votes1 + votes2;
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

  // S-3: Process, compress & upload photo to Supabase Storage
  const processAndUploadPhoto = async (file: File) => {
    // Validasi tipe file (MIME)
    if (!file.type.startsWith('image/')) {
      showAlert.error('File Tidak Valid', 'Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.');
      return;
    }

    // Validasi ukuran file (< 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      showAlert.error('Ukuran Terlalu Besar', 'Ukuran foto maksimal 5 MB.');
      return;
    }

    setIsProcessingPhoto(true);

    try {
      // 1. Kompres gambar di canvas untuk menghemat bandwidth
      const compressedBlob = await new Promise<Blob | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 1400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
            } else {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = event.target?.result as string;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });

      if (!compressedBlob) {
        throw new Error('Gagal memproses gambar');
      }

      if (isSupabaseConfigured) {
        // Upload ke Supabase Storage bucket 'evidence-photos'
        const fileExt = 'jpg';
        const fileName = `${tps.polling_station_id}_${Date.now()}.${fileExt}`;
        const filePath = `c1_plano/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence-photos')
          .upload(filePath, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('evidence-photos')
          .getPublicUrl(filePath);

        setPhotoUrl(publicUrlData.publicUrl);
        showAlert.toast('Foto bukti C1 berhasil diunggah ke storage!', 'success');
      } else {
        // Fallback demo mode: gunakan DataURL
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoUrl(e.target?.result as string);
        };
        reader.readAsDataURL(compressedBlob);
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      showAlert.error('Gagal Unggah Foto', err?.message || 'Terjadi kesalahan saat mengunggah foto bukti.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadPhoto(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSave = (targetStatus?: TPSStatus) => {
    if (isExceeded) {
      const msg = `Total suara (${totalEnteredVotes}) melebihi total hak pilih (${totalHakPilih} = ${dptPokok} DPT + ${dptTambahan} DPT Tambahan)! Periksa kembali rincian angka suara.`;
      setErrorMsg(msg);
      showAlert.warning('Periksa Total Suara', msg);
      return;
    }

    const finalStatus = targetStatus || (userRole === 'admin' ? status : 'submitted');
    onSaveVotes(tps.polling_station_id, votes1, votes2, invalidVotes, photoUrl, finalStatus, dptTambahan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      
      {/* Modal Container: Full/bottom-sheet on mobile, centered card on desktop */}
      <div className="bg-surface-container-lowest border-t sm:border border-outline-variant rounded-t-3xl sm:rounded-2xl max-w-lg w-full flex flex-col h-[94vh] sm:h-auto sm:max-h-[90vh] shadow-2xl overflow-hidden">
        
        {/* Sticky Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-surface-container bg-surface-container-low shrink-0 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="w-10 h-1 bg-outline-variant/60 rounded-full mx-auto sm:hidden mb-2" />
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white font-black text-xs shrink-0 shadow-xs">
                {tps.code}
              </span>
              <h3 className="font-headline-sm text-sm sm:text-base text-slate-900 font-bold truncate">
                Input & Rekap Suara
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
              {tps.banjar_name} • DPT Pokok: <strong className="text-slate-800">{dptPokok}</strong>
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors shrink-0"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 overscroll-contain">
          
          {/* Validation Warning */}
          {isExceeded && (
            <div className="bg-error-container text-on-error-container p-3 sm:p-3.5 rounded-xl text-xs sm:text-sm border border-error/40 shadow-xs space-y-2">
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
                    className="px-2.5 py-1 rounded-lg bg-error text-white font-bold text-xs hover:bg-error/90 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                    Set DPT Tambahan = +{totalEnteredVotes - dptPokok}
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMsg && !isExceeded && (
            <div className="bg-error-container text-on-error-container p-3 rounded-xl text-xs sm:text-sm">
              {errorMsg}
            </div>
          )}

          {/* Locked warning */}
          {tps.status === 'locked' && userRole !== 'admin' && (
            <div className="bg-amber-50 text-amber-900 border border-amber-200 p-3 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-amber-600 shrink-0">lock</span>
              <span>Data TPS ini telah dikunci oleh Ketua Panitia. Hanya Admin yang dapat mengubahnya.</span>
            </div>
          )}

          {/* Section 1: DPT & Pemilih Tambahan */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-700">badge</span>
                1. Data Pemilih (DPT & DPTb)
              </span>
              <span className="text-[11px] font-bold text-emerald-800 tabular-nums">
                Hak Pilih: {totalHakPilih} Orang
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">DPT Pokok</span>
                <span className="text-base font-black text-slate-900 tabular-nums">{dptPokok}</span>
                <span className="text-[10px] text-slate-400 block truncate">Pemilih Tetap</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border-2 border-emerald-600/40 focus-within:border-emerald-600 shadow-xs">
                <label className="text-[10px] uppercase font-bold text-emerald-800 block truncate">Pemilih Tambahan (DPTb)</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min="0"
                    value={additionalVoters === 0 ? '' : additionalVoters}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAdditionalVoters(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={tps.status === 'locked' && userRole !== 'admin'}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm font-bold text-emerald-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">Org</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Perolehan Suara Sah Calon */}
          <div className="space-y-2">
            <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-emerald-700">how_to_vote</span>
              2. Perolehan Suara Sah Calon
            </span>

            {/* Paslon 01 */}
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {cand1?.photo_url ? (
                    <img
                      src={cand1.photo_url}
                      alt={cand1Name}
                      className="w-6 h-6 rounded-full object-cover border border-amber-600 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      01
                    </div>
                  )}
                  <span className="text-xs font-bold text-amber-950 truncate">
                    PASLON 0{cand1?.number || 1} — {cand1Name}
                  </span>
                </div>
                <span className="text-xs font-black text-amber-800 tabular-nums shrink-0 ml-1">
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
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-base font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                />
                <span className="text-xs font-bold text-slate-600 shrink-0">Suara</span>
              </div>
            </div>

            {/* Paslon 02 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {cand2?.photo_url ? (
                    <img
                      src={cand2.photo_url}
                      alt={cand2Name}
                      className="w-6 h-6 rounded-full object-cover border border-slate-400 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      02
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800 truncate">
                    PASLON 0{cand2?.number || 2} — {cand2Name}
                  </span>
                </div>
                <span className="text-xs font-black text-slate-700 tabular-nums shrink-0 ml-1">
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
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-base font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-xs"
                />
                <span className="text-xs font-bold text-slate-600 shrink-0">Suara</span>
              </div>
            </div>
          </div>

          {/* Section 3: Suara Tidak Sah */}
          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-rose-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-base">cancel</span>
                3. Suara Tidak Sah (Rusak / Blanko)
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
                className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-base font-black text-rose-700 tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
              />
              <span className="text-xs font-bold text-slate-600 shrink-0">Lembar</span>
            </div>
          </div>

          {/* Section 4: Live Breakdown & Reconciliation */}
          <div className="bg-slate-100 p-3 sm:p-3.5 rounded-xl text-xs space-y-2 border border-slate-200">
            <div className="flex items-center justify-between font-bold text-slate-900 pb-1 border-b border-slate-200">
              <span>Rekonsiliasi Suara & Hak Pilih</span>
              <span className="text-[11px] text-emerald-800 font-bold">Hadir: {participationPct}%</span>
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-slate-600">
              <div className="flex justify-between">
                <span>DPT Pokok:</span>
                <strong className="text-slate-900 tabular-nums">{dptPokok}</strong>
              </div>
              <div className="flex justify-between">
                <span>DPTb (+):</span>
                <strong className="text-emerald-800 tabular-nums">+{dptTambahan}</strong>
              </div>
              <div className="flex justify-between">
                <span>Suara Sah Calon:</span>
                <strong className="text-emerald-700 tabular-nums">{totalValidVotes}</strong>
              </div>
              <div className="flex justify-between">
                <span>Suara Tidak Sah:</span>
                <strong className="text-rose-600 tabular-nums">{invalidVotes}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs sm:text-sm">
              <span className="font-bold text-slate-900">Total Suara Masuk:</span>
              <strong className={`text-sm sm:text-base font-black tabular-nums ${isExceeded ? 'text-rose-600' : 'text-emerald-800'}`}>
                {totalEnteredVotes} / {totalHakPilih}
              </strong>
            </div>
            
            <div className="flex justify-between text-[11px] text-slate-500 italic">
              <span>Pemilih Tidak Hadir (Golput):</span>
              <span className="font-semibold tabular-nums text-slate-700">{sisaHakPilih} orang</span>
            </div>
          </div>

          {/* Section 5: Mobile-Friendly Photo Upload for C-Hasil */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-700">photo_camera</span>
                5. Bukti Formulir C-Hasil TPS
              </label>
              {photoUrl && (
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  Foto Terlampir
                </span>
              )}
            </div>

            {/* Hidden native file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              disabled={tps.status === 'locked' && userRole !== 'admin'}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={tps.status === 'locked' && userRole !== 'admin'}
              className="hidden"
            />

            {!photoUrl ? (
              /* No Photo State: Action Cards for Mobile & Desktop */
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 sm:p-4 text-center bg-white hover:bg-slate-50/80 transition-colors">
                {isProcessingPhoto ? (
                  <div className="py-4 text-center space-y-1">
                    <span className="material-symbols-outlined text-2xl text-emerald-700 animate-spin">progress_activity</span>
                    <p className="text-xs font-semibold text-slate-600">Mengompres & memproses foto...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-1.5">
                      <span className="material-symbols-outlined text-xl">add_a_photo</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Unggah Formulir C-Hasil
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Ambil foto langsung melalui kamera HP atau pilih dari galeri berkas.
                    </p>

                    {/* Touch-Friendly Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={tps.status === 'locked' && userRole !== 'admin'}
                        className="px-2.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                        <span>Buka Kamera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={tps.status === 'locked' && userRole !== 'admin'}
                        className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">folder_open</span>
                        <span>Pilih Galeri</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Photo Uploaded Preview Card */
              <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-black/5 shadow-inner">
                <div className="relative w-full h-36 sm:h-44 bg-slate-900">
                  <img
                    src={photoUrl}
                    alt="Preview Bukti C-Hasil"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={tps.status === 'locked' && userRole !== 'admin'}
                      className="px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1 transition-all"
                      title="Ambil Ulang Foto"
                    >
                      <span className="material-symbols-outlined text-xs">autorenew</span>
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={tps.status === 'locked' && userRole !== 'admin'}
                      className="p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition-all"
                      title="Hapus Foto"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Role Status Override */}
          {userRole === 'admin' && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Status Verifikasi Panitia
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TPSStatus)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
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

        {/* Sticky Modal Action Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-surface-container bg-surface-container-low shrink-0 flex items-center justify-between sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>

          {userRole === 'operator' && (
            <button
              type="button"
              onClick={() => handleSave('submitted')}
              disabled={isExceeded || tps.status === 'locked'}
              className="flex-1 sm:flex-initial px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Simpan & Ajukan</span>
            </button>
          )}

          {userRole === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave('verified')}
                disabled={isExceeded}
                className="px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>Verifikasi</span>
              </button>
              
              {tps.status !== 'locked' ? (
                <button
                  type="button"
                  onClick={() => handleSave('locked')}
                  disabled={isExceeded}
                  className="px-3.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Kunci</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave('verified')}
                  className="px-3.5 py-2 bg-red-100 text-red-800 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  <span>Buka Kunci</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
