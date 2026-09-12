import React, { useState, useEffect } from 'react';
import { MOCK_OFFICERS, MOCK_TPS_RECAP } from '../lib/mockData';
import { OfficerUser, TPSRecapItem } from '../types/database.types';

interface AdminLoginProps {
  onLogin: (
    email: string,
    pass: string,
    role?: 'admin' | 'operator',
    tpsId?: string | null,
    fullName?: string
  ) => Promise<{ error: any }>;
  onBackToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBackToPublic }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [officers, setOfficers] = useState<OfficerUser[]>([]);
  const [tpsList, setTpsList] = useState<TPSRecapItem[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');

  useEffect(() => {
    try {
      const savedTps = localStorage.getItem('belega_tps_recap');
      const loadedTps: TPSRecapItem[] = savedTps ? JSON.parse(savedTps) : MOCK_TPS_RECAP;
      setTpsList(loadedTps);

      const savedOfficers = localStorage.getItem('belega_officers');
      const rawOfficers: OfficerUser[] = savedOfficers ? JSON.parse(savedOfficers) : MOCK_OFFICERS;
      
      // Filter out admin users from operator dropdown and map each TPS to an operator
      const validOperators = rawOfficers.filter(o => o.role === 'operator' && o.tps_id);
      
      // Ensure every TPS has an operator representation
      const completeOperators: OfficerUser[] = loadedTps.map((tps, idx) => {
        const existing = validOperators.find(o => o.tps_id === tps.polling_station_id);
        if (existing) return existing;
        return {
          id: `op-${tps.polling_station_id}`,
          full_name: `Petugas ${tps.code} (${tps.banjar_name})`,
          email: `tps${(idx + 1) < 10 ? '0' + (idx + 1) : idx + 1}@pilkel.belega.id`,
          password: 'password123',
          tps_id: tps.polling_station_id,
          role: 'operator',
          created_at: new Date().toISOString()
        };
      });

      setOfficers(completeOperators);
      if (completeOperators.length > 0) {
        setSelectedOfficerId(completeOperators[0].id);
      }
    } catch {
      setOfficers(MOCK_OFFICERS);
      setTpsList(MOCK_TPS_RECAP);
      if (MOCK_OFFICERS.length > 0) {
        setSelectedOfficerId(MOCK_OFFICERS[0].id);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email dan kata sandi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    const res = await onLogin(email, password);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error.message || 'Login gagal. Periksa kembali email dan kata sandi.');
    }
  };

  const handleQuickAdminLogin = async () => {
    setIsSubmitting(true);
    await onLogin('admin@pilkel.belega.id', 'password123', 'admin', null, 'I Gede Ketut (Ketua Panitia)');
    setIsSubmitting(false);
  };

  const handleQuickOfficerLogin = async () => {
    const officer = officers.find(o => o.id === selectedOfficerId) || officers[0];
    if (!officer) return;

    setIsSubmitting(true);
    await onLogin(officer.email, 'password123', 'operator', officer.tps_id, officer.full_name);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-space-md select-none">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-space-lg shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-space-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto mb-space-xs shadow-md">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-slate-900 font-black">
            Panel Panitia Pilkel Belega
          </h2>
          <p className="text-body-sm text-slate-500 mt-space-3xs">
            Masuk untuk menginput hasil suara TPS atau mengelola data pemilihan.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-error-container text-on-error-container p-space-sm rounded-xl mb-space-md text-body-sm flex items-center gap-space-xs border border-error/30 shadow-xs">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-space-md">
          <div>
            <label className="block font-label-sm text-label-sm text-slate-700 font-bold mb-space-3xs">
              Email Petugas / Admin
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@pilkel.belega.id"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-slate-700 font-bold mb-space-3xs">
              Kata Sandi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-space-xs cursor-pointer text-sm"
          >
            {isSubmitting ? 'Memproses...' : 'Masuk ke Panel'}
          </button>
        </form>

        {/* Quick Testing Login Options */}
        <div className="mt-space-lg pt-space-md border-t border-slate-200">
          <p className="font-label-sm text-[11px] text-slate-400 text-center mb-space-xs uppercase font-bold tracking-wider">
            ⚡ Akses Cepat Simulasi Peran
          </p>
          
          <div className="space-y-space-xs">
            {/* 1. Admin Quick Login */}
            <button
              onClick={handleQuickAdminLogin}
              disabled={isSubmitting}
              className="w-full bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-950 font-label-sm py-2 px-3 rounded-xl flex items-center justify-between transition-all font-semibold cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="material-symbols-outlined text-amber-700 text-lg">verified_user</span>
                <div>
                  <span className="font-bold text-xs text-amber-900 block">Ketua Panitia (Admin)</span>
                  <span className="block text-[10px] text-amber-700 font-normal">Akses penuh seluruh TPS & menu admin</span>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-800">Masuk →</span>
            </button>

            {/* 2. Officer Quick Login */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="material-symbols-outlined text-base text-emerald-700">how_to_vote</span>
                <label className="block text-xs font-bold">
                  Simulasi Login Sebagai Petugas TPS:
                </label>
              </div>
              
              <div className="w-full min-w-0">
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-bold focus:border-emerald-600 focus:outline-none shadow-xs"
                >
                  {officers.map((off) => {
                    const assignedTps = tpsList.find(t => t.polling_station_id === off.tps_id);
                    return (
                      <option key={off.id} value={off.id}>
                        {assignedTps ? `${assignedTps.code} (${assignedTps.banjar_name})` : 'TPS'} • {off.full_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                onClick={handleQuickOfficerLogin}
                disabled={isSubmitting || officers.length === 0}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">badge</span>
                <span>Masuk Sebagai Petugas TPS Terpilih →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back to Public */}
        <div className="mt-space-md text-center">
          <button
            onClick={onBackToPublic}
            className="text-xs text-slate-500 hover:text-emerald-700 font-bold underline cursor-pointer"
          >
            ← Kembali ke Dashboard Publik
          </button>
        </div>

      </div>
    </div>
  );
};

