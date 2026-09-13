import React from 'react';
import { AuditLog, TPSRecapItem } from '../../types/database.types';

interface TPSAuditLogModalProps {
  tps: TPSRecapItem | null;
  auditLogs?: AuditLog[];
  onClose: () => void;
}

export const TPSAuditLogModal: React.FC<TPSAuditLogModalProps> = ({ tps, auditLogs = [], onClose }) => {
  if (!tps) return null;

  // Filter logs for this specific TPS
  const logs = auditLogs.filter(
    l => l.record_id === tps.polling_station_id || l.record_id === tps.code
  );

  // Helper to format action details
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INPUT_SUARA':
        return {
          label: 'Input Suara Masuk',
          icon: 'how_to_vote',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'UPDATE_SUARA':
      case 'UPDATE_VOTES':
        return {
          label: 'Pembaruan Data Suara',
          icon: 'edit_note',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      case 'VERIFIKASI_TPS':
      case 'VERIFY_TPS':
        return {
          label: 'Verifikasi Final TPS',
          icon: 'verified',
          badgeClass: 'bg-emerald-600 text-white border-emerald-700'
        };
      case 'KUNCI_TPS':
      case 'LOCK_TPS':
        return {
          label: 'Kunci Akses TPS (Locked)',
          icon: 'lock',
          badgeClass: 'bg-slate-800 text-white border-slate-900'
        };
      case 'BUKA_KUNCI_TPS':
      case 'UNLOCK_TPS':
        return {
          label: 'Buka Kunci Akses TPS',
          icon: 'lock_open',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'UPDATE_DATA_TPS':
        return {
          label: 'Perubahan DPT / Lokasi',
          icon: 'contact_page',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-300'
        };
      default:
        return {
          label: action,
          icon: 'history',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' WITA';
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl max-h-[88vh] flex flex-col animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">history</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Riwayat Audit Log — {tps.code}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {tps.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Jejak digital seluruh perubahan data suara & status untuk <strong>{tps.banjar_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Audit Logs Timeline List */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-slate-800">
          {logs.length > 0 ? (
            logs.map((log, index) => {
              const badge = getActionBadge(log.action);
              const actorName = log.actor_profile?.full_name || 'Petugas Sistem';
              const actorRole = log.actor_profile?.role === 'admin' ? 'Ketua Admin' : 'Operator TPS';

              return (
                <div
                  key={log.id || index}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all text-xs space-y-2 shadow-2xs"
                >
                  {/* Top Row: Action Badge & Timestamp */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-3xs ${badge.badgeClass}`}>
                      <span className="material-symbols-outlined text-sm">{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      {formatTimestamp(log.created_at)}
                    </span>
                  </div>

                  {/* Actor Info */}
                  <div className="flex items-center gap-2 pt-0.5 text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {actorName.charAt(0).toUpperCase()}
                    </div>
                    <span>
                      Diubah oleh: <strong className="text-slate-900">{actorName}</strong> ({actorRole})
                    </span>
                  </div>

                  {/* Content Detail Breakdown */}
                  {log.new_value && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1.5 font-sans">
                      {/* Vote breakdown if available */}
                      {log.new_value.paslon_01 !== undefined || log.new_value.votes_paslon_1 !== undefined ? (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="font-semibold text-slate-700 flex items-center justify-between">
                            <span>Perolehan Suara Tersimpan:</span>
                            <span className="font-black text-slate-900">
                              Total: {(
                                (log.new_value.paslon_01 ?? log.new_value.votes_paslon_1 ?? 0) +
                                (log.new_value.paslon_02 ?? log.new_value.votes_paslon_2 ?? 0) +
                                (log.new_value.tidak_sah ?? log.new_value.invalid ?? 0)
                              ).toLocaleString('id-ID')} Suara
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                            <div className="bg-rose-50 border border-rose-200 rounded p-1">
                              <span className="text-rose-700 font-bold block">Paslon 01</span>
                              <span className="text-rose-900 font-black text-xs">
                                {(log.new_value.paslon_01 ?? log.new_value.votes_paslon_1 ?? 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded p-1">
                              <span className="text-amber-700 font-bold block">Paslon 02</span>
                              <span className="text-amber-900 font-black text-xs">
                                {(log.new_value.paslon_02 ?? log.new_value.votes_paslon_2 ?? 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="bg-slate-100 border border-slate-200 rounded p-1">
                              <span className="text-slate-600 font-bold block">Tidak Sah</span>
                              <span className="text-slate-900 font-black text-xs">
                                {(log.new_value.tidak_sah ?? log.new_value.invalid ?? 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Status changes */}
                      {log.new_value.status && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span>Perubahan Status:</span>
                          {log.old_value?.status && (
                            <>
                              <span className="font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-200 rounded">
                                {log.old_value.status}
                              </span>
                              <span>→</span>
                            </>
                          )}
                          <span className="font-bold text-emerald-800 uppercase px-1.5 py-0.5 bg-emerald-100 border border-emerald-300 rounded">
                            {log.new_value.status}
                          </span>
                        </div>
                      )}

                      {/* Raw fallback if neither */}
                      {!log.new_value.paslon_01 && !log.new_value.votes_paslon_1 && !log.new_value.status && (
                        <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-600 break-all">
                          {JSON.stringify(log.new_value)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">history_toggle_off</span>
              </div>
              <p className="font-bold text-slate-700 text-sm">Belum Ada Riwayat Audit</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Belum ada aktivitas perubahan suara, verifikasi, atau penguncian data yang tercatat untuk {tps.code} ({tps.banjar_name}).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Total {logs.length} catatan audit log tersimpan
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
