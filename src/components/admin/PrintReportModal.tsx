import React from 'react';
import { ElectionSummary, TPSRecapItem, ElectionSettings, Candidate, OfficerUser } from '../../types/database.types';

interface PrintReportModalProps {
  summary: ElectionSummary;
  tpsList: TPSRecapItem[];
  candidates: Candidate[];
  settings: ElectionSettings;
  ketuaPanitiaName?: string;
  officers?: OfficerUser[];
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  summary,
  tpsList,
  candidates,
  settings,
  ketuaPanitiaName,
  officers,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const adminOfficer = officers?.find(o => o.role === 'admin');
  const resolvedKetuaName = ketuaPanitiaName || adminOfficer?.full_name || 'Ketua Panitia Pemilihan';

  const totalDpt = tpsList.reduce((sum, t) => sum + (Number(t.registered_voters) || 0), 0);
  const totalDptb = tpsList.reduce((sum, t) => sum + (Number(t.additional_voters) || 0), 0);
  const totalHakPilih = totalDpt + totalDptb;
  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static animate-fadeIn">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:rounded-none overflow-hidden">
        
        {/* Toolbar Header (Hidden on Print) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-2xl">print</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Pratinjau Cetak Berita Acara Tabulasi
              </h3>
              <p className="text-xs text-slate-500">
                Dokumen resmi rekapitulasi hitung cepat untuk arsip dan persiapan rapat pleno panitia
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Cetak / Unduh PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 font-serif text-slate-900 text-xs sm:text-sm print:p-0 print:overflow-visible">
          
          {/* Official Letterhead (KOP SURAT) */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 relative">
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="w-16 h-16 object-contain absolute left-0 top-0 hidden sm:block print:block"
              />
            )}
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-700">
              {settings.organizer || 'PANITIA PEMILIHAN PERBEKEL'}
            </h2>
            <h1 className="text-base sm:text-xl font-black uppercase text-slate-900 my-0.5">
              {settings.title}
            </h1>
            <p className="text-xs font-sans text-slate-600">
              {settings.subtitle} • Sekretariat Kantor Perbekel Desa Belega
            </p>
          </div>

          {/* Document Title */}
          <div className="text-center my-4 font-sans">
            <h3 className="font-bold text-sm sm:text-base uppercase underline tracking-wide">
              BERITA ACARA REKAPITULASI HASIL TABULASI HITUNG CEPAT
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nomor: BA/TABULASI/{new Date().getFullYear()}/PILKEL-BELEGA
            </p>
          </div>

          <p className="font-sans text-xs text-slate-700 leading-relaxed mb-4">
            Pada hari ini, <strong>{currentDateFormatted}</strong>, Panitia Pemilihan Perbekel telah melaksanakan pencatatan dan tabulasi data hasil perolehan suara Pemilihan Perbekel dari seluruh Tempat Pemungutan Suara (TPS) dengan rincian sebagai berikut:
          </p>

          {/* Table of Results */}
          <table className="w-full border-collapse border border-slate-900 text-center font-sans text-[11px] mb-6">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900">
                <th className="border border-slate-900 py-2 px-1 w-10">No</th>
                <th className="border border-slate-900 py-2 px-2 text-left">TPS / Banjar Dinas</th>
                <th className="border border-slate-900 py-2 px-1">DPT Pokok</th>
                <th className="border border-slate-900 py-2 px-1">DPTb</th>
                <th className="border border-slate-900 py-2 px-1 font-bold text-rose-900 bg-rose-50">
                  {candidates[0]?.name ? `01. ${candidates[0].name.split(',')[0]}` : 'Paslon 01'}
                </th>
                <th className="border border-slate-900 py-2 px-1 font-bold text-amber-900 bg-amber-50">
                  {candidates[1]?.name ? `02. ${candidates[1].name.split(',')[0]}` : 'Paslon 02'}
                </th>
                <th className="border border-slate-900 py-2 px-1">Suara Sah</th>
                <th className="border border-slate-900 py-2 px-1">Tidak Sah</th>
                <th className="border border-slate-900 py-2 px-1 font-bold">Total Masuk</th>
                <th className="border border-slate-900 py-2 px-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {tpsList.map((tps, idx) => {
                const v1 = tps.candidate_votes['1']?.votes || 0;
                const v2 = tps.candidate_votes['2']?.votes || 0;
                const totalVote = tps.total_valid_votes + tps.invalid_votes_count;

                return (
                  <tr key={tps.polling_station_id} className="border-b border-slate-300">
                    <td className="border border-slate-400 py-1.5 px-1">{idx + 1}</td>
                    <td className="border border-slate-400 py-1.5 px-2 text-left font-semibold">
                      {tps.code} — <span className="font-normal">{tps.banjar_name}</span>
                    </td>
                    <td className="border border-slate-400 py-1.5 px-1 tabular-nums">{tps.registered_voters.toLocaleString('id-ID')}</td>
                    <td className="border border-slate-400 py-1.5 px-1 tabular-nums">{tps.additional_voters || 0}</td>
                    <td className="border border-slate-400 py-1.5 px-1 font-bold text-rose-800 bg-rose-50/50 tabular-nums">{v1.toLocaleString('id-ID')}</td>
                    <td className="border border-slate-400 py-1.5 px-1 font-bold text-amber-800 bg-amber-50/50 tabular-nums">{v2.toLocaleString('id-ID')}</td>
                    <td className="border border-slate-400 py-1.5 px-1 font-semibold tabular-nums">{tps.total_valid_votes.toLocaleString('id-ID')}</td>
                    <td className="border border-slate-400 py-1.5 px-1 text-slate-600 tabular-nums">{tps.invalid_votes_count.toLocaleString('id-ID')}</td>
                    <td className="border border-slate-400 py-1.5 px-1 font-bold tabular-nums">{totalVote.toLocaleString('id-ID')}</td>
                    <td className="border border-slate-400 py-1.5 px-1 uppercase font-bold text-[10px]">
                      {tps.status}
                    </td>
                  </tr>
                );
              })}
              {/* Summary Total Row */}
              <tr className="bg-slate-200 border-t-2 border-slate-900 font-bold text-slate-950">
                <td colSpan={2} className="border border-slate-900 py-2 px-2 text-left">
                  TOTAL REKAPITULASI
                </td>
                <td className="border border-slate-900 py-2 px-1 tabular-nums">{totalDpt.toLocaleString('id-ID')}</td>
                <td className="border border-slate-900 py-2 px-1 tabular-nums">{totalDptb.toLocaleString('id-ID')}</td>
                <td className="border border-slate-900 py-2 px-1 text-rose-950 bg-rose-100 tabular-nums font-black">
                  {(summary.candidates.find(c => c.number === 1)?.total_votes || 0).toLocaleString('id-ID')}
                </td>
                <td className="border border-slate-900 py-2 px-1 text-amber-950 bg-amber-100 tabular-nums font-black">
                  {(summary.candidates.find(c => c.number === 2)?.total_votes || 0).toLocaleString('id-ID')}
                </td>
                <td className="border border-slate-900 py-2 px-1 tabular-nums font-black">
                  {summary.total_valid_votes.toLocaleString('id-ID')}
                </td>
                <td className="border border-slate-900 py-2 px-1 tabular-nums">
                  {summary.total_invalid_votes.toLocaleString('id-ID')}
                </td>
                <td className="border border-slate-900 py-2 px-1 tabular-nums font-black">
                  {summary.total_votes_entered.toLocaleString('id-ID')}
                </td>
                <td className="border border-slate-900 py-2 px-1 text-[10px]">
                  {summary.verified_tps}/{summary.total_tps} TPS
                </td>
              </tr>
            </tbody>
          </table>

          {/* Candidate Standings Box */}
          <div className="bg-slate-50 border border-slate-300 rounded p-3 mb-6 font-sans text-xs space-y-1">
            <h4 className="font-bold text-slate-900 uppercase">
              Ringkasan Persentase Perolehan Suara:
            </h4>
            <div className="grid grid-cols-2 gap-4 pt-1">
              {summary.candidates.map(c => (
                <div key={c.number} className="flex justify-between border-b border-slate-200 pb-1">
                  <span>Paslon {c.number}: <strong>{c.name}</strong></span>
                  <span className="font-bold tabular-nums">{c.total_votes.toLocaleString('id-ID')} suara ({c.percentage}%)</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 italic pt-1">
              *Tingkat Partisipasi Pemilih: {summary.participation_rate}% (dari total {totalHakPilih.toLocaleString('id-ID')} Hak Pilih)
            </p>
          </div>

          {/* Signature Sign-off Section */}
          <div className="mt-8 pt-4 font-sans text-xs">
            <p className="text-right mb-6">
              Desa Belega, {currentDateFormatted}
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-semibold text-slate-700 mb-14">Saksi Pasangan Calon 01</p>
                <p className="font-bold underline">( .................................................. )</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-14">Ketua Panitia Pemilihan</p>
                <p className="font-bold underline">( {resolvedKetuaName} )</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-14">Saksi Pasangan Calon 02</p>
                <p className="font-bold underline">( .................................................. )</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
