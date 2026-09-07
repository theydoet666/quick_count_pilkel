import React from 'react';

interface FooterTickerProps {
  lastUpdated: string;
}

export const FooterTicker: React.FC<FooterTickerProps> = ({ lastUpdated }) => {
  return (
    <footer className="fixed bottom-0 left-0 w-full z-50 bg-inverse-surface text-inverse-on-surface shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
      <div className="h-12 max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop flex items-center justify-between gap-space-md">
        
        {/* Update Timestamp & Ticker */}
        <div className="flex items-center gap-space-sm">
          <div className="flex items-center gap-space-2xs bg-surface/10 px-space-xs md:px-space-sm py-space-3xs rounded shrink-0">
            <span className="material-symbols-outlined text-base text-tertiary-fixed">schedule</span>
            <span className="font-label-md text-label-sm md:text-label-md text-tertiary-fixed font-bold tracking-wide uppercase tabular-nums">
              PEMBARUAN: {lastUpdated}
            </span>
          </div>

          <span className="font-label-sm text-label-sm text-surface-dim uppercase tracking-wider hidden sm:inline truncate">
            Tabulasi Cepat Berdasarkan Seluruh Berita Acara C-Hasil TPS
          </span>
        </div>

        {/* Disclaimer Badge */}
        <div className="bg-secondary/30 px-space-xs md:px-space-sm py-space-3xs rounded shrink-0 border border-secondary-fixed/20">
          <span className="font-label-sm text-label-sm text-secondary-fixed tracking-wider uppercase font-semibold">
            Bukan Hasil Resmi Pleno Final
          </span>
        </div>

      </div>
    </footer>
  );
};
