import React, { useState, useEffect } from 'react';
import { useRealtimeResults } from '../hooks/useRealtimeResults';
import { HeaderBroadcast } from '../components/HeaderBroadcast';
import { CandidatePanel } from '../components/CandidatePanel';
import { SummaryCards } from '../components/SummaryCards';
import { TPSRecapTable } from '../components/TPSRecapTable';
import { EvidenceModal } from '../components/EvidenceModal';
import { FooterTicker } from '../components/FooterTicker';
import { CountdownOverlay } from '../components/public/CountdownOverlay';
import { TPSRecapItem } from '../types/database.types';

interface PublicDashboardProps {
  onAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({
  onAdminClick,
  isAdminLoggedIn
}) => {
  const { summary, tpsList, electionSettings, isLive, lastUpdated } = useRealtimeResults();
  const [selectedEvidenceTps, setSelectedEvidenceTps] = useState<TPSRecapItem | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Realtime ticker for countdown clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine if vote counting is active
  const isPastSchedule = electionSettings.counting_start_time
    ? now >= new Date(electionSettings.counting_start_time)
    : false;
  const isCountingActive = Boolean(electionSettings.is_counting_started) || isPastSchedule;

  // Calculate unique Banjar Dinas count dynamically from TPS list data
  const banjarCount = new Set(
    tpsList
      .map(t => t.banjar_name?.trim())
      .filter(name => Boolean(name && name.length > 0))
  ).size || (tpsList.length > 0 ? tpsList.length : 6);

  // Calculate DPT and Hak Pilih totals directly from active TPS list (database sync)
  const totalDpt = tpsList.reduce((sum, t) => sum + (Number(t.registered_voters) || 0), 0);
  const totalDptb = tpsList.reduce((sum, t) => sum + (Number(t.additional_voters) || 0), 0);
  const totalHakPilih = totalDpt + totalDptb;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col select-none antialiased relative overflow-x-hidden bg-tv-grid">
      
      {/* Studio Ambient Glow Top Lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-0" />
      <div className="absolute top-28 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-0" />
      <div className="absolute top-60 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none -z-0" />

      {/* Top Fixed Broadcast Header */}
      <HeaderBroadcast
        verifiedTpsCount={summary.verified_tps}
        totalTpsCount={summary.total_tps}
        isLive={isCountingActive ? isLive : false}
        title={electionSettings.title}
        subtitle={electionSettings.subtitle}
        logoUrl={electionSettings.logo_url}
        onAdminClick={onAdminClick}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Broadcast Screen Content (Blurred when counting not active) */}
      <main className={`w-full pt-20 sm:pt-24 pb-14 sm:pb-16 flex-1 flex flex-col max-w-[1440px] mx-auto px-3 sm:px-margin-mobile md:px-margin-desktop z-10 transition-all duration-700 ${
        !isCountingActive ? 'filter blur-[5px] opacity-40 select-none pointer-events-none' : ''
      }`}>
        
        {/* TV Broadcast Banner Header */}
        <div className="mb-space-sm sm:mb-space-md flex items-center justify-between flex-wrap gap-2 bg-[#111827]/80 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-slate-700/60 shadow-xl">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isCountingActive ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 ${
                isCountingActive ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="font-black text-[11px] sm:text-xs md:text-sm uppercase tracking-wider text-white">
              PUSAT TABULASI & HITUNG CEPAT DIGITAL {electionSettings.title}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
            <span>{banjarCount} Banjar Dinas • {tpsList.length} TPS</span>
            <span className="text-slate-600">•</span>
            <span>
              {totalHakPilih.toLocaleString('id-ID')} Hak Pilih ({totalDpt.toLocaleString('id-ID')} DPT Pokok{totalDptb > 0 ? ` + ${totalDptb.toLocaleString('id-ID')} DPTb` : ''})
            </span>
            <span className="text-slate-600">•</span>
            <span>
              {summary.verified_tps === summary.total_tps && summary.total_tps > 0 ? (
                <span className="text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                  100% Data Final Masuk
                </span>
              ) : (
                <span className="text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                  Proses Masuk ({summary.verified_tps}/{summary.total_tps})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Grid Layout: Left Candidates + Right TPS Breakdown */}
        <div className="grid grid-cols-12 gap-gutter-desktop items-start flex-1">
          
          {/* Left Panel (5 cols desktop): Candidate Face-off Cards & Metrics */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-space-md">
            <CandidatePanel
              candidates={summary.candidates}
              totalValidVotes={summary.total_valid_votes}
            />
            
            <SummaryCards summary={summary} />
          </div>

          {/* Right Panel (7 cols desktop): TPS Breakdown Table */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-space-sm h-full">
            <TPSRecapTable
              tpsList={tpsList}
              candidates={summary.candidates}
              organizer={electionSettings.organizer}
              onViewEvidence={(tps) => setSelectedEvidenceTps(tps)}
            />
          </div>

        </div>
      </main>

      {/* Countdown Overlay on Public Page when Counting is Pending */}
      {!isCountingActive && (
        <CountdownOverlay
          electionSettings={electionSettings}
          now={now}
          onAdminClick={onAdminClick}
          isAdminLoggedIn={isAdminLoggedIn}
        />
      )}

      {/* Evidence Photo Modal */}
      {selectedEvidenceTps && (
        <EvidenceModal
          tps={selectedEvidenceTps}
          onClose={() => setSelectedEvidenceTps(null)}
        />
      )}

      {/* Bottom Fixed Realtime TV Marquee Ticker */}
      <FooterTicker
        lastUpdated={lastUpdated}
        tpsList={tpsList}
        organizer={electionSettings.organizer}
        flashCountText={electionSettings.flash_count_text}
        tickerSpeed={electionSettings.ticker_speed}
      />
    </div>
  );
};
