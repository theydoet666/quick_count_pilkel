import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useRealtimeResults } from '../hooks/useRealtimeResults';
import { VoteEntryModal } from '../components/admin/VoteEntryModal';
import { TPSAuditLogModal } from '../components/admin/TPSAuditLogModal';
import { PrintReportModal } from '../components/admin/PrintReportModal';
import { ElectionSettingsTab } from '../components/admin/ElectionSettingsTab';
import { TPSManagementTab } from '../components/admin/TPSManagementTab';
import { CandidateManagementTab } from '../components/admin/CandidateManagementTab';
import { OfficerManagementTab } from '../components/admin/OfficerManagementTab';
import { TPSRecapItem, UserRole, TPSStatus } from '../types/database.types';

interface AdminDashboardProps {
  userEmail: string;
  role: UserRole;
  fullName: string;
  tpsId?: string | null;
  onLogout: () => void;
  onViewPublic: () => void;
}

type AdminTab = 'recap' | 'officers' | 'tps' | 'candidates' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userEmail,
  role,
  fullName,
  tpsId,
  onLogout,
  onViewPublic
}) => {
  const {
    summary,
    tpsList,
    candidatesList,
    officersList,
    electionSettings,
    updateSettings,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addTPS,
    updateTPSDetails,
    deleteTPS,
    updateTPSLocal,
    updateTPSStatusLocal,
    addOfficer,
    updateOfficer,
    deleteOfficer,
    auditLogs
  } = useRealtimeResults();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('recap');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTpsForVote, setSelectedTpsForVote] = useState<TPSRecapItem | null>(null);
  const [selectedTpsForAudit, setSelectedTpsForAudit] = useState<TPSRecapItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Current Officer Info & Password Security Check
  const currentOfficer = officersList.find(o => o.email.toLowerCase() === userEmail.toLowerCase()) 
    || (role === 'operator' && tpsId ? officersList.find(o => o.tps_id === tpsId) : null)
    || (role === 'admin' ? officersList.find(o => o.role === 'admin') : null);

  // Peringatan password default hanya relevan di mode demo offline
  const isDefaultPassword = !isSupabaseConfigured && (!currentOfficer?.password || currentOfficer?.password === 'password123');

  // Change Password State
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordVisibility, setShowPasswordVisibility] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [passwordUpdateSuccessMsg, setPasswordUpdateSuccessMsg] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');

    if (isSupabaseConfigured) {
      // Mode produksi: validasi password lama dilakukan oleh Supabase Auth saat login
    } else {
      if (!currentOfficer) {
        setChangePasswordError('Data akun tidak ditemukan.');
        return;
      }
      const expectedPass = currentOfficer.password || '';
      if (currentPasswordInput !== expectedPass) {
        setChangePasswordError('Kata sandi saat ini tidak cocok.');
        return;
      }
    }

    if (newPasswordInput.length < 6) {
      setChangePasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
        if (error) {
          setIsSubmittingPassword(false);
          setChangePasswordError(error.message || 'Gagal mengubah kata sandi.');
          return;
        }
      } else {
        if (!currentOfficer) throw new Error('Data akun tidak ditemukan.');
        const expectedPass = currentOfficer.password || '';
        if (currentPasswordInput !== expectedPass) {
          setIsSubmittingPassword(false);
          setChangePasswordError('Kata sandi saat ini tidak cocok.');
          return;
        }
        updateOfficer(currentOfficer.id, { password: newPasswordInput });
      }
      setIsSubmittingPassword(false);
      setIsChangePasswordModalOpen(false);
      setPasswordUpdateSuccessMsg('Kata sandi Anda berhasil diperbarui! Akun Anda kini lebih aman.');
      setTimeout(() => setPasswordUpdateSuccessMsg(''), 6000);
    } catch (err: any) {
      setIsSubmittingPassword(false);
      setChangePasswordError(err.message || 'Gagal mengubah kata sandi.');
    }
  };

  // 1. Resolve Effective TPS ID for Operator
  const isOperator = role === 'operator';

  // Resolusi penugasan TPS cerdas:
  // a. Dari props tpsId (Supabase Profile)
  // b. Dari data currentOfficer.tps_id
  // c. Dari pola email (mis. tps03@... cocok otomatis dengan TPS 03 / TPS 3)
  const matchedTpsByEmail = isOperator ? tpsList.find(t => {
    const emailNumMatch = userEmail.match(/tps0*(\d+)/i);
    if (emailNumMatch && emailNumMatch[1]) {
      const emailNum = parseInt(emailNumMatch[1], 10);
      const codeNumMatch = t.code.match(/0*(\d+)/);
      if (codeNumMatch && codeNumMatch[1]) {
        return emailNum === parseInt(codeNumMatch[1], 10);
      }
    }
    return false;
  }) : null;

  const effectiveTpsId = tpsId || currentOfficer?.tps_id || matchedTpsByEmail?.polling_station_id || null;
  const assignedTps = isOperator && effectiveTpsId ? tpsList.find(t => t.polling_station_id === effectiveTpsId) : null;

  // PRINSIP KEAMANAN KETAT:
  // Operator HANYA boleh melihat TPS miliknya ([assignedTps]).
  // Jika belum terhubung, tampilkan list kosong [] — JANGAN PERNAH fallback ke seluruh TPS!
  const visibleTpsList = isOperator 
    ? (assignedTps ? [assignedTps] : []) 
    : tpsList;

  // Status counts
  const pendingCount = visibleTpsList.filter(t => t.status === 'pending').length;
  const submittedCount = visibleTpsList.filter(t => t.status === 'submitted').length;
  const verifiedCount = visibleTpsList.filter(t => t.status === 'verified').length;
  const lockedCount = visibleTpsList.filter(t => t.status === 'locked').length;

  const currentActor = {
    id: currentOfficer?.id || (role === 'admin' ? 'usr-admin' : 'usr-op'),
    full_name: fullName,
    role: role
  };

  const handleVerifyTPS = (targetTpsId: string) => {
    updateTPSStatusLocal(targetTpsId, 'verified', currentActor);
  };

  const handleLockTPS = (targetTpsId: string, currentStatus: TPSStatus) => {
    const nextStatus = currentStatus === 'locked' ? 'verified' : 'locked';
    updateTPSStatusLocal(targetTpsId, nextStatus, currentActor);
  };

  const handleSaveVotes = (
    targetTpsId: string,
    votes1: number,
    votes2: number,
    invalid: number,
    photoUrl?: string,
    newStatus?: TPSStatus,
    additionalVoters?: number
  ) => {
    // Validasi otorisasi di client: Operator hanya boleh menyimpan ke TPS miliknya
    if (isOperator && effectiveTpsId && targetTpsId !== effectiveTpsId) {
      alert('Anda tidak memiliki izin untuk menginput data ke TPS lain.');
      return;
    }
    updateTPSLocal(targetTpsId, votes1, votes2, invalid, photoUrl, newStatus, additionalVoters, currentActor);
  };

  const navItems: { id: AdminTab; label: string; icon: string; count?: number; adminOnly?: boolean }[] = [
    { id: 'recap', label: isOperator ? 'Input Suara TPS Saya' : 'Rekapitulasi Suara', icon: 'ballot' },
    { id: 'officers', label: 'Kelola Petugas TPS', icon: 'group', count: officersList.length, adminOnly: true },
    { id: 'tps', label: 'Kelola TPS & DPT', icon: 'how_to_vote', count: tpsList.length, adminOnly: true },
    { id: 'candidates', label: 'Kelola Calon & Foto', icon: 'badge', count: candidatesList.length, adminOnly: true },
    { id: 'settings', label: 'Pengaturan & Logo', icon: 'settings', adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.adminOnly || role === 'admin');

  // Helper to get active tab title
  const activeTabMeta = navItems.find(n => n.id === activeTab);

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-700/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface p-1 shadow-md border border-outline-variant/30 flex items-center justify-center overflow-hidden shrink-0">
          {electionSettings.logo_url ? (
            <img src={electionSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full text-primary" fill="currentColor">
              <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="#2F4030" strokeWidth="6" />
              <circle cx="50" cy="50" r="22" fill="#9C4A32" />
              <path d="M50 20 L55 35 L70 35 L58 45 L62 60 L50 50 L38 60 L42 45 L30 35 L45 35 Z" fill="#B8933F" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline-sm text-sm sm:text-base font-black text-white truncate leading-tight">
            {electionSettings.title}
          </h1>
          <p className="text-[11px] text-amber-300 font-medium truncate mt-0.5">
            Panel Administrator & Tabulasi
          </p>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-[#111a12] border border-slate-700/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-sm">
          {fullName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate leading-tight">
            {fullName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`px-1.5 py-0.2 text-[10px] font-black rounded uppercase tracking-wider ${
              role === 'admin' ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'
            }`}>
              {role === 'admin' ? 'Ketua Admin' : 'Operator TPS'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="px-3 py-2 flex-1 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
          Menu Utama
        </p>
        {visibleNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between transition-all group text-left ${
                isActive
                  ? 'bg-emerald-700/90 text-white shadow-md border-l-4 border-amber-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`material-symbols-outlined text-lg ${isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-white'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer / Quick Links */}
      <div className="p-3 border-t border-slate-700/60 space-y-2 bg-[#121c13]">
        <button
          onClick={onViewPublic}
          className="w-full px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base text-amber-400">tv</span>
          <span>Buka Layar Publik</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-700/40 rounded-xl text-red-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base text-red-400">logout</span>
          <span>Keluar Sesi</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col lg:flex-row select-none antialiased">
      
      {/* 1. PC FIXED SIDEBAR (lg and up) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 lg:fixed lg:inset-y-0 bg-[#162217] text-white border-r border-slate-700/60 shadow-xl z-30">
        {renderSidebarContent()}
      </aside>

      {/* 2. MOBILE TOP NAVBAR (below lg) */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#162217] text-white border-b border-slate-700/60 px-3 sm:px-4 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 focus:outline-none"
            title="Buka Menu Navigasi"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-surface p-1 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              {electionSettings.logo_url ? (
                <img src={electionSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="material-symbols-outlined text-primary text-lg">how_to_vote</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-sm text-white truncate max-w-[160px] sm:max-w-xs">
                {electionSettings.title}
              </h1>
              <p className="text-[10px] text-amber-300 truncate">
                {activeTabMeta?.label || 'Dashboard Admin'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onViewPublic}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
            title="Lihat Layar Publik"
          >
            <span className="material-symbols-outlined text-base">tv</span>
            <span className="hidden sm:inline">Publik</span>
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg bg-red-950/60 border border-red-700/50 text-red-300 hover:text-white transition-colors"
            title="Keluar"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </header>

      {/* 3. MOBILE SLIDE-OVER DRAWER */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#162217] text-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        {renderSidebarContent()}
      </aside>

      {/* 4. MAIN CONTENT AREA */}
      <div className="lg:pl-64 xl:pl-72 flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        
        {/* Desktop Top Header Bar */}
        <div className="hidden lg:flex items-center justify-between px-6 xl:px-8 py-4 bg-white border-b border-slate-200 shadow-xs sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-0.5">
              <span>Admin Panel</span>
              <span>/</span>
              <span className="text-emerald-700 font-bold">{activeTabMeta?.label}</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              {activeTabMeta?.label}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5">
              <span>Petugas:</span>
              <strong className="text-slate-800">{fullName}</strong>
            </span>
            <button
              onClick={() => {
                setIsChangePasswordModalOpen(true);
                setCurrentPasswordInput('');
                setNewPasswordInput('');
                setConfirmPasswordInput('');
                setChangePasswordError('');
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-emerald-700 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Ganti kata sandi akun saya"
            >
              <span className="material-symbols-outlined text-xs text-emerald-700">key</span>
              <span>Ubah Sandi</span>
            </button>
            {role === 'admin' && (
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Cetak Rekapitulasi Berita Acara (PDF / Print)"
              >
                <span className="material-symbols-outlined text-xs text-amber-400">print</span>
                <span>Cetak Berita Acara</span>
              </button>
            )}
            <button
              onClick={onViewPublic}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">tv</span>
              <span>Layar Siaran Publik</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        <main className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[1400px] w-full">
          
          {/* Success Notification Alert */}
          {passwordUpdateSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-700 text-xl">check_circle</span>
                <span>{passwordUpdateSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUpdateSuccessMsg('')}
                className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Security Warning Banner for Default Password (Khusus Petugas / Akun dengan Sandi Standar) */}
          {isDefaultPassword && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 shadow-sm animate-fadeIn">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs mt-0.5 sm:mt-0">
                  <span className="material-symbols-outlined text-2xl">lock_reset</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-amber-950">
                      Peringatan Keamanan: Kata Sandi Akun Masih Standar
                    </h3>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-extrabold border border-amber-300">
                      Perlu Diubah
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-snug">
                    Akun Petugas <strong>{fullName}</strong> saat ini masih menggunakan kata sandi bawaan sistem. Segera ganti kata sandi untuk melindungi keamanan data hasil suara TPS Anda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsChangePasswordModalOpen(true);
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                  setChangePasswordError('');
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-base">key</span>
                <span>Ubah Kata Sandi Sekarang</span>
              </button>
            </div>
          )}

          {/* Operator Notice Banner */}
          {isOperator && (
            <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-xl">how_to_vote</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-950">
                    Penugasan Petugas TPS: {assignedTps ? `${assignedTps.code} (${assignedTps.banjar_name})` : 'TPS Belum Ditugaskan'}
                  </h3>
                  <p className="text-xs text-emerald-700">
                    {assignedTps
                      ? `Anda hanya dapat melihat dan menginput hasil perhitungan suara untuk ${assignedTps.code}.`
                      : 'Akun Anda belum terhubung dengan TPS tertentu. Hubungi Ketua Admin untuk penugasan.'}
                  </p>
                </div>
              </div>
              {assignedTps && (
                <button
                  onClick={() => setSelectedTpsForVote(assignedTps)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Input Suara {assignedTps.code}
                </button>
              )}
            </div>
          )}

          {/* TAB 1: REKAPITULASI SUARA */}
          {activeTab === 'recap' && (
            <>
              {/* Status Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 text-center shadow-xs">
                  <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold block">
                    Verified / Locked
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 block tabular-nums my-1">
                    {verifiedCount + lockedCount} / {visibleTpsList.length}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">{isOperator ? 'Status TPS Saya' : 'Tampil di Publik'}</span>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 text-center shadow-xs">
                  <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold block">
                    Submitted (Draft)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-600 block tabular-nums my-1">
                    {submittedCount}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Perlu Verifikasi</span>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 text-center shadow-xs">
                  <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold block">
                    Pending
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-600 block tabular-nums my-1">
                    {pendingCount}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Belum Diinput</span>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 text-center shadow-xs">
                  <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold block">
                    Total Hak Pilih {isOperator ? 'TPS' : ''}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-800 block tabular-nums my-1">
                    {(visibleTpsList.reduce((sum, t) => sum + t.registered_voters + (t.additional_voters || 0), 0)).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
                    {visibleTpsList.reduce((sum, t) => sum + t.registered_voters, 0).toLocaleString('id-ID')} DPT + {visibleTpsList.reduce((sum, t) => sum + (t.additional_voters || 0), 0).toLocaleString('id-ID')} DPTb
                  </span>
                </div>
              </div>

              {/* TPS Management Ledger Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {isOperator ? 'Data Tabulasi TPS Anda' : 'Daftar TPS & Rekapitulasi Suara'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isOperator
                        ? 'Input dan kirimkan data perolehan suara formulir C-Hasil TPS Anda.'
                        : 'Kelola input suara, verifikasi data, dan penguncian seluruh TPS Desa Belega.'}
                    </p>
                  </div>
                  {role === 'admin' && (
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-2xs transition-all cursor-pointer"
                      title="Cetak Berita Acara Tabulasi Lengkap"
                    >
                      <span className="material-symbols-outlined text-sm text-emerald-700">print</span>
                      <span>Export / Cetak Berita Acara</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] sm:text-xs uppercase tracking-wider border-b border-slate-200/70">
                      <tr>
                        <th className="py-3 px-4 font-bold">TPS / Banjar</th>
                        <th className="py-3 px-2 text-center font-bold">DPT & DPTb</th>
                        {summary.candidates.map((c) => (
                          <th key={c.id} className="py-3 px-2 text-center font-bold">
                            0{c.number} {c.name.split(',')[0]}
                          </th>
                        ))}
                        <th className="py-3 px-2 text-center font-bold">Tidak Sah</th>
                        <th className="py-3 px-2 text-center font-bold">Status TPS</th>
                        <th className="py-3 px-4 text-right font-bold">{isOperator ? 'Aksi Input' : 'Aksi Panitia'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {visibleTpsList.length === 0 ? (
                        <tr>
                          <td colSpan={5 + summary.candidates.length} className="py-10 text-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">how_to_vote</span>
                            <p className="font-bold text-slate-700 text-sm">Tidak Ada TPS yang Terhubung</p>
                            <p className="text-xs text-slate-400 mt-0.5">Akun Anda belum dipetakan ke TPS manapun. Silakan hubungi Ketua Panitia.</p>
                          </td>
                        </tr>
                      ) : (
                        visibleTpsList.map((tps) => {
                          const addVoters = tps.additional_voters || 0;
                          const totalVoters = tps.registered_voters + addVoters;
                          return (
                            <tr key={tps.polling_station_id} className="hover:bg-slate-50 transition-colors">
                            {/* TPS Code & Banjar */}
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block leading-tight">{tps.code}</span>
                              <span className="text-xs text-slate-500">{tps.banjar_name}</span>
                            </td>

                            {/* DPT & DPTb */}
                            <td className="py-3 px-2 text-center font-semibold text-slate-700 tabular-nums">
                              <span className="font-bold block text-slate-900">{totalVoters.toLocaleString('id-ID')}</span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {tps.registered_voters} + {addVoters} DPTb
                              </span>
                            </td>

                            {/* Candidate Votes */}
                            {summary.candidates.map((c) => {
                              const votes = tps.candidate_votes[String(c.number)]?.votes || 0;
                              return (
                                <td key={c.id} className="py-3 px-2 text-center font-bold tabular-nums" style={{ color: c.color_hex }}>
                                  {votes.toLocaleString('id-ID')}
                                </td>
                              );
                            })}

                            {/* Invalid Votes */}
                            <td className="py-3 px-2 text-center font-bold text-red-600 tabular-nums">
                              {tps.invalid_votes_count.toLocaleString('id-ID')}
                            </td>

                            {/* Status Chip */}
                            <td className="py-3 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] sm:text-xs uppercase ${
                                tps.status === 'verified'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50'
                                  : tps.status === 'locked'
                                  ? 'bg-slate-800 text-white'
                                  : tps.status === 'submitted'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300/50'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {tps.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {/* Input/Edit Button */}
                              <button
                                onClick={() => setSelectedTpsForVote(tps)}
                                className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors shadow-xs"
                                title="Input / Edit Suara"
                              >
                                <span className="material-symbols-outlined text-xs align-middle mr-0.5">edit</span>
                                Input
                              </button>

                              {/* Admin Direct Verify Action */}
                              {role === 'admin' && tps.status === 'submitted' && (
                                <button
                                  onClick={() => handleVerifyTPS(tps.polling_station_id)}
                                  className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors"
                                  title="Tandai Terverifikasi"
                                >
                                  Verifikasi
                                </button>
                              )}

                              {/* Admin Lock / Unlock Action */}
                              {role === 'admin' && (tps.status === 'verified' || tps.status === 'locked') && (
                                <button
                                  onClick={() => handleLockTPS(tps.polling_station_id, tps.status)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                    tps.status === 'locked'
                                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                  }`}
                                  title={tps.status === 'locked' ? 'Buka Kunci' : 'Kunci TPS'}
                                >
                                  {tps.status === 'locked' ? 'Unlock' : 'Lock'}
                                </button>
                              )}

                              {/* Audit Log Button */}
                              <button
                                onClick={() => setSelectedTpsForAudit(tps)}
                                className="p-1 text-slate-400 hover:text-emerald-700 rounded transition-colors inline-block"
                                title="Lihat Riwayat Audit Log"
                              >
                                <span className="material-symbols-outlined text-base align-middle">history</span>
                              </button>
                            </td>

                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: KELOLA PETUGAS TPS (ADMIN ONLY) */}
          {activeTab === 'officers' && role === 'admin' && (
            <OfficerManagementTab
              officersList={officersList}
              tpsList={tpsList}
              onAddOfficer={addOfficer}
              onUpdateOfficer={updateOfficer}
              onDeleteOfficer={deleteOfficer}
            />
          )}

          {/* TAB 3: KELOLA TPS & DPT (ADMIN ONLY) */}
          {activeTab === 'tps' && role === 'admin' && (
            <TPSManagementTab
              tpsList={tpsList}
              onAddTPS={addTPS}
              onUpdateTPS={updateTPSDetails}
              onDeleteTPS={deleteTPS}
            />
          )}

          {/* TAB 4: KELOLA CALON & FOTO (ADMIN ONLY) */}
          {activeTab === 'candidates' && role === 'admin' && (
            <CandidateManagementTab
              candidates={candidatesList}
              onAddCandidate={addCandidate}
              onUpdateCandidate={updateCandidate}
              onDeleteCandidate={deleteCandidate}
            />
          )}

          {/* TAB 5: PENGATURAN LOGO & JUDUL (ADMIN ONLY) */}
          {activeTab === 'settings' && role === 'admin' && (
            <ElectionSettingsTab
              settings={electionSettings}
              onSaveSettings={updateSettings}
            />
          )}

        </main>
      </div>

      {/* Modals */}
      {selectedTpsForVote && (
        <VoteEntryModal
          tps={selectedTpsForVote}
          candidates={summary.candidates}
          userRole={role}
          onClose={() => setSelectedTpsForVote(null)}
          onSaveVotes={handleSaveVotes}
        />
      )}

      {selectedTpsForAudit && (
        <TPSAuditLogModal
          tps={selectedTpsForAudit}
          auditLogs={auditLogs}
          onClose={() => setSelectedTpsForAudit(null)}
        />
      )}

      {/* Modal Cetak / Export Berita Acara Tabulasi (PDF / Print) */}
      {isPrintModalOpen && (
        <PrintReportModal
          summary={summary}
          tpsList={tpsList}
          candidates={candidatesList}
          settings={electionSettings}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Modal Ubah Kata Sandi Petugas */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-2xl animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ubah Kata Sandi Akun
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akun: <strong>{fullName}</strong> ({userEmail})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Error Notification in Modal */}
            {changePasswordError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-rose-600 shrink-0">error</span>
                <span>{changePasswordError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Lama / Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showPasswordVisibility ? 'text' : 'password'}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="Masukkan kata sandi saat ini..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordVisibility(!showPasswordVisibility)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showPasswordVisibility ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <input
                  type={showPasswordVisibility ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi baru..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs"
                  minLength={6}
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  type={showPasswordVisibility ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs"
                  minLength={6}
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  disabled={isSubmittingPassword}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isSubmittingPassword ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>Simpan Sandi Baru</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};


