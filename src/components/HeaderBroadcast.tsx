import React from 'react';

interface HeaderBroadcastProps {
  verifiedTpsCount: number;
  totalTpsCount: number;
  isLive: boolean;
  onAdminClick?: () => void;
  isAdminLoggedIn?: boolean;
}

export const HeaderBroadcast: React.FC<HeaderBroadcastProps> = ({
  verifiedTpsCount,
  totalTpsCount,
  isLive,
  onAdminClick,
  isAdminLoggedIn
}) => {
  const percentage = totalTpsCount > 0 ? Math.round((verifiedTpsCount / totalTpsCount) * 100) : 0;

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-low border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop flex items-center justify-between gap-space-md">
        
        {/* Left Brand / Logo */}
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface p-1 shadow-sm border border-outline-variant/30 overflow-hidden shrink-0">
            {/* Balinese Civic Seal Emblem */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-primary" fill="currentColor">
              <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="#2F4030" strokeWidth="6" />
              <circle cx="50" cy="50" r="22" fill="#9C4A32" />
              <path d="M50 20 L55 35 L70 35 L58 45 L62 60 L50 50 L38 60 L42 45 L30 35 L45 35 Z" fill="#B8933F" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-md md:text-label-lg text-primary uppercase font-bold tracking-wide leading-tight">
              HITUNG CEPAT PILKEL DESA BELEGA 2026
            </span>
            <span className="font-label-sm text-body-sm text-on-surface-variant tracking-wider uppercase">
              Kecamatan Blahbatuh, Kabupaten Gianyar
            </span>
          </div>
        </div>

        {/* Right Status Badge & Live Pulse */}
        <div className="flex items-center gap-space-xs md:gap-space-md">
          {/* Live indicator */}
          <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-xs md:px-space-md py-space-xs rounded-full border border-outline-variant/30 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-primary opacity-75' : 'bg-error opacity-75'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-primary' : 'bg-error'}`}></span>
            </span>
            <span className="font-label-md text-body-sm md:text-label-md font-bold text-primary tracking-wide tabular-nums">
              {verifiedTpsCount} / {totalTpsCount} TPS MASUK ({percentage}%)
            </span>
          </div>

          {/* Official Broadcast Chip */}
          <div className="hidden sm:block bg-primary-container text-on-primary px-space-sm md:px-space-md py-space-xs rounded font-label-sm text-label-sm font-bold tracking-wider uppercase shadow-sm">
            Siaran Resmi
          </div>

          {/* Admin Panel Button */}
          {onAdminClick && (
            <button
              onClick={onAdminClick}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface px-space-xs md:px-space-sm py-space-xs rounded font-label-sm text-label-sm font-semibold flex items-center gap-space-3xs transition-colors"
              title="Panel Admin / Operator"
            >
              <span className="material-symbols-outlined text-base">
                {isAdminLoggedIn ? 'admin_panel_settings' : 'lock'}
              </span>
              <span className="hidden md:inline">
                {isAdminLoggedIn ? 'Panel Admin' : 'Login Admin'}
              </span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
