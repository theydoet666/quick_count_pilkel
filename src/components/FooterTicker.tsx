import React from 'react';
import { TPSRecapItem } from '../types/database.types';

interface FooterTickerProps {
  lastUpdated: string;
  tpsList?: TPSRecapItem[];
  organizer?: string;
  flashCountText?: string;
  tickerSpeed?: number;
}

export const FooterTicker: React.FC<FooterTickerProps> = ({
  lastUpdated,
  tpsList = [],
  organizer = 'Panwaslukel Desa Belega',
  flashCountText = 'FLASH COUNT',
  tickerSpeed = 30
}) => {
  // Generate ticker items from TPS list
  const tickerItems = tpsList.length > 0
    ? tpsList.map(tps => {
        const c1 = tps.candidate_votes['1']?.votes || 0;
        const c2 = tps.candidate_votes['2']?.votes || 0;
        const leader = tps.leading_candidate_number === 1 ? '01 Menang' : tps.leading_candidate_number === 2 ? '02 Menang' : 'Imbang';
        return `${tps.code} (${tps.banjar_name}): 01 [${c1}] vs 02 [${c2}] → ${leader} (+${tps.vote_margin})`;
      })
    : [
        'Menunggu sinkronisasi data seluruh TPS...',
        'Formulir C-Hasil sedang dalam proses tabulasi dan verifikasi...'
      ];

  // Duplicate for seamless infinite loop
  const duplicatedItems = [...tickerItems, ...tickerItems];

  return (
    <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#151515] text-white border-t border-amber-500/30 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="h-11 flex items-center">
        
        {/* Fixed Left Breaking News Badge */}
        <div className="z-20 flex items-center h-full bg-gradient-to-r from-red-700 to-red-600 px-3 md:px-4 shrink-0 shadow-lg border-r border-red-400/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="font-black text-xs md:text-sm tracking-wider uppercase text-white drop-shadow">
              {flashCountText || 'FLASH COUNT'}
            </span>
          </div>
        </div>

        {/* Timestamp Chip */}
        <div className="z-10 hidden sm:flex items-center h-full bg-[#252525] px-3 shrink-0 border-r border-white/10 text-amber-300 font-bold text-xs tabular-nums">
          <span className="material-symbols-outlined text-sm mr-1">update</span>
          {lastUpdated}
        </div>

        {/* Scrolling News Ticker Marquee */}
        <div className="flex-1 overflow-hidden relative flex items-center mask-gradient h-full">
          <div
            className="animate-marquee whitespace-nowrap flex items-center gap-8 text-xs md:text-sm font-medium text-neutral-200"
            style={{ animationDuration: `${tickerSpeed || 30}s` }}
          >
            {duplicatedItems.map((text, idx) => (
              <span key={idx} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                <span className="tabular-nums tracking-wide">{text}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Fixed Right Official Note */}
        <div className="hidden lg:flex items-center h-full bg-[#1e1e1e] px-3 shrink-0 border-l border-white/10 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
          <span className="material-symbols-outlined text-xs text-amber-400 mr-1">verified_user</span>
          {organizer}
        </div>

      </div>
    </footer>
  );
};


