import React, { useState, useEffect } from 'react';

interface HeaderBroadcastProps {
  verifiedTpsCount: number;
  totalTpsCount: number;
  isLive: boolean;
  title?: string;
  subtitle?: string;
  logoUrl?: string | null;
  onAdminClick?: () => void;
  isAdminLoggedIn?: boolean;
}

export const HeaderBroadcast: React.FC<HeaderBroadcastProps> = ({
  verifiedTpsCount,
  totalTpsCount,
  isLive,
  title = 'PILKEL DESA BELEGA 2026',
  subtitle = 'Kecamatan Blahbatuh • Gianyar, Bali',
  logoUrl = null,
  onAdminClick,
  isAdminLoggedIn
}) => {
  const percentage = totalTpsCount > 0 ? Math.round((verifiedTpsCount / totalTpsCount) * 100) : 0;
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WITA'
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#0a0e14]/95 backdrop-blur-md border-b border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Top TV Color Accent Ribbon */}
      <div className="h-1 w-full bg-gradient-to-r from-rose-600 via-amber-400 to-emerald-500" />

      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop flex items-center justify-between gap-space-md">
        
        {/* Left Brand / Broadcast Logo */}
        <div className="flex items-center gap-space-sm">
          <div className="relative w-11 h-11 rounded-full flex items-center justify-center bg-[#111827] p-1 shadow-md border-2 border-amber-400/40 overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-400" fill="currentColor">
                <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="#22c55e" strokeWidth="6" />
                <circle cx="50" cy="50" r="22" fill="#e11d48" />
                <path d="M50 20 L55 35 L70 35 L58 45 L62 60 L50 50 L38 60 L42 45 L30 35 L45 35 Z" fill="#fbbf24" />
              </svg>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-2xs">
              <span className="font-label-lg text-label-md md:text-label-lg text-white uppercase font-black tracking-wide leading-tight truncate">
                {title}
              </span>
              <span className="hidden sm:inline-flex bg-red-600/90 text-white text-[10px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase shadow-sm shrink-0">
                STUDIO LIVE
              </span>
            </div>
            <span className="font-label-sm text-body-sm text-slate-400 tracking-wider uppercase font-medium truncate">
              {subtitle}
            </span>
          </div>
        </div>


        {/* Center / Right Broadcast Metrics */}
        <div className="flex items-center gap-space-xs md:gap-space-sm">
          
          {/* Live Studio Badge & Pulse */}
          <div className="flex items-center gap-2 bg-[#111827] px-3 py-1.5 rounded-full border border-slate-700 shadow-md">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-red-500' : 'bg-amber-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-red-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-black text-xs tracking-wider text-red-500 uppercase hidden md:inline">
              LIVE ON-AIR
            </span>
            <span className="text-slate-700 hidden md:inline">|</span>
            <span className="font-data-md text-xs md:text-sm font-bold text-white tabular-nums">
              {verifiedTpsCount}/{totalTpsCount} TPS ({percentage}%)
            </span>
          </div>

          {/* Realtime Digital Clock */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#111827] px-3 py-1.5 rounded-md border border-slate-700 text-xs font-semibold text-amber-300 tabular-nums shadow-sm">
            <span className="material-symbols-outlined text-sm text-amber-400">schedule</span>
            {currentTime || '00:00:00 WITA'}
          </div>

          {/* Fullscreen TV / Presentation Mode Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-md bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors flex items-center justify-center shadow-sm"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (TV / Proyektor)'}
          >
            <span className="material-symbols-outlined text-lg">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>

          {/* Admin Panel Button */}
          {onAdminClick && (
            <button
              onClick={onAdminClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-label-sm text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              title="Panel Admin / Operator"
            >
              <span className="material-symbols-outlined text-sm">
                {isAdminLoggedIn ? 'admin_panel_settings' : 'lock'}
              </span>
              <span className="hidden sm:inline">
                {isAdminLoggedIn ? 'Admin' : 'Login'}
              </span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

