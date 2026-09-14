import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { PublicDashboard } from './pages/PublicDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { updateDynamicFavicon } from './lib/dynamicFavicon';
import { DEFAULT_ELECTION_SETTINGS } from './lib/mockData';
import { isSupabaseConfigured } from './lib/supabaseClient';

export function App() {
  const { user, profile, role, loginWithEmail, logout } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<'public' | 'admin-login' | 'admin-dashboard'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin/login')) return 'admin-login';
    if (path.startsWith('/admin')) return 'admin-dashboard';
    return 'public';
  });

  // =========================================================================
  // GUARD KEAMANAN PRODUKSI:
  // Cegah fallback ke mode demo offline jika environment variable Supabase tidak
  // diset pada deployment produksi. Fail-closed demi keamanan data pemilu.
  // =========================================================================
  if (import.meta.env.PROD && !isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 select-none font-sans">
        <div className="max-w-md w-full bg-slate-900/95 border border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Konfigurasi Supabase tidak ditemukan
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Aplikasi berjalan di lingkungan produksi tanpa kredensial Supabase yang valid. Mode demo dinonaktifkan demi keamanan.
            </p>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 text-left space-y-1 font-mono">
            <div className="font-semibold text-slate-300">Harap hubungi administrator sistem untuk mengatur:</div>
            <div className="text-amber-400">• VITE_SUPABASE_URL</div>
            <div className="text-amber-400">• VITE_SUPABASE_ANON_KEY</div>
          </div>
          <div className="pt-2 text-xs text-slate-500">
            Sistem Hitung Cepat Pemilihan Perbekel Desa Belega 2026
          </div>
        </div>
      </div>
    );
  }

  // Sync Favicon on startup and listen to sync updates
  useEffect(() => {
    const syncFavicon = () => {
      try {
        const savedSettingsStr = localStorage.getItem('belega_election_settings');
        if (savedSettingsStr) {
          const settings = JSON.parse(savedSettingsStr);
          updateDynamicFavicon(settings.logo_url, `Hitung Cepat ${settings.title || 'Pilkel Desa Belega'}`);
        } else {
          updateDynamicFavicon(null, DEFAULT_ELECTION_SETTINGS.title);
        }
      } catch {
        updateDynamicFavicon(null);
      }
    };

    syncFavicon();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'belega_election_settings') {
        syncFavicon();
      }
    };
    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('belega_quick_count_sync');
      channel.onmessage = () => {
        syncFavicon();
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  // Handle browser back/forward and route navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin/login')) {
        setCurrentRoute('admin-login');
      } else if (path.startsWith('/admin')) {
        setCurrentRoute('admin-dashboard');
      } else {
        setCurrentRoute('public');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: 'public' | 'admin-login' | 'admin-dashboard') => {
    let path = '/';
    if (route === 'admin-login') path = '/admin/login';
    if (route === 'admin-dashboard') path = '/admin';

    window.history.pushState({}, '', path);
    setCurrentRoute(route);
  };

  const handleAdminHeaderClick = () => {
    if (user) {
      navigateTo('admin-dashboard');
    } else {
      navigateTo('admin-login');
    }
  };

  const handleLoginSubmit = async (
    email: string,
    pass: string
  ) => {
    const res = await loginWithEmail(email, pass);
    if (!res.error) {
      navigateTo('admin-dashboard');
    }
    return res;
  };

  const handleLogout = async () => {
    await logout();
    navigateTo('public');
  };

  // Render view based on route and auth state
  if (currentRoute === 'admin-login') {
    if (user) {
      // Already logged in
      navigateTo('admin-dashboard');
      return null;
    }
    return (
      <AdminLogin
        onLogin={handleLoginSubmit}
        onBackToPublic={() => navigateTo('public')}
      />
    );
  }

  if (currentRoute === 'admin-dashboard') {
    if (!user) {
      // Not logged in, redirect to login
      return (
        <AdminLogin
          onLogin={handleLoginSubmit}
          onBackToPublic={() => navigateTo('public')}
        />
      );
    }
    return (
      <AdminDashboard
        userEmail={user.email}
        role={role}
        tpsId={profile?.tps_id || null}
        fullName={profile?.full_name || 'Petugas Panitia'}
        onLogout={handleLogout}
        onViewPublic={() => navigateTo('public')}
      />
    );
  }

  return (
    <PublicDashboard
      onAdminClick={handleAdminHeaderClick}
      isAdminLoggedIn={Boolean(user)}
    />
  );
}

export default App;
