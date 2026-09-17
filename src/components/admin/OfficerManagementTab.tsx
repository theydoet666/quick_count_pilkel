import React, { useState } from 'react';
import { OfficerUser, TPSRecapItem, UserRole } from '../../types/database.types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { showAlert } from '../../lib/alerts';

interface OfficerManagementTabProps {
  officersList: OfficerUser[];
  tpsList: TPSRecapItem[];
  onAddOfficer: (officer: Omit<OfficerUser, 'id' | 'created_at'>) => void;
  onUpdateOfficer: (id: string, updates: Partial<OfficerUser>) => void;
  onDeleteOfficer: (id: string) => void;
  onResetSession?: (id: string) => void;
}

export const OfficerManagementTab: React.FC<OfficerManagementTabProps> = ({
  officersList,
  tpsList,
  onAddOfficer,
  onUpdateOfficer,
  onDeleteOfficer,
  onResetSession
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<OfficerUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('operator');
  const [tpsId, setTpsId] = useState<string>(tpsList[0]?.polling_station_id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Assigned TPS ids mapping (only for operators)
  const operatorOfficers = officersList.filter(o => o.role === 'operator' && o.tps_id);
  const assignedTpsIds = new Set(operatorOfficers.map(o => o.tps_id));
  const unassignedTpsCount = tpsList.filter(t => !assignedTpsIds.has(t.polling_station_id)).length;
  const adminCount = officersList.filter(o => o.role === 'admin' || !o.tps_id).length;

  const openAddModal = () => {
    setEditingOfficer(null);
    setRole('operator');
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
    setPassword('');
    setPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (officer: OfficerUser) => {
    setEditingOfficer(officer);
    setRole(officer.role === 'admin' || !officer.tps_id ? 'admin' : 'operator');
    setFullName(officer.full_name);
    setEmail(officer.email);
    setPassword(isSupabaseConfigured ? '' : (officer.password || ''));
    setPhone(officer.phone || '');
    setTpsId(officer.tps_id || '');
    setIsModalOpen(true);
  };

  const handleTpsSelectChange = (newTpsId: string) => {
    setTpsId(newTpsId);
    if (!editingOfficer && role === 'operator') {
      const selectedTps = tpsList.find(t => t.polling_station_id === newTpsId);
      if (selectedTps) {
        const codeClean = selectedTps.code.toLowerCase().replace(/\s+/g, '');
        setEmail(`${codeClean}@pilkel.belega.id`);
      }
    }
  };

  const handleRoleChange = (newRole: 'admin' | 'operator') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setTpsId('');
      if (!editingOfficer && !email) {
        setEmail('admin@pilkel.belega.id');
      }
    } else {
      const firstUnassigned = tpsList.find(t => !assignedTpsIds.has(t.polling_station_id)) || tpsList[0];
      if (firstUnassigned) {
        setTpsId(firstUnassigned.polling_station_id);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'operator' && !tpsId) {
      showAlert.warning('Penugasan Belum Dipilih', 'Silakan tentukan TPS penugasan untuk Petugas Operator.');
      return;
    }

    const finalTpsId = role === 'admin' ? null : tpsId;

    if (editingOfficer) {
      onUpdateOfficer(editingOfficer.id, {
        full_name: fullName,
        email,
        password,
        phone,
        role,
        tps_id: finalTpsId
      });
      showAlert.toast(`Data pengguna ${fullName} berhasil diperbarui!`, 'success');
    } else {
      onAddOfficer({
        full_name: fullName,
        email,
        password,
        phone,
        role,
        tps_id: finalTpsId
      });
      showAlert.toast(`Akun petugas ${fullName} berhasil ditambahkan!`, 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (officer: OfficerUser) => {
    const tps = tpsList.find(t => t.polling_station_id === officer.tps_id);
    const label = officer.role === 'admin' || !officer.tps_id ? 'Ketua Admin' : (tps?.code || 'Petugas TPS');
    const confirmed = await showAlert.confirm({
      title: 'Hapus Akun Pengguna?',
      text: `Apakah Anda yakin ingin menghapus akun ${officer.full_name} (${label})? Akun ini tidak akan dapat login lagi.`,
      confirmButtonText: 'Ya, Hapus Akun',
      cancelButtonText: 'Batal',
      icon: 'warning'
    });
    if (confirmed) {
      onDeleteOfficer(officer.id);
      showAlert.toast(`Akun ${officer.full_name} berhasil dihapus.`, 'info');
    }
  };

  const handleResetSessionConfirm = async (officer: OfficerUser) => {
    const tps = tpsList.find(t => t.polling_station_id === officer.tps_id);
    const label = officer.role === 'admin' ? 'Admin' : (tps?.code || 'Operator TPS');
    const confirmed = await showAlert.confirm({
      title: 'Reset / Buka Kunci Sesi?',
      text: `Apakah Anda yakin ingin mereset sesi aktif akun ${officer.full_name} (${label})? Sesi di perangkat yang sedang aktif akan dilepas sehingga akun dapat login kembali di perangkat baru.`,
      confirmButtonText: 'Ya, Reset Sesi',
      cancelButtonText: 'Batal',
      icon: 'question',
      confirmButtonClass: 'px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all mx-1 cursor-pointer'
    });
    if (confirmed && onResetSession) {
      onResetSession(officer.id);
      showAlert.toast(`Sesi akun ${officer.full_name} berhasil direset!`, 'success');
    }
  };

  const filteredOfficers = officersList.filter(o => {
    const tps = tpsList.find(t => t.polling_station_id === o.tps_id);
    const search = searchQuery.toLowerCase();
    const isAdmin = o.role === 'admin' || !o.tps_id;
    return (
      o.full_name.toLowerCase().includes(search) ||
      o.email.toLowerCase().includes(search) ||
      (isAdmin && 'admin ketua panitia semua tps'.includes(search)) ||
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
              Kelola Petugas TPS & Panitia
            </h2>
            <p className="text-body-sm text-slate-500 text-xs sm:text-sm">
              Kelola akun Panitia Pemilihan. Role <strong>Admin</strong> dapat mengakses & mengelola semua TPS, sedangkan <strong>Operator TPS</strong> dikhususkan untuk 1 TPS dan dilindungi dengan <strong>Single Active Session</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          Tambah Pengguna / Petugas
        </button>
      </div>

      {/* Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Total Pengguna</span>
          <span className="text-xl font-black text-slate-900 block tabular-nums">{officersList.length} Orang</span>
        </div>

        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-center">
          <span className="text-[11px] font-bold uppercase text-amber-800 block">Ketua Admin</span>
          <span className="text-xl font-black text-amber-900 block tabular-nums">{adminCount} Orang</span>
          <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">Akses Semua TPS</span>
        </div>

        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
          <span className="text-[11px] font-bold uppercase text-emerald-700 block">TPS Terisi Petugas</span>
          <span className="text-xl font-black text-emerald-700 block tabular-nums">{tpsList.length - unassignedTpsCount} / {tpsList.length}</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Petugas TPS Khusus</span>
        </div>

        <div className={`p-3 rounded-xl border text-center ${unassignedTpsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`text-[11px] font-bold uppercase block ${unassignedTpsCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>TPS Kosong</span>
          <span className={`text-xl font-black block tabular-nums ${unassignedTpsCount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{unassignedTpsCount} TPS</span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">{unassignedTpsCount === 0 ? 'Semua TPS Terisi' : 'Perlu Petugas'}</span>
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
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Nama Pengguna</th>
              <th className="py-3 px-4">Penugasan TPS</th>
              <th className="py-3 px-4">Status Sesi</th>
              <th className="py-3 px-4">Email Login</th>
              <th className="py-3 px-4">Kontak / WA</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredOfficers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                  Tidak ada data yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredOfficers.map((officer) => {
                const isAdmin = officer.role === 'admin' || !officer.tps_id;
                const tps = tpsList.find(t => t.polling_station_id === officer.tps_id);
                const isOnline = Boolean(
                  officer.active_session_token &&
                  officer.last_active_at &&
                  (Date.now() - new Date(officer.last_active_at).getTime() < 120000)
                );

                return (
                  <tr key={officer.id} className="hover:bg-slate-50 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                          isAdmin ? 'bg-amber-400/20 text-amber-800 border border-amber-400/40' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {officer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">{officer.full_name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider inline-block mt-0.5 ${
                            isAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isAdmin ? 'Ketua Admin' : 'Operator TPS'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned TPS / Access Scope */}
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300/80 text-amber-950 font-bold text-xs shadow-2xs">
                          <span className="material-symbols-outlined text-sm text-amber-700">admin_panel_settings</span>
                          <span>Semua TPS (Akses Penuh)</span>
                        </div>
                      ) : tps ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs">
                          <span className="font-bold">{tps.code}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[11px] truncate max-w-[140px]">{tps.banjar_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Belum Ditugaskan</span>
                      )}
                    </td>

                    {/* Session Status */}
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Multi-Device
                        </span>
                      ) : isOnline ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-300 text-rose-800 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                          <span>Aktif (Terkunci)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>Offline / Tersedia</span>
                        </div>
                      )}
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {officer.email}
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {officer.phone || '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Reset Session Button (Only if Operator is currently online) */}
                      {!isAdmin && isOnline && onResetSession && (
                        <button
                          onClick={() => handleResetSessionConfirm(officer)}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          title="Buka kunci sesi aktif akun ini"
                        >
                          <span className="material-symbols-outlined text-xs">lock_open</span>
                          <span>Reset Sesi</span>
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(officer)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center cursor-pointer"
                        title="Edit Data"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(officer)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors inline-flex items-center cursor-pointer"
                        title="Hapus Akun"
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
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-headline-sm text-base font-bold text-slate-900">
                {editingOfficer ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Role Selection */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1.5">
                  Peran / Hak Akses *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('operator')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'operator'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-0.5">
                      <span className="material-symbols-outlined text-base">how_to_vote</span>
                      <span>Operator TPS</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Akses dibatasi hanya untuk 1 TPS yang ditugaskan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs mb-0.5">
                      <span className="material-symbols-outlined text-base text-amber-700">admin_panel_settings</span>
                      <span>Ketua Admin</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Akses penuh semua TPS tanpa perlu memilih TPS.
                    </p>
                  </button>
                </div>
              </div>

              {/* Penugasan TPS (Only if Operator) */}
              {role === 'operator' ? (
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
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-amber-700 shrink-0 mt-0.5">info</span>
                  <span>Sebagai <strong>Ketua Admin</strong>, akun ini memiliki akses ke seluruh TPS ({tpsList.length} TPS) serta menu pengaturan, kelola calon, dan manajemen DPT.</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === 'admin' ? 'contoh: I Gede Ketut (Ketua Panitia)' : 'contoh: Ni Wayan Sari'}
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
                  placeholder="contoh: nama@pilkel.belega.id"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Password — hanya relevan di mode demo offline */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1">
                  {isSupabaseConfigured ? 'Password (Dikelola Supabase Auth)' : 'Password Login *'}
                </label>
                {isSupabaseConfigured ? (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2">
                    Password petugas dikelola di <strong>Supabase Dashboard → Authentication → Users</strong>. Atur password di sana setelah menyimpan data ini.
                  </p>
                ) : (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password demo"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                )}
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer"
                >
                  {editingOfficer ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
