import React, { useState } from 'react';
import { useRealtimeResults } from '../hooks/useRealtimeResults';
import { HeaderBroadcast } from '../components/HeaderBroadcast';
import { CandidatePanel } from '../components/CandidatePanel';
import { SummaryCards } from '../components/SummaryCards';
import { TPSRecapTable } from '../components/TPSRecapTable';
import { EvidenceModal } from '../components/EvidenceModal';
import { FooterTicker } from '../components/FooterTicker';
import { TPSRecapItem } from '../types/database.types';

interface PublicDashboardProps {
  onAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({
  onAdminClick,
  isAdminLoggedIn
}) => {
  const { summary, tpsList, isLive, lastUpdated } = useRealtimeResults();
  const [selectedEvidenceTps, setSelectedEvidenceTps] = useState<TPSRecapItem | null>(null);

  return (
    <div className="min-h-screen bg-surface flex flex-col select-none antialiased">
      {/* Top Fixed Broadcast Header */}
      <HeaderBroadcast
        verifiedTpsCount={summary.verified_tps}
        totalTpsCount={summary.total_tps}
        isLive={isLive}
        onAdminClick={onAdminClick}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Screen Content */}
      <main className="w-full pt-24 pb-16 flex-1 flex flex-col max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-12 gap-gutter-desktop items-start flex-1">
          
          {/* Left Panel (5 columns on desktop): Candidate Cards & Summary Metrics */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-space-md">
            <CandidatePanel
              candidates={summary.candidates}
              totalValidVotes={summary.total_valid_votes}
            />
            
            <SummaryCards summary={summary} />
          </div>

          {/* Right Panel (7 columns on desktop): TPS Breakdown Table */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-space-sm h-full">
            <TPSRecapTable
              tpsList={tpsList}
              candidates={summary.candidates}
              onViewEvidence={(tps) => setSelectedEvidenceTps(tps)}
            />
          </div>

        </div>
      </main>

      {/* Evidence Photo Modal */}
      <EvidenceModal
        tps={selectedEvidenceTps}
        onClose={() => setSelectedEvidenceTps(null)}
      />

      {/* Bottom Fixed Ticker Footer */}
      <FooterTicker lastUpdated={lastUpdated} />
    </div>
  );
};
