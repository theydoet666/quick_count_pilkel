import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserRole, Profile, OfficerUser } from '../types/database.types';
import { MOCK_OFFICERS } from '../lib/mockData';

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Null = belum dicek; string = pesan error; undefined = tidak ada error
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Mode demo (tanpa Supabase): baca dari localStorage hanya untuk keperluan UI
    if (!isSupabaseConfigured) {
      const savedUser = localStorage.getItem('belega_auth_user');
      const savedProfile = localStorage.getItem('belega_auth_profile');
      if (savedUser && savedProfile) {
        try {
          setUser(JSON.parse(savedUser));
          setProfile(JSON.parse(savedProfile));
        } catch {
          // localStorage corrupt — buang
          localStorage.removeItem('belega_auth_user');
          localStorage.removeItem('belega_auth_profile');
        }
      }
      setLoading(false);
      return;
    }

    // Mode produksi: gunakan sesi Supabase Auth sebagai sumber kebenaran
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // KRITIS: jangan fallback ke admin — fail-closed dengan unauthenticated
        console.warn('fetchProfile: profil tidak ditemukan atau error:', error?.message);
        setProfile(null);
        setUser(null);
        setAuthError('Profil pengguna tidak ditemukan. Hubungi admin.');
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
      } else {
        setProfile(data as Profile);
        setAuthError(null);
      }
    } catch (err) {
      // KRITIS: error jaringan/lainnya → fail-closed, bukan fail-open ke admin
      console.error('fetchProfile: unexpected error:', err);
      setProfile(null);
      setUser(null);
      setAuthError('Terjadi kesalahan saat memverifikasi akun. Coba lagi.');
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  // Login via Supabase Auth (mode produksi)
  const loginWithSupabase = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { error: { message: 'Email atau kata sandi salah. Silakan coba lagi.' } };
      }
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || '' });
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: { message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.' } };
    }
  };

  // ==========================================================================
  // PERINGATAN KEAMANAN KRITIS (MODE DEMO OFFLINE):
  // Fungsi loginWithMock() di bawah ini HANYA boleh aktif pada mode pengembangan
  // lokal (DEV). Mode ini TIDAK BOLEH PERNAH ter-deploy ke lingkungan produksi!
  // Alasan: Seluruh autentikasi & otorisasi berjalan di sisi client/browser tanpa
  // validasi kriptografis token sesi server, tanpa hash password terenkripsi,
  // dan tanpa perlindungan Row Level Security (RLS) PostgreSQL.
  // ==========================================================================
  const loginWithMock = (email: string, password: string): { error: { message: string } | null } => {
    // Mode demo dilarang keras aktif pada build produksi
    if (import.meta.env.PROD) {
      return { error: { message: 'Konfigurasi Supabase tidak ditemukan. Hubungi administrator.' } };
    }

    // Cari officer dari daftar mock
    const savedOfficers = localStorage.getItem('belega_officers');
    const officersList: OfficerUser[] = savedOfficers ? JSON.parse(savedOfficers) : MOCK_OFFICERS;
    const foundOfficer = officersList.find(
      o => o.email.toLowerCase() === email.toLowerCase()
    );

    if (!foundOfficer) {
      return { error: { message: 'Email tidak terdaftar dalam sistem demo.' } };
    }

    // TOLAK BY DEFAULT: Jika password tidak diset (undefined/kosong), jangan pernah izinkan bypass login
    if (!foundOfficer.password) {
      return { error: { message: 'Akun demo ini belum memiliki password, hubungi admin' } };
    }

    // Validasi kecocokan password
    if (password !== foundOfficer.password) {
      return { error: { message: 'Kata sandi yang Anda masukkan salah.' } };
    }

    const mockUser = { id: foundOfficer.id, email };
    const mockProf: Profile = {
      id: foundOfficer.id,
      full_name: foundOfficer.full_name,
      role: foundOfficer.role as UserRole,
      tps_id: foundOfficer.tps_id || null,
      email,
      phone: foundOfficer.phone,
      created_at: new Date().toISOString()
    };

    setUser(mockUser);
    setProfile(mockProf);
    // Simpan ke localStorage HANYA untuk mode demo (bukan sumber kebenaran di produksi)
    localStorage.setItem('belega_auth_user', JSON.stringify(mockUser));
    localStorage.setItem('belega_auth_profile', JSON.stringify(mockProf));
    return { error: null };
  };

  // Entry point login yang dipanggil dari UI
  const loginWithEmail = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      return loginWithSupabase(email, password);
    } else {
      // Mode demo offline — tidak ada Supabase
      return loginWithMock(email, password);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setAuthError(null);
    localStorage.removeItem('belega_auth_user');
    localStorage.removeItem('belega_auth_profile');
  };

  return {
    user,
    profile,
    loading,
    authError,
    role: profile?.role || 'viewer',
    tpsId: profile?.tps_id || null,
    isAdmin: profile?.role === 'admin',
    isOperator: profile?.role === 'operator' || profile?.role === 'admin',
    loginWithEmail,
    logout
  };
}
