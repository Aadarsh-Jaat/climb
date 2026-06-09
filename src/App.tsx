// src/App.tsx

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import Health from './pages/Health';
import Knowledge from './pages/Knowledge';
import Career from './pages/Career';
import Wealth from './pages/Wealth';
import BusinessPage from './pages/Business';
import Guide from './pages/Guide';
import Notes from './pages/Notes';
import Settings from './pages/Settings';
import ResetPasswordPage from './pages/ResetPasswordPage';
import type { AppPage } from './components/AppLayout';

// Pre-connection warmup component
function ConnectionWarmup() {
  const [warmedUp, setWarmedUp] = useState(false);

  useEffect(() => {
    const warmupConnection = async () => {
      try {
        // Try to make a lightweight request to warm up the connection
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (!error) {
          console.log('✅ Supabase connection warmed up successfully');
        } else {
          console.log('⚠️ Supabase connection warmup had an issue:', error.message);
        }
      } catch (err) {
        console.log('⚠️ Supabase connection warmup failed, will retry on first request');
      } finally {
        setWarmedUp(true);
      }
    };

    warmupConnection();
  }, []);

  return null;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuth, setShowAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [connectionReady, setConnectionReady] = useState(false);

  // Pre-warm Supabase connection
  useEffect(() => {
    const preWarmConnection = async () => {
      try {
        // Try multiple tables to ensure connection is established
        await Promise.all([
          supabase.from('profiles').select('count', { count: 'exact', head: true }),
          supabase.from('tasks').select('count', { count: 'exact', head: true }).maybeSingle(),
        ]);
        console.log('✅ Supabase pre-connection complete');
      } catch (err) {
        console.log('⚠️ Pre-connection warning:', err);
      } finally {
        setConnectionReady(true);
      }
    };
    
    preWarmConnection();
  }, []);

  // Check if we're on reset password path
  useEffect(() => {
    const isResetPath = window.location.pathname.includes('reset-password') || 
                         window.location.hash.includes('type=recovery');
    
    if (isResetPath) {
      setShowResetPassword(true);
    }
  }, []);

  // Show loading with warmup status
  if (loading || !connectionReady) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] animate-pulse" />
          <p className="text-xs text-[var(--text-secondary)]">
            {!connectionReady ? 'Connecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show Reset Password page
  if (showResetPassword) {
    return <ResetPasswordPage onComplete={() => setShowResetPassword(false)} />;
  }

  // Not logged in
  if (!user) {
    if (showAuth) {
      return (
        <AuthPage
          mode={authMode}
          onBack={() => setShowAuth(false)}
          onToggleMode={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
          onForgotPassword={() => setShowResetPassword(true)}
        />
      );
    }
    return (
      <LandingPage
        onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
        onLogin={() => { setAuthMode('login'); setShowAuth(true); }}
      />
    );
  }

  // Logged in but not onboarded
  if (!profile?.onboarding_completed) {
    return <Onboarding onComplete={() => {}} />;
  }

  // Main app
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'planner': return <Planner />;
      case 'health': return <Health />;
      case 'knowledge': return <Knowledge />;
      case 'career': return <Career />;
      case 'wealth': return <Wealth />;
      case 'business': return <BusinessPage />;
      case 'guide': return <Guide />;
      case 'notes': return <Notes />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConnectionWarmup />
      <AppRoutes />
    </AuthProvider>
  );
}