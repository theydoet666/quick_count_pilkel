import React, { useState } from 'react';

interface AdminLoginProps {
  onLogin: (email: string, pass: string, role?: 'admin' | 'operator') => Promise<{ error: any }>;
  onBackToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBackToPublic }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleQuickLogin = async (role: 'admin' | 'operator') => {
    setIsSubmitting(true);
    const mockEmail = role === 'admin' ? 'admin@belega.desa.id' : 'operator@belega.desa.id';
    await onLogin(mockEmail, 'password123', role);
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
            Masuk untuk menginput, memverifikasi, atau mengunci data suara TPS.
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
              Email Petugas / Operator
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="panitia@belega.desa.id"
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
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg font-bold py-space-xs rounded shadow-sm transition-colors flex items-center justify-center gap-space-xs"
          >
            {isSubmitting ? 'Memproses...' : 'Masuk ke Panel Panitia'}
          </button>
        </form>

        {/* Quick Testing Login Options */}
        <div className="mt-space-lg pt-space-md border-t border-surface-container">
          <p className="font-label-sm text-label-sm text-on-surface-variant text-center mb-space-xs uppercase font-semibold">
            Pilih Akses Cepat (Skenario Testing)
          </p>
          <div className="grid grid-cols-2 gap-space-xs">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-label-sm text-label-sm py-space-xs px-space-xs rounded flex items-center justify-center gap-space-3xs transition-colors font-semibold"
            >
              <span className="material-symbols-outlined text-base text-primary">verified_user</span>
              Ketua Admin
            </button>
            <button
              onClick={() => handleQuickLogin('operator')}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-label-sm text-label-sm py-space-xs px-space-xs rounded flex items-center justify-center gap-space-3xs transition-colors font-semibold"
            >
              <span className="material-symbols-outlined text-base text-secondary">edit_document</span>
              Operator TPS
            </button>
          </div>
        </div>

        {/* Back to Public */}
        <div className="mt-space-md text-center">
          <button
            onClick={onBackToPublic}
            className="text-body-sm text-on-surface-variant hover:text-primary underline"
          >
            ← Kembali ke Dashboard Publik
          </button>
        </div>

      </div>
    </div>
  );
};
