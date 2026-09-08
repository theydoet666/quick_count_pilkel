import React, { useState } from 'react';
import { OfficerUser, TPSRecapItem } from '../../types/database.types';

interface OfficerManagementTabProps {
  officersList: OfficerUser[];
  tpsList: TPSRecapItem[];
  onAddOfficer: (officer: Omit<OfficerUser, 'id' | 'created_at'>) => void;
  onUpdateOfficer: (id: string, updates: Partial<OfficerUser>) => void;
  onDeleteOfficer: (id: string) => void;
}

export const OfficerManagementTab: React.FC<OfficerManagementTabProps> = ({
  officersList,
  tpsList,
  onAddOfficer,
  onUpdateOfficer,
  onDeleteOfficer
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<OfficerUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [phone, setPhone] = useState('');
  const [tpsId, setTpsId] = useState(tpsList[0]?.polling_station_id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Assigned TPS ids mapping
  const assignedTpsIds = new Set(officersList.map(o => o.tps_id));
  const unassignedTpsCount = tpsList.filter(t => !assignedTpsIds.has(t.polling_station_id)).length;

  const openAddModal = () => {
    setEditingOfficer(null);
    setFullName('');
    // Suggest first unassigned TPS
    const firstUnassigned = tpsList.find(t => !assignedTpsIds.has(t.polling_station_id));
    const targetTps = firstUnassigned || tpsList[0];
    
    if (targetTps) {
      setTpsId(targetTps.polling_station_id);
      const codeClean = targetTps.code.toLowerCase().replace(/\s+/g, '');
      setEmail(`${codeClean}@pilkel.belega.id`);
    } else {
      setTpsId('');
      setEmail('');
    }
    setPassword('password123');
    setPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (officer: OfficerUser) => {
    setEditingOfficer(officer);
    setFullName(officer.full_name);
    setEmail(officer.email);
    setPassword(officer.password || 'password123');
    setPhone(officer.phone || '');
    setTpsId(officer.tps_id);
    setIsModalOpen(true);
  };

  const handleTpsSelectChange = (newTpsId: string) => {
    setTpsId(newTpsId);
    if (!editingOfficer) {
      const selectedTps = tpsList.find(t => t.polling_station_id === newTpsId);
      if (selectedTps) {
        const codeClean = selectedTps.code.toLowerCase().replace(/\s+/g, '');
        setEmail(`${codeClean}@pilkel.belega.id`);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpsId) {
      alert('Silakan pilih penugasan TPS.');
      return;
    }

    if (editingOfficer) {
      onUpdateOfficer(editingOfficer.id, {
        full_name: fullName,
        email,
        password,
        phone,
        tps_id: tpsId
      });
    } else {
      onAddOfficer({
        full_name: fullName,
        email,
        password,
        phone,
        tps_id: tpsId,
        role: 'operator'
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (officer: OfficerUser) => {
    const tps = tpsList.find(t => t.polling_station_id === officer.tps_id);
    if (confirm(`Apakah Anda yakin ingin menghapus petugas ${officer.full_name} (${tps?.code || 'TPS'})?`)) {
      onDeleteOfficer(officer.id);
    }
  };

  const filteredOfficers = officersList.filter(o => {
    const tps = tpsList.find(t => t.polling_station_id === o.tps_id);
    const search = searchQuery.toLowerCase();
    return (
      o.full_name.toLowerCase().includes(search) ||
      o.email.toLowerCase().includes(search) ||
      (tps && (tps.code.toLowerCase().includes(search) || tps.banjar_name.toLowerCase().includes(search)))
    );
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700">
            <span className="material-symbols-outlined text-2xl">group</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-slate-900">
              Manajemen Petugas TPS (Operator)
            </h2>
            <p className="text-body-sm text-slate-500 text-xs sm:text-sm">
              Kelola akun petugas TPS. Masing-masing petugas hanya dapat melihat dan menginput hasil perolehan suara di TPS yang ditugaskan.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          Tambah Petugas TPS
        </button>
      </div>

      {/* Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Total Petugas</span>
          <span className="text-xl font-black text-slate-900 block tabular-nums">{officersList.length} Orang</span>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
          <span className="text-[11px] font-bold uppercase text-emerald-700 block">TPS Terisi Petugas</span>
          <span className="text-xl font-black text-emerald-700 block tabular-nums">{tpsList.length - unassignedTpsCount} / {tpsList.length}</span>
        </div>
        <div className={`p-3 rounded-xl border text-center ${unassignedTpsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`text-[11px] font-bold uppercase block ${unassignedTpsCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>TPS Belum Ada Petugas</span>
          <span className={`text-xl font-black block tabular-nums ${unassignedTpsCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{unassignedTpsCount} TPS</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Hak Akses</span>
          <span className="text-xs font-bold text-slate-700 block mt-1">Khusus TPS Masing-Masing</span>
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Cari nama, email, atau TPS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-emerald-700"
          />
          <span className="material-symbols-outlined text-base absolute left-2.5 top-2.5 text-slate-400">
            search
          </span>
        </div>
      </div>

      {/* Officers Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Nama Petugas</th>
              <th className="py-3 px-4">Penugasan TPS</th>
              <th className="py-3 px-4">Email Login</th>
              <th className="py-3 px-4">Password Bawaan</th>
              <th className="py-3 px-4">Kontak / WA</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredOfficers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                  Tidak ada petugas yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredOfficers.map((officer) => {
                const tps = tpsList.find(t => t.polling_station_id === officer.tps_id);
                return (
                  <tr key={officer.id} className="hover:bg-slate-50 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {officer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">{officer.full_name}</span>
                          <span className="text-[10px] text-slate-400">Operator TPS</span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned TPS */}
                    <td className="py-3 px-4">
                      {tps ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs">
                          <span className="font-bold">{tps.code}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[11px] truncate max-w-[140px]">{tps.banjar_name}</span>
                        </div>
                      ) : (
                        <span className="text-red-500 font-bold text-xs">TPS Tidak Ditemukan</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {officer.email}
                    </td>

                    {/* Password */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {officer.password || 'password123'}
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {officer.phone || '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(officer)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center"
                        title="Edit Petugas"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(officer)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors inline-flex items-center"
                        title="Hapus Petugas"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Officer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-headline-sm text-base font-bold text-slate-900">
                {editingOfficer ? 'Edit Data Petugas TPS' : 'Tambah Petugas TPS Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Penugasan TPS */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  Pilih Penugasan TPS *
                </label>
                <select
                  required
                  value={tpsId}
                  onChange={(e) => handleTpsSelectChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  {tpsList.map((tps) => {
                    const isOccupied = assignedTpsIds.has(tps.polling_station_id) && (!editingOfficer || editingOfficer.tps_id !== tps.polling_station_id);
                    return (
                      <option key={tps.polling_station_id} value={tps.polling_station_id}>
                        {tps.code} — {tps.banjar_name} {isOccupied ? '(Sudah ada petugas)' : '(Tersedia)'}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Petugas ini hanya akan memiliki akses melihat & menginput data di TPS ini.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  Nama Lengkap Petugas *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="contoh: Ni Wayan Sari"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  Email Login *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: tps01@pilkel.belega.id"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  Password Login *
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Contact / Phone */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  Nomor HP / WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="contoh: 081234567801"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-md"
                >
                  {editingOfficer ? 'Simpan Perubahan' : 'Tambah Petugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
