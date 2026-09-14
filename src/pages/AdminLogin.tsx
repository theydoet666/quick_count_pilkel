import React, { useState, useEffect } from 'react';
import { MOCK_OFFICERS, MOCK_TPS_RECAP, DEFAULT_ELECTION_SETTINGS } from '../lib/mockData';
import { OfficerUser, TPSRecapItem, ElectionSettings } from '../types/database.types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { updateDynamicFavicon } from '../lib/dynamicFavicon';

interface AdminLoginProps {
  onLogin: (
    email: string,
    pass: string
  ) => Promise<{ error: any }>;
  onBackToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBackToPublic }) => {
  const [loginMode, setLoginMode] = useState<'select' | 'manual'>('select');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [manualEmail, setManualEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings & Officers State
  const [electionSettings, setElectionSettings] = useState<ElectionSettings>(() => {
    try {
      const saved = localStorage.getItem('belega_election_settings');
      return saved ? JSON.parse(saved) : DEFAULT_ELECTION_SETTINGS;
    } catch {
      return DEFAULT_ELECTION_SETTINGS;
    }
  });

  const [officers, setOfficers] = useState<OfficerUser[]>([]);
  const [tpsList, setTpsList] = useState<TPSRecapItem[]>([]);

  // Load data & Listen for cross-tab updates
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Settings
        const savedSettingsStr = localStorage.getItem('belega_election_settings');
        if (savedSettingsStr) {
          const parsed = JSON.parse(savedSettingsStr);
          setElectionSettings(parsed);
          updateDynamicFavicon(parsed.logo_url, `Login Panitia - ${parsed.title || 'Pilkel Belega'}`);
        } else {
          updateDynamicFavicon(null);
        }

        if (isSupabaseConfigured) {
          supabase
            .from('election_settings')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                const mapped = {
                  title: data.title || DEFAULT_ELECTION_SETTINGS.title,
                  subtitle: data.subtitle || DEFAULT_ELECTION_SETTINGS.subtitle,
                  organizer: data.organizer || DEFAULT_ELECTION_SETTINGS.organizer,
                  logo_url: data.logo_url || null,
                  flash_count_text: data.flash_count_text || 'FLASH COUNT',
                  ticker_speed: data.ticker_speed || 30
                };
                setElectionSettings(mapped);
                updateDynamicFavicon(mapped.logo_url, `Login Panitia - ${mapped.title}`);
              }
            });
        }

        // 2. TPS & Officers
        const savedTps = localStorage.getItem('belega_tps_recap');
        const loadedTps: TPSRecapItem[] = savedTps ? JSON.parse(savedTps) : MOCK_TPS_RECAP;
        setTpsList(loadedTps);

        const savedOfficers = localStorage.getItem('belega_officers');
        const rawOfficers: OfficerUser[] = savedOfficers ? JSON.parse(savedOfficers) : MOCK_OFFICERS;

        const adminOfficers = rawOfficers.filter(o => o.role === 'admin');
        const defaultAdmin: OfficerUser = adminOfficers.length > 0 ? adminOfficers[0] : {
          id: 'admin-main',
          full_name: 'I Gede Ketut (Ketua Panitia)',
          email: 'admin@pilkel.belega.id',
          // Password tidak disimpan di sini — dikelola oleh Supabase Auth
          role: 'admin',
          created_at: new Date().toISOString()
        };

        const validOperators = rawOfficers.filter(o => o.role === 'operator' && o.tps_id);
        
        // Ensure all TPS have an operator entry
        const completeOperators: OfficerUser[] = loadedTps.map((tps, idx) => {
          const existing = validOperators.find(o => o.tps_id === tps.polling_station_id);
          if (existing) return existing;
          return {
            id: `op-${tps.polling_station_id}`,
            full_name: `Petugas ${tps.code} (${tps.banjar_name})`,
            email: `tps${(idx + 1) < 10 ? '0' + (idx + 1) : idx + 1}@pilkel.belega.id`,
            // Password tidak disimpan di sini — dikelola oleh Supabase Auth
            tps_id: tps.polling_station_id,
            role: 'operator',
            created_at: new Date().toISOString()
          };
        });

        const allAvailableAccounts = [defaultAdmin, ...completeOperators];
        setOfficers(allAvailableAccounts);

        if (allAvailableAccounts.length > 0) {
          // Default selection to first operator or admin
          const firstOperator = completeOperators[0] || defaultAdmin;
          setSelectedAccountId(firstOperator.id);
        }
      } catch {
        setOfficers(MOCK_OFFICERS);
        setTpsList(MOCK_TPS_RECAP);
        if (MOCK_OFFICERS.length > 0) {
          setSelectedAccountId(MOCK_OFFICERS[0].id);
        }
      }
    };

    loadData();

    // Listen to cross-tab sync channel
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('belega_quick_count_sync');
      channel.onmessage = () => {
        loadData();
      };
    }

    return () => {
      if (channel) channel.close();
    };
  }, []);

  const selectedOfficer = officers.find(o => o.id === selectedAccountId) || officers[0];
  const assignedTps = selectedOfficer?.tps_id 
    ? tpsList.find(t => t.polling_station_id === selectedOfficer.tps_id) 
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password) {
      setErrorMsg('Silakan masukkan kata sandi akun.');
      return;
    }

    setIsSubmitting(true);

    if (loginMode === 'select') {
      if (!selectedOfficer) {
        setErrorMsg('Silakan pilih akun petugas.');
        setIsSubmitting(false);
        return;
      }

      const res = await onLogin(
        selectedOfficer.email,
        password
      );

      setIsSubmitting(false);
      if (res.error) {
        setErrorMsg(res.error.message || 'Kata sandi salah. Silakan periksa kembali.');
      }
    } else {
      if (!manualEmail) {
        setErrorMsg('Email wajib diisi.');
        setIsSubmitting(false);
        return;
      }

      const res = await onLogin(manualEmail, password);
      setIsSubmitting(false);
      if (res.error) {
        setErrorMsg(res.error.message || 'Login gagal. Periksa kembali email dan kata sandi.');
      }
    }
  };

  // handleQuickBypassLogin dihapus — tidak boleh ada bypass login tanpa password sungguhan

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden bg-tv-grid">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="bg-white border border-slate-200/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative z-10">
        
        {/* Header Branding with Professional Compact Logo */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            {electionSettings.logo_url ? (
              <div className="w-11 h-11 p-1 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center">
                <img
                  src={electionSettings.logo_url}
                  alt="Logo Pemilihan"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
                <span className="material-symbols-outlined text-xl">how_to_vote</span>
              </div>
            )}
          </div>

          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
            {electionSettings.title || 'PILKEL DESA BELEGA 2026'}
          </h1>
          <p className="text-[11px] font-bold text-emerald-800 mt-0.5 uppercase tracking-wider">
            {electionSettings.organizer || 'Panel Panitia & Operator TPS'}
          </p>
          <p className="text-[10.5px] text-slate-400 mt-0.5">
            {electionSettings.subtitle || 'Kecamatan Blahbatuh • Gianyar, Bali'}
          </p>
        </div>

        {/* Mode Selector Tab (Pilih Akun vs Input Manual) */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center mb-4 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setLoginMode('select');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'select'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">badge</span>
            <span>Pilih Akun Petugas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('manual');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'manual'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">alternate_email</span>
            <span>Input Manual</span>
          </button>
        </div>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl mb-3.5 text-xs font-medium flex items-center gap-2 animate-shake shadow-xs">
            <span className="material-symbols-outlined text-lg text-rose-600 shrink-0">error</span>
            <span className="flex-1">{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-rose-700 hover:text-rose-900 text-base leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {loginMode === 'select' ? (
            <>
              {/* Account Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Pilih Username / Akun TPS</span>
                  <span className="text-[10.5px] font-normal text-slate-400">
                    {officers.length} Akun Tersedia
                  </span>
                </label>
                
                <div className="relative">
                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                      setSelectedAccountId(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none shadow-xs transition-colors pr-8 appearance-none cursor-pointer"
                  >
                    <optgroup label="👑 Administrator Panitia">
                      {officers
                        .filter(o => o.role === 'admin')
                        .map(off => (
                          <option key={off.id} value={off.id}>
                            Ketua Panitia / Admin ({off.email})
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label="🗳️ Operator & Petugas TPS">
                      {officers
                        .filter(o => o.role === 'operator')
                        .map(off => {
                          const tps = tpsList.find(t => t.polling_station_id === off.tps_id);
                          const tpsLabel = tps ? `${tps.code} (${tps.banjar_name})` : 'TPS';
                          return (
                            <option key={off.id} value={off.id}>
                              {tpsLabel} • {off.full_name} ({off.email})
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                    <span className="material-symbols-outlined text-lg">unfold_more</span>
                  </div>
                </div>
              </div>

              {/* Selected Account Info Card */}
              {selectedOfficer && (
                <div className={`p-2.5 rounded-xl border transition-all ${
                  selectedOfficer.role === 'admin'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedOfficer.role === 'admin'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-emerald-700 text-white shadow-xs'
                    }`}>
                      <span className="material-symbols-outlined text-lg">
                        {selectedOfficer.role === 'admin' ? 'admin_panel_settings' : 'badge'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {selectedOfficer.full_name}
                        </span>
                        <span className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-md ${
                          selectedOfficer.role === 'admin'
                            ? 'bg-amber-200/80 text-amber-900 border border-amber-300'
                            : 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
                        }`}>
                          {selectedOfficer.role === 'admin' ? 'PANITIA UTAMA' : (assignedTps ? assignedTps.code : 'OPERATOR')}
                        </span>
                      </div>

                      <div className="text-[10.5px] text-slate-600 truncate mt-0.5 flex items-center gap-1">
                        <span>{selectedOfficer.email}</span>
                        {assignedTps && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="font-medium text-emerald-800">{assignedTps.banjar_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Manual Input Mode */
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Petugas / Admin
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="contoh: tps01@pilkel.belega.id"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs pl-9"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </div>
              </div>
            </div>
          )}

          {/* Password Input (Both Modes) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs pr-10 pl-9"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-lg">lock</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm active:scale-[0.99] disabled:opacity-70 mt-1"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Memproses Masuk...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Panel {loginMode === 'select' && selectedOfficer?.role === 'admin' ? 'Admin' : 'Operator'}</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Public Link */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onBackToPublic}
            className="text-[11px] text-slate-500 hover:text-emerald-700 font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Kembali ke Dashboard Publik</span>
          </button>
        </div>

      </div>

    </div>
  );
};


