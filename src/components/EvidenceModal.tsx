import React from 'react';
import { TPSRecapItem } from '../types/database.types';

interface EvidenceModalProps {
  tps: TPSRecapItem | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ tps, onClose }) => {
  if (!tps) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-space-md border-b border-surface-container flex items-center justify-between bg-surface-container-low">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
              Bukti Formulir C-Hasil — {tps.code}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              {tps.banjar_name} (Status: <span className="uppercase font-bold text-primary">{tps.status}</span>)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-space-md overflow-y-auto flex-1 flex flex-col items-center justify-center bg-surface">
          {tps.evidence_photo_url ? (
            <img
              src={tps.evidence_photo_url}
              alt={`Formulir C-Hasil ${tps.code}`}
              className="max-h-[60vh] w-auto object-contain rounded border border-outline-variant shadow-sm"
            />
          ) : (
            <div className="p-space-2xl text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl text-outline mb-space-xs block">
                no_photography
              </span>
              <p className="font-semibold">Foto Bukti C-Hasil Belum Diunggah</p>
              <p className="text-body-sm mt-space-3xs">
                Foto fisik formulir belum tersedia untuk {tps.code} ({tps.banjar_name}).
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-space-sm border-t border-surface-container flex justify-between items-center bg-surface-container-low text-body-sm">
          <span className="text-on-surface-variant">
            Suara Sah: <strong className="text-on-surface">{tps.total_valid_votes}</strong> | Tidak Sah: <strong className="text-error">{tps.invalid_votes_count}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-space-md py-space-xs bg-primary text-on-primary font-label-sm rounded font-bold hover:bg-primary/90 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
