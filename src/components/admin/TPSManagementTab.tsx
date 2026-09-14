import React, { useState } from 'react';
import { TPSRecapItem } from '../../types/database.types';
import { showAlert } from '../../lib/alerts';

interface TPSManagementTabProps {
  tpsList: TPSRecapItem[];
  onAddTPS: (tps: { code: string; banjar_name: string; registered_voters: number; additional_voters?: number }) => void;
  onUpdateTPS: (tpsId: string, details: { code: string; banjar_name: string; registered_voters: number; additional_voters?: number }) => void;
  onDeleteTPS: (tpsId: string) => void;
}

export const TPSManagementTab: React.FC<TPSManagementTabProps> = ({
  tpsList,
  onAddTPS,
  onUpdateTPS,
  onDeleteTPS
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTps, setEditingTps] = useState<TPSRecapItem | null>(null);
  const [code, setCode] = useState('');
  const [banjarName, setBanjarName] = useState('');
  const [registeredVoters, setRegisteredVoters] = useState<number>(500);
  const [additionalVoters, setAdditionalVoters] = useState<number>(0);

  const totalDPT = tpsList.reduce((sum, t) => sum + t.registered_voters, 0);
  const totalAdditional = tpsList.reduce((sum, t) => sum + (t.additional_voters || 0), 0);
  const totalAllVoters = totalDPT + totalAdditional;

  const openAddModal = () => {
    setEditingTps(null);
    const nextNum = tpsList.length + 1;
    setCode(`TPS ${nextNum < 10 ? '0' + nextNum : nextNum}`);
    setBanjarName('');
    setRegisteredVoters(500);
    setAdditionalVoters(0);
    setIsModalOpen(true);
  };

  const openEditModal = (tps: TPSRecapItem) => {
    setEditingTps(tps);
    setCode(tps.code);
    setBanjarName(tps.banjar_name);
    setRegisteredVoters(tps.registered_voters);
    setAdditionalVoters(tps.additional_voters || 0);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTps) {
      onUpdateTPS(editingTps.polling_station_id, {
        code,
        banjar_name: banjarName,
        registered_voters: registeredVoters,
        additional_voters: additionalVoters
      });
      showAlert.toast(`Data ${code} (${banjarName}) berhasil diperbarui!`, 'success');
    } else {
      onAddTPS({
        code,
        banjar_name: banjarName,
        registered_voters: registeredVoters,
        additional_voters: additionalVoters
      });
      showAlert.toast(`${code} (${banjarName}) berhasil ditambahkan!`, 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (tps: TPSRecapItem) => {
    const confirmed = await showAlert.confirm({
      title: `Hapus ${tps.code}?`,
      text: `Apakah Anda yakin ingin menghapus ${tps.code} (${tps.banjar_name})? Seluruh data perolehan suara di TPS ini juga akan terhapus.`,
      confirmButtonText: 'Ya, Hapus TPS',
      cancelButtonText: 'Batal',
      icon: 'warning'
    });
    if (confirmed) {
      onDeleteTPS(tps.polling_station_id);
      showAlert.toast(`${tps.code} berhasil dihapus.`, 'info');
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-6 space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">how_to_vote</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-primary">
              Manajemen Master Data TPS & DPT
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Kelola daftar TPS, nama balai banjar, alokasi DPT Pokok & DPT Tambahan (Total: {tpsList.length} TPS • {totalDPT.toLocaleString('id-ID')} DPT Pokok + {totalAdditional.toLocaleString('id-ID')} DPTb = <strong className="text-on-surface">{totalAllVoters.toLocaleString('id-ID')} Hak Pilih</strong>).
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs md:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Tambah TPS Baru
        </button>
      </div>

      {/* TPS Table */}
      <div className="overflow-x-auto border border-surface-container rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container text-on-surface-variant font-label-sm text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 font-bold">Kode TPS</th>
              <th className="py-3 px-4 font-bold">Nama Banjar / Lokasi</th>
              <th className="py-3 px-4 text-center font-bold">DPT Pokok</th>
              <th className="py-3 px-4 text-center font-bold">DPT Tambahan (DPTb)</th>
              <th className="py-3 px-4 text-center font-bold">Total Hak Pilih</th>
              <th className="py-3 px-4 text-center font-bold">Status Tabulasi</th>
              <th className="py-3 px-4 text-right font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-sm">
            {tpsList.map((tps) => {
              const addDpt = tps.additional_voters || 0;
              const totalVoters = tps.registered_voters + addDpt;
              return (
                <tr key={tps.polling_station_id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-4 font-black text-on-surface">
                    {tps.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-on-surface">
                    {tps.banjar_name}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-primary tabular-nums">
                    {tps.registered_voters.toLocaleString('id-ID')} DPT
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-amber-700 tabular-nums">
                    +{addDpt.toLocaleString('id-ID')} DPTb
                  </td>
                  <td className="py-3 px-4 text-center font-black text-on-surface tabular-nums">
                    {totalVoters.toLocaleString('id-ID')} Pemilih
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded font-bold text-xs uppercase ${
                      tps.status === 'verified'
                        ? 'bg-primary-container text-on-primary'
                        : tps.status === 'locked'
                        ? 'bg-inverse-surface text-inverse-on-surface'
                        : tps.status === 'submitted'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {tps.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(tps)}
                      className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary transition-colors inline-flex items-center"
                      title="Edit TPS & DPT"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(tps)}
                      className="p-1.5 rounded-lg bg-surface-container hover:bg-error-container text-error transition-colors inline-flex items-center"
                      title="Hapus TPS"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit TPS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-base font-bold text-primary">
                {editingTps ? 'Edit Data TPS & DPT' : 'Tambah TPS Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                  Kode TPS
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="contoh: TPS 01"
                  className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                  Nama Banjar / Lokasi TPS
                </label>
                <input
                  type="text"
                  required
                  value={banjarName}
                  onChange={(e) => setBanjarName(e.target.value)}
                  placeholder="contoh: Balai Banjar Belega Kangin"
                  className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                    DPT Pokok
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={registeredVoters}
                    onChange={(e) => setRegisteredVoters(parseInt(e.target.value) || 0)}
                    placeholder="contoh: 640"
                    className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                    DPT Tambahan (DPTb)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={additionalVoters}
                    onChange={(e) => setAdditionalVoters(parseInt(e.target.value) || 0)}
                    placeholder="contoh: 10"
                    className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container text-xs text-on-surface-variant flex justify-between items-center">
                <span>Total Hak Pilih TPS:</span>
                <strong className="text-primary font-bold tabular-nums">
                  {(registeredVoters + additionalVoters).toLocaleString('id-ID')} Pemilih
                </strong>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-lg shadow-md"
                >
                  {editingTps ? 'Simpan Perubahan' : 'Tambah TPS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
