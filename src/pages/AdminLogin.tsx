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
      const savedOfficers = localStorage.getItem('belega_officers');
      const loadedOfficers: OfficerUser[] = savedOfficers ? JSON.parse(savedOfficers) : MOCK_OFFICERS;
      setOfficers(loadedOfficers);

      const savedTps = localStorage.getItem('belega_tps_recap');
      const loadedTps: TPSRecapItem[] = savedTps ? JSON.parse(savedTps) : MOCK_TPS_RECAP;
      setTpsList(loadedTps);

      if (loadedOfficers.length > 0) {
        setSelectedOfficerId(loadedOfficers[0].id);
      }
    } catch {
      setOfficers(MOCK_OFFICERS);
      setTpsList(MOCK_TPS_RECAP);
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
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-md w-full p-space-lg shadow-lg">
        
        {/* Header */}
        <div className="text-center mb-space-lg">
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center mx-auto mb-space-xs shadow-sm">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-primary font-bold">
            Panel Panitia Pilkel Belega
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-space-3xs">
            Masuk untuk menginput hasil suara TPS atau mengelola data pemilihan.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-error-container text-on-error-container p-space-sm rounded mb-space-md text-body-sm flex items-center gap-space-xs border border-error/30">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-space-md">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-space-3xs">
              Email Petugas / Admin
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@pilkel.belega.id"
              className="w-full bg-surface border border-outline-variant rounded px-space-sm py-space-xs text-body-md focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-space-3xs">
              Kata Sandi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface border border-outline-variant rounded px-space-sm py-space-xs text-body-md focus:border-primary focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg font-bold py-space-xs rounded shadow-sm transition-colors flex items-center justify-center gap-space-xs cursor-pointer"
          >
            {isSubmitting ? 'Memproses...' : 'Masuk ke Panel'}
          </button>
        </form>

        {/* Quick Testing Login Options */}
        <div className="mt-space-lg pt-space-md border-t border-surface-container">
          <p className="font-label-sm text-label-sm text-on-surface-variant text-center mb-space-xs uppercase font-semibold">
            ⚡ Akses Cepat Simulasi Peran
          </p>
          
          <div className="space-y-space-xs">
            <button
              onClick={handleQuickAdminLogin}
              disabled={isSubmitting}
              className="w-full bg-primary-container/20 hover:bg-primary-container/40 border border-primary/40 text-primary font-label-sm text-label-sm py-space-xs px-space-sm rounded flex items-center justify-between transition-colors font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-space-2xs text-left">
                <span className="material-symbols-outlined text-base">verified_user</span>
                <div>
                  <span className="font-bold">Ketua Panitia (Admin)</span>
                  <span className="block text-[10px] text-on-surface-variant font-normal">Akses penuh semua TPS & menu Petugas TPS</span>
                </div>
              </div>
              <span className="text-xs">Masuk →</span>
            </button>

            <div className="bg-surface-container border border-outline-variant rounded p-space-xs space-y-2">
              <label className="block font-label-xs text-[11px] text-on-surface-variant font-medium">
                Simulasi Login Sebagai Petugas TPS Tertentu:
              </label>
              
              <div className="w-full min-w-0">
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full min-w-0 max-w-full bg-surface border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-medium focus:outline-hidden text-ellipsis overflow-hidden"
                >
                  {officers
                    .filter(off => off.role === 'operator' || off.tps_id)
                    .concat(officers.filter(off => off.role === 'operator' || off.tps_id).length === 0 ? MOCK_OFFICERS : [])
                    .map((off) => {
                      const assignedTps = tpsList.find(t => t.polling_station_id === off.tps_id);
                      return (
                        <option key={off.id} value={off.id}>
                          {assignedTps ? `${assignedTps.code} (${assignedTps.banjar_name})` : 'Petugas TPS'} - {off.full_name}
                        </option>
                      );
                    })}
                </select>
              </div>

              <button
                onClick={handleQuickOfficerLogin}
                disabled={isSubmitting || officers.length === 0}
                className="w-full bg-secondary text-on-secondary hover:bg-secondary/90 py-1.5 px-3 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
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
            className="text-body-sm text-on-surface-variant hover:text-primary underline cursor-pointer"
          >
            ← Kembali ke Dashboard Publik
          </button>
        </div>

      </div>
    </div>
  );
};

