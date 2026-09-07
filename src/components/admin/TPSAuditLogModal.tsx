import React from 'react';
import { AuditLog, TPSRecapItem } from '../../types/database.types';
import { MOCK_AUDIT_LOGS } from '../../lib/mockData';

interface TPSAuditLogModalProps {
  tps: TPSRecapItem | null;
  onClose: () => void;
}

export const TPSAuditLogModal: React.FC<TPSAuditLogModalProps> = ({ tps, onClose }) => {
  if (!tps) return null;

  // Filter logs for this TPS
  const logs = MOCK_AUDIT_LOGS.filter(l => l.record_id === tps.polling_station_id || l.record_id.includes('a1111111'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-lg w-full p-space-md md:p-space-lg shadow-xl max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container pb-space-sm mb-space-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
              Riwayat Audit Log — {tps.code}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Jejak digital perubahan data suara & status untuk {tps.banjar_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Audit List */}
        <div className="overflow-y-auto flex-1 space-y-space-sm pr-space-2xs">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="p-space-sm bg-surface-container-low rounded border border-outline-variant/30 text-body-sm">
                <div className="flex items-center justify-between font-semibold mb-space-3xs">
                  <span className="text-primary flex items-center gap-space-3xs">
                    <span className="material-symbols-outlined text-base">history</span>
                    {log.action}
                  </span>
                  <span className="text-on-surface-variant text-label-sm font-normal">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
                
                <p className="text-on-surface mb-space-xs">
                  Oleh: <strong>{log.actor_profile?.full_name || 'System Operator'}</strong>
                </p>

                {log.old_value && (
                  <div className="bg-surface p-space-2xs rounded font-mono text-xs text-on-surface-variant mb-space-3xs border border-outline-variant/20">
                    Semula: {JSON.stringify(log.old_value)}
                  </div>
                )}
                {log.new_value && (
                  <div className="bg-primary-fixed/20 p-space-2xs rounded font-mono text-xs text-primary border border-primary/20">
                    Menjadi: {JSON.stringify(log.new_value)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-space-xl text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline mb-space-xs block">
                content_paste_off
              </span>
              <p className="font-semibold">Belum Ada Riwayat Audit</p>
              <p className="text-body-sm mt-space-3xs">
                Belum ada perubahan yang dicatat untuk {tps.code}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-space-md pt-space-sm border-t border-surface-container flex justify-end">
          <button
            onClick={onClose}
            className="px-space-md py-space-xs bg-primary text-on-primary font-label-sm font-bold rounded hover:bg-primary/90 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
