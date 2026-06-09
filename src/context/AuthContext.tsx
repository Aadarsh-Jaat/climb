// src/context/AuthContext.tsx

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, preWarmConnection } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, Pillar } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  connectionReady: boolean;
  sessionError: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let profileCache: { data: Profile | null; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000;

// Simple retry function
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Retry ${attempt - 1}/${maxRetries} for ${operationName}`);
        await new Promise(resolve => setTimeout(resolve, attempt * 300));
      }
      return await fn();
    } catch (err: any) {
      lastError = err;
      
      if (err?.message?.includes('JWT') || err?.message?.includes('auth')) {
        console.error(`❌ ${operationName} failed with auth error, not retrying`);
        throw err;
      }
      
      if (attempt <= maxRetries) {
        console.warn(`⚠️ ${operationName} attempt ${attempt} failed, retrying...`);
        continue;
      }
    }
  }
  
  throw lastError;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionReady, setConnectionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const loadingRef = useRef(false);
  const initRef = useRef(false);
  const authTimeoutRef = useRef<NodeJS.Timeout>();

  // Pre-warm Supabase connection
  useEffect(() => {
    const warmup = async () => {
      try {
        const isReady = await preWarmConnection();
        setConnectionReady(isReady);
        console.log('🔌 Connection warmup complete:', isReady);
      } catch (err) {
        console.log('🔌 Connection warmup attempt failed');
        setConnectionReady(true);
      }
    };
    warmup();
  }, []);

  // Validate and clean up session on mount
  useEffect(() => {
    const validateAndCleanSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session validation error:', error);
          // Clear potentially corrupted session
          await supabase.auth.signOut();
          localStorage.removeItem('supabase.auth.token');
          setSessionError(true);
          return;
        }
        
        if (session) {
          // Check if session is expired
          const expiresAt = session.expires_at;
          if (expiresAt && expiresAt * 1000 < Date.now()) {
            console.log('Session expired, signing out');
            await supabase.auth.signOut();
            setSessionError(false);
          }
        }
      } catch (err) {
        console.error('Session validation failed:', err);
        setSessionError(true);
      }
    };
    
    validateAndCleanSession();
  }, []);

  const loadProfile = useCallback(async (userId: string, forceRefresh = false): Promise<Profile | null> => {
    if (!forceRefresh && profileCache && profileCache.data?.id === userId && 
        (Date.now() - profileCache.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached profile');
      return profileCache.data;
    }
    
    if (loadingRef.current) return profileCache?.data || null;
    loadingRef.current = true;
    
    try {
      // Add timeout for profile loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile load timeout')), 10000)
      );
      
      const loadPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const { data, error } = await withRetry(
          async () => {
            const result = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            return result;
          },
          2,
          'loadProfile'
        );
        
        if (error) throw error;
        return { data, error };
      })();
      
      const { data, error } = await Promise.race([loadPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Profile load error:', error);
        return null;
      }
      
      let profileData: Profile | null = null;
      
      if (data) {
        profileData = data as Profile;
      } else {
        // Create profile if doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            name: 'User',
            selected_pillars: ['health', 'knowledge', 'career', 'wealth', 'business'],
            onboarding_completed: false,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Profile creation error:', insertError);
          return null;
        }
        profileData = newProfile as Profile;
      }
      
      profileCache = {
        data: profileData,
        timestamp: Date.now()
      };
      
      return profileData;
    } catch (err) {
      console.error('Profile error:', err);
      setSessionError(true);
      return null;
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const newProfile = await loadProfile(user.id, true);
      if (newProfile) setProfile(newProfile);
    }
  }, [user, loadProfile]);

  const signOut = useCallback(async () => {
    setSessionError(false);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    profileCache = null;
    localStorage.removeItem('supabase.auth.token');
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      // Set a timeout for the entire auth initialization
      authTimeoutRef.current = setTimeout(() => {
        console.log('Auth initialization timeout');
        setSessionError(true);
        setLoading(false);
      }, 15000);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setSessionError(true);
          setLoading(false);
          return;
        }
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          const profileData = await loadProfile(currentUser.id);
          if (profileData) {
            setProfile(profileData);
            setSessionError(false);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        setSessionError(true);
      } finally {
        setLoading(false);
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        profileCache = null;
        const profileData = await loadProfile(currentUser.id, true);
        if (profileData) {
          setProfile(profileData);
          setSessionError(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        profileCache = null;
        setSessionError(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signOut, 
      refreshProfile,
      connectionReady,
      sessionError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}