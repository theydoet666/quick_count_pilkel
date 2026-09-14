import React from 'react';
import { ElectionSettings } from '../../types/database.types';

interface CountdownOverlayProps {
  electionSettings: ElectionSettings;
  now: Date;
  onAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  electionSettings,
  now,
  onAdminClick,
  isAdminLoggedIn
}) => {
  // Calculate remaining time
  const getTimeRemaining = () => {
    if (!electionSettings.counting_start_time) return null;
    const target = new Date(electionSettings.counting_start_time).getTime();
    const diff = target - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  };

  const countdown = getTimeRemaining();

  const formattedStartTime = electionSettings.counting_start_time
    ? new Date(electionSettings.counting_start_time).toLocaleString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WITA'
    : 'Pukul 13:00 WITA';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-[#070b12]/80 backdrop-blur-md animate-fadeIn">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Broadcast Countdown Container */}
      <div className="bg-gradient-to-b from-[#0d1522] via-[#0b1019] to-[#070b12] border border-amber-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.15)] relative z-10 text-center overflow-hidden">
        
        {/* Top TV Ribbon Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-rose-500" />
        
        {/* Live Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-wider mb-4 shadow-sm animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Siaran Tabulasi Hitung Cepat • Belum Dimulai</span>
        </div>

        {/* Logo & Header Title */}
        <div className="flex flex-col items-center mb-4">
          {electionSettings.logo_url ? (
            <div className="w-14 h-14 p-1.5 rounded-2xl bg-white/10 border border-white/20 shadow-md flex items-center justify-center mb-2.5">
              <img
                src={electionSettings.logo_url}
                alt="Logo Pemilihan"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-emerald-700/80 border border-emerald-500/40 text-white flex items-center justify-center shadow-lg mb-2.5">
              <span className="material-symbols-outlined text-3xl">how_to_vote</span>
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {electionSettings.title || 'PILKEL DESA BELEGA 2026'}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5 uppercase tracking-wider">
            {electionSettings.organizer || 'Panwaslukel Desa Belega'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {electionSettings.subtitle || 'Kecamatan Blahbatuh • Gianyar, Bali'}
          </p>
        </div>

        {/* Official Announcement Text */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 mb-5 text-slate-200 text-xs sm:text-sm leading-relaxed text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">campaign</span>
            <span>Pengumuman Panitia Pemilihan</span>
          </div>
          <p>
            {electionSettings.counting_notice ||
              'Perhitungan suara TPS resmi dibuka oleh Panitia Pemilihan pada pukul 13.00 WITA. Siaran langsung tabulasi perolehan suara akan otomatis aktif setelah perhitungan suara resmi dimulai.'}
          </p>
        </div>

        {/* Real-time Countdown Timer (Days, Hours, Minutes, Seconds) */}
        {countdown ? (
          <div className="mb-5">
            <div className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-2.5 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-amber-400">timer</span>
              <span>Hitung Mundur Pembukaan Perhitungan Suara</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
              {/* Days */}
              <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-2.5 sm:p-3.5 shadow-md flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight leading-none">
                  {String(countdown.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase mt-1">Hari</span>
              </div>

              {/* Hours */}
              <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-2.5 sm:p-3.5 shadow-md flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight leading-none">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase mt-1">Jam</span>
              </div>

              {/* Minutes */}
              <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-2.5 sm:p-3.5 shadow-md flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight leading-none">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase mt-1">Menit</span>
              </div>

              {/* Seconds */}
              <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-2.5 sm:p-3.5 shadow-md flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight leading-none">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase mt-1">Detik</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3 font-medium">
              Jadwal Resmi: <strong className="text-amber-200">{formattedStartTime}</strong>
            </p>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300">
            <span>Jadwal Perhitungan Suara: <strong>{formattedStartTime}</strong></span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAdminClick}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-emerald-400">
              {isAdminLoggedIn ? 'dashboard' : 'lock'}
            </span>
            <span>{isAdminLoggedIn ? 'Buka Panel Admin' : 'Login Panitia & Operator TPS'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};
