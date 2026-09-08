import React from 'react';
import { TPSRecapItem } from '../types/database.types';

interface EvidenceModalProps {
  tps: TPSRecapItem | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ tps, onClose }) => {
  if (!tps) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
          <div>
            <h3 className="font-headline-sm text-base md:text-lg text-white font-bold">
              Bukti Formulir C-Hasil — {tps.code}
            </h3>
            <p className="text-xs text-slate-400">
              {tps.banjar_name} (Status: <span className="uppercase font-bold text-emerald-400">{tps.status}</span>)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#070b12]">
          {tps.evidence_photo_url ? (
            <img
              src={tps.evidence_photo_url}
              alt={`Formulir C-Hasil ${tps.code}`}
              className="max-h-[60vh] w-auto object-contain rounded-lg border border-slate-700 shadow-xl"
            />
          ) : (
            <div className="p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-600 mb-2 block">
                no_photography
              </span>
              <p className="font-semibold text-slate-300">Foto Bukti C-Hasil Belum Diunggah</p>
              <p className="text-xs text-slate-500 mt-1">
                Foto fisik formulir belum tersedia untuk {tps.code} ({tps.banjar_name}).
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 flex justify-between items-center bg-[#0f172a] text-xs">
          <span className="text-slate-400">
            Suara Sah: <strong className="text-white">{tps.total_valid_votes}</strong> | Tidak Sah: <strong className="text-rose-400">{tps.invalid_votes_count}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-md hover:bg-emerald-500 transition-colors shadow-md text-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

