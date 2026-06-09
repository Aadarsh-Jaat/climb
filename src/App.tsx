// src/App.tsx

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { AlertCircle, RefreshCw } from 'lucide-react';
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
  const { user, profile, loading, sessionError } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuth, setShowAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [connectionReady, setConnectionReady] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Pre-warm Supabase connection
  useEffect(() => {
    const preWarmConnection = async () => {
      try {
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

  // Check for auth error and session issues
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          await supabase.auth.signOut();
          window.location.reload();
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };
    checkSession();
  }, []);

  // Loading timeout handler
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if ((loading || !connectionReady) && !sessionError) {
      timeoutId = setTimeout(() => {
        console.log('Loading timeout triggered');
        setLoadingTimeout(true);
      }, 8000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, connectionReady, sessionError]);

  // Check if we're on reset password path
  useEffect(() => {
    const isResetPath = window.location.pathname.includes('reset-password') || 
                         window.location.hash.includes('type=recovery');
    
    if (isResetPath) {
      setShowResetPassword(true);
    }
  }, []);

  // Force reload function
  const forceReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  // Retry connection
  const retryConnection = () => {
    setLoadingTimeout(false);
    setConnectionReady(false);
    setRetryCount(prev => prev + 1);
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Handle session error
  if (sessionError) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Authentication Error</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            There was an issue with your session. Please sign in again.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.href = '/auth';
              }}
              className="btn-primary py-2.5 px-4 w-full"
            >
              Go to Login
            </button>
            <button 
              onClick={forceReload}
              className="btn-secondary py-2.5 px-4 w-full"
            >
              Clear Data & Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading with timeout handling
  if ((loading || !connectionReady) && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] animate-pulse" />
          <p className="text-xs text-[var(--text-secondary)]">
            {!connectionReady ? 'Connecting to server...' : 'Loading your data...'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            This may take a few moments
          </p>
        </div>
      </div>
    );
  }

  // Show error and retry option if loading takes too long
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Connection Issue</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            The app is taking too long to load. This might be due to a network issue or server delay.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={retryConnection}
              className="btn-primary py-2.5 px-4 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
            <button 
              onClick={forceReload}
              className="btn-secondary py-2.5 px-4"
            >
              Clear Data & Reload
            </button>
          </div>
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