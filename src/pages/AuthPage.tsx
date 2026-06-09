// src/pages/AuthPage.tsx

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  mode?: 'login' | 'signup';
  onBack?: () => void;
  onToggleMode?: () => void;
  onForgotPassword?: () => void;
}

export default function AuthPage({ mode = 'login', onBack, onToggleMode, onForgotPassword }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const submittingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  const clearAuthTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthTimeout();
    
    setError('');
    setSuccess('');
    
    // Quick validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    // Set timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Request timed out. Please check your connection and try again.');
        submittingRef.current = false;
      }
    }, 10000);

    try {
      if (isLogin) {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Invalid email or password.');
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email first.');
          } else {
            throw error;
          }
        }
        
        if (data.user) {
          console.log('Login successful');
          // Don't wait for profile - it loads in background
        }
        
      } else {
        // SIGN UP
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          } else if (error.message.includes('password')) {
            throw new Error('Password is too weak. Use at least 6 characters.');
          } else {
            throw error;
          }
        }
        
        if (data.user && data.user.identities?.length === 0) {
          throw new Error('An account with this email already exists. Please sign in.');
        }
        
        if (data.user) {
          setSuccess('Account created! Check your email to verify.');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          // Auto switch to login after 3 seconds
          setTimeout(() => {
            setIsLogin(true);
            setSuccess('');
          }, 3000);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
    } finally {
      clearAuthTimeout();
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        if (error.message.includes('not found')) {
          throw new Error('No account found with this email.');
        }
        throw error;
      }
      
      setSuccess('Password reset link sent! Check your email.');
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-wealth/10 mb-4">
              <TrendingUp className="w-6 h-6 text-wealth" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reset Password</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Enter your email to receive a reset link
            </p>
          </div>

          <div className="card p-6">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-base pl-10"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ← Back to Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-wealth/10 mb-4">
            <TrendingUp className="w-6 h-6 text-wealth" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Climb</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base pl-10"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-base pl-10 pr-10"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-career hover:text-career/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                  if (onToggleMode) onToggleMode();
                }}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                disabled={loading}
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}