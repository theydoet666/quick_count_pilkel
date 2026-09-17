import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserRole, Profile, OfficerUser } from '../types/database.types';
import { MOCK_OFFICERS } from '../lib/mockData';

// Unique Device Session Token Management (Kriptografis UUID)
const getDeviceSessionToken = (): string => {
  if (typeof window === 'undefined') return 'server-token';
  let token = sessionStorage.getItem('belega_device_session_token');
  if (!token) {
    token = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'sess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('belega_device_session_token', token);
  }
  return token;
};

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
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Heartbeat interval untuk memperbarui status aktivitas sesi setiap 45 detik
  useEffect(() => {
    if (!user || !profile) return;

    const sessionToken = getDeviceSessionToken();

    const sendHeartbeat = async () => {
      if (isSupabaseConfigured) {
        try {
          await supabase.rpc('heartbeat_operator_session', {
            p_session_token: sessionToken
          });
        } catch (err) {
          console.debug('Heartbeat ping failed:', err);
        }
      } else {
        // Mode demo: update timestamp di localStorage
        try {
          const savedOfficersStr = localStorage.getItem('belega_officers');
          if (savedOfficersStr) {
            const officers: OfficerUser[] = JSON.parse(savedOfficersStr);
            const updated = officers.map(o => {
              if (o.id === profile.id || o.email.toLowerCase() === user.email.toLowerCase()) {
                return {
                  ...o,
                  active_session_token: sessionToken,
                  last_active_at: new Date().toISOString()
                };
              }
              return o;
            });
            localStorage.setItem('belega_officers', JSON.stringify(updated));
          }
        } catch (_) {}
      }
    };

    // Kirim heartbeat pertama dan ulangi tiap 45 detik
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 45000);

    return () => clearInterval(interval);
  }, [user, profile]);

  const fetchProfile = async (userId: string, userEmail?: string): Promise<boolean> => {
    try {
      // 1. Ambil profile murni dari database Supabase (sumber otorisasi terpercaya)
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // 2. Jika tidak ditemukan dengan id, coba cari berdasarkan email
      if (!data && userEmail) {
        const { data: dataByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        if (dataByEmail) {
          data = dataByEmail;
          error = null;
        }
      }

      if (!data) {
        console.warn('fetchProfile: profil tidak ditemukan di database:', error?.message);
        setProfile(null);
        setUser(null);
        setAuthError('Profil pengguna tidak terdaftar di sistem.');
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
        return false;
      }

      setProfile(data as Profile);
      setAuthError(null);
      return true;
    } catch (err) {
      console.error('fetchProfile: unexpected error:', err);
      setProfile(null);
      setUser(null);
      setAuthError('Terjadi kesalahan saat memverifikasi akun.');
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login via Supabase Auth (mode produksi) dengan perlindungan Single Active Session
  const loginWithSupabase = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { error: { message: error.message || 'Email atau kata sandi salah. Silakan coba lagi.' } };
      }
      if (data.user) {
        // 1. Klaim Sesi via RPC claim_operator_session (identitas diverifikasi di server via auth.uid())
        const sessionToken = getDeviceSessionToken();
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser';
        
        try {
          const { data: claimRes, error: claimErr } = await supabase.rpc('claim_operator_session', {
            p_session_token: sessionToken,
            p_device_info: userAgent
          });

          if (claimErr || (claimRes && claimRes.success === false)) {
            // Sesi sedang aktif di perangkat lain!
            await supabase.auth.signOut();
            setLoading(false);
            
            const tpsMatch = email.match(/tps0*(\d+)/i);
            const tpsLabel = tpsMatch ? `TPS ${tpsMatch[1].padStart(2, '0')}` : 'Operator';
            
            return {
              error: {
                message: `Akun Petugas ${tpsLabel} saat ini sedang aktif digunakan oleh perangkat lain. Jika ini bukan Anda atau sesi sebelumnya belum ditutup, silakan hubungi Ketua Panitia/Admin untuk mereset sesi.`
              }
            };
          }
        } catch (claimEx) {
          console.warn('claim_operator_session RPC check bypass or fallback:', claimEx);
        }

        setUser({ id: data.user.id, email: data.user.email || '' });
        const profileOk = await fetchProfile(data.user.id, data.user.email);
        if (!profileOk) {
          setLoading(false);
          return { error: { message: 'Akun berhasil masuk, tetapi profil belum terdaftar di sistem. Hubungi admin.' } };
        }
      }
      setLoading(false);
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: { message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.' } };
    }
  };

  // ==========================================================================
  // MODE DEMO OFFLINE (loginWithMock dengan validasi Single Active Session)
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

    // Validasi Single Active Session pada Operator TPS
    const sessionToken = getDeviceSessionToken();
    if (foundOfficer.role === 'operator' && foundOfficer.active_session_token && foundOfficer.last_active_at) {
      const lastActiveTime = new Date(foundOfficer.last_active_at).getTime();
      const now = Date.now();
      const isExpired = (now - lastActiveTime) > 120000; // 2 menit timeout

      if (!isExpired && foundOfficer.active_session_token !== sessionToken) {
        const tpsMatch = email.match(/tps0*(\d+)/i);
        const tpsLabel = tpsMatch ? `TPS ${tpsMatch[1].padStart(2, '0')}` : 'Operator';
        return {
          error: {
            message: `Akun Petugas ${tpsLabel} saat ini sedang aktif digunakan oleh perangkat/tab lain. Silakan logout dari tab sebelumnya atau hubungi Ketua Panitia.`
          }
        };
      }
    }

    // Simpan token sesi baru pada officer
    const updatedOfficers = officersList.map(o => {
      if (o.id === foundOfficer.id || o.email.toLowerCase() === foundOfficer.email.toLowerCase()) {
        return {
          ...o,
          active_session_token: sessionToken,
          last_active_at: new Date().toISOString()
        };
      }
      return o;
    });
    localStorage.setItem('belega_officers', JSON.stringify(updatedOfficers));

    const mockUser = { id: foundOfficer.id, email };
    const mockProf: Profile = {
      id: foundOfficer.id,
      full_name: foundOfficer.full_name,
      role: foundOfficer.role as UserRole,
      tps_id: foundOfficer.tps_id || null,
      email,
      phone: foundOfficer.phone,
      active_session_token: sessionToken,
      last_active_at: new Date().toISOString(),
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
    const sessionToken = getDeviceSessionToken();
    const officerId = profile?.id || user?.id;
    const userEmail = user?.email || profile?.email;

    if (isSupabaseConfigured) {
      try {
        await supabase.rpc('release_operator_session', {
          p_session_token: sessionToken
        });
      } catch (err) {
        console.debug('Failed to release session RPC:', err);
      }
      await supabase.auth.signOut();
    } else if (officerId || userEmail) {
      // Mode demo: bersihkan active_session_token di localStorage
      try {
        const savedOfficersStr = localStorage.getItem('belega_officers');
        if (savedOfficersStr) {
          const officers: OfficerUser[] = JSON.parse(savedOfficersStr);
          const updated = officers.map(o => {
            if ((officerId && o.id === officerId) || (userEmail && o.email.toLowerCase() === userEmail.toLowerCase())) {
              return {
                ...o,
                active_session_token: null,
                last_active_at: null
              };
            }
            return o;
          });
          localStorage.setItem('belega_officers', JSON.stringify(updated));
        }
      } catch (_) {}
    }

    setUser(null);
    setProfile(null);
    setAuthError(null);
    sessionStorage.removeItem('belega_device_session_token');
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
