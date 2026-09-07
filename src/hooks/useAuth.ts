import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserRole, Profile } from '../types/database.types';

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

  const loginWithEmail = async (email: string, password: string, mockRole: UserRole = 'admin') => {
    if (!isSupabaseConfigured) {
      // Mock login for offline dev mode
      const mockUser = { id: `usr-${mockRole}-1`, email };
      const mockProf: Profile = {
        id: mockUser.id,
        full_name: mockRole === 'admin' ? 'I Gede Ketut (Ketua Panitia)' : 'Ni Wayan Sari (Operator TPS)',
        role: mockRole,
        created_at: new Date().toISOString()
      };

      setUser(mockUser);
      setProfile(mockProf);
      localStorage.setItem('belega_auth_user', JSON.stringify(mockUser));
      localStorage.setItem('belega_auth_profile', JSON.stringify(mockProf));
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email || '' });
      await fetchProfile(data.user.id);
    }
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
    isAdmin: profile?.role === 'admin',
    isOperator: profile?.role === 'operator' || profile?.role === 'admin',
    loginWithEmail,
    logout
  };
}
