import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserRole, Profile, OfficerUser } from '../types/database.types';
import { MOCK_OFFICERS } from '../lib/mockData';

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(() => {
    const saved = localStorage.getItem('belega_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [profile, setProfile] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('belega_auth_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

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
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data as Profile);
      } else {
        // Fallback default admin profile
        setProfile({ id: userId, full_name: 'Admin Panitia Belega', role: 'admin', created_at: '' });
      }
    } catch {
      setProfile({ id: userId, full_name: 'Admin Panitia Belega', role: 'admin', created_at: '' });
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (
    email: string,
    password: string,
    mockRole?: UserRole,
    mockTpsId?: string | null,
    mockName?: string
  ) => {
    if (isSupabaseConfigured && !mockRole) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
          await fetchProfile(data.user.id);
          return { error: null };
        }
      } catch (err) {
        console.warn('Supabase Auth signIn attempt error, falling back to profiles check:', err);
      }
    }

    // Profile lookup in Supabase profiles or local storage
    let profileData: any = null;
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('profiles').select('*').ilike('email', email).maybeSingle();
        profileData = data;
      } catch {}
    }

    const savedOfficers = localStorage.getItem('belega_officers');
    const officersList: OfficerUser[] = savedOfficers ? JSON.parse(savedOfficers) : MOCK_OFFICERS;
    const foundOfficer = officersList.find(o => o.email.toLowerCase() === email.toLowerCase());

    const determinedRole: UserRole = mockRole || profileData?.role || (foundOfficer ? 'operator' : (email.includes('admin') ? 'admin' : 'operator'));
    const determinedTpsId: string | null = mockTpsId !== undefined ? mockTpsId : (profileData?.tps_id || foundOfficer?.tps_id || null);
    const determinedName: string = mockName || profileData?.full_name || foundOfficer?.full_name || (determinedRole === 'admin' ? 'I Gede Ketut (Ketua Panitia)' : 'Petugas TPS');

    const mockUser = { id: profileData?.id || `usr-${determinedRole}-${Date.now()}`, email };
    const mockProf: Profile = {
      id: mockUser.id,
      full_name: determinedName,
      role: determinedRole,
      tps_id: determinedTpsId,
      email,
      phone: profileData?.phone || foundOfficer?.phone,
      created_at: new Date().toISOString()
    };

    setUser(mockUser);
    setProfile(mockProf);
    localStorage.setItem('belega_auth_user', JSON.stringify(mockUser));
    localStorage.setItem('belega_auth_profile', JSON.stringify(mockProf));
    return { error: null };
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('belega_auth_user');
    localStorage.removeItem('belega_auth_profile');
  };

  return {
    user,
    profile,
    loading,
    role: profile?.role || 'viewer',
    tpsId: profile?.tps_id || null,
    isAdmin: profile?.role === 'admin',
    isOperator: profile?.role === 'operator' || profile?.role === 'admin',
    loginWithEmail,
    logout
  };
}
