import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { PublicDashboard } from './pages/PublicDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';

export function App() {
  const { user, profile, role, loginWithEmail, logout } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<'public' | 'admin-login' | 'admin-dashboard'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin/login')) return 'admin-login';
    if (path.startsWith('/admin')) return 'admin-dashboard';
    return 'public';
  });

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

  const handleLoginSubmit = async (email: string, pass: string, mockRole?: 'admin' | 'operator') => {
    const res = await loginWithEmail(email, pass, mockRole);
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
