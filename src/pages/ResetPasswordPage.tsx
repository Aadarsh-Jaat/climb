// src/pages/ResetPasswordPage.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Lock, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface ResetPasswordPageProps {
  onComplete?: () => void;
}

export default function ResetPasswordPage({ onComplete }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid reset session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setValidSession(true);
      } else {
        // Check URL hash for recovery token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if (accessToken && type === 'recovery') {
          // Set the session from the recovery token
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
          });
          if (!error) {
            setValidSession(true);
          } else {
            setValidSession(false);
            setError('Invalid or expired reset link. Please request a new one.');
          }
        } else {
          setValidSession(false);
          setError('Invalid or expired reset link. Please request a new one.');
        }
      }
    };
    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (error) throw error;
      
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          window.location.href = '/';
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validSession === null) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#1E1E1E] animate-pulse mx-auto" />
          <p className="text-xs text-[#5A5A5A] mt-4">Verifying...</p>
        </div>
      </div>
    );
  }

  if (validSession === false) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Invalid Link</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary w-full py-2.5"
            >
              Back to Login
            </button>
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Set New Password</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Create a new strong password for your account
          </p>
        </div>

        {/* Reset Form */}
        <div className="card p-6">
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-10 pr-10"
                  placeholder="••••••••"
                  required
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

            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1.5 block">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-base pl-10 pr-10"
                  placeholder="••••••••"
                  required
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

            <div className="text-sm text-[var(--text-muted)] space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>At least 6 characters long</li>
                <li>Use a mix of letters and numbers</li>
                <li>Avoid common words or personal info</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}