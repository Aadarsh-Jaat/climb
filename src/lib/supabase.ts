// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Track connection state
let isWarmedUp = false;
let warmupPromise: Promise<boolean> | null = null;
const MAX_WARMUP_ATTEMPTS = 3;

// Create client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'climb',
      'x-client-info': 'climb-web',
    },
    fetch: (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Pre-warm the connection with retry logic
export const preWarmConnection = async (): Promise<boolean> => {
  if (isWarmedUp) {
    console.log('🔌 Connection already warmed up');
    return true;
  }
  
  if (warmupPromise) {
    console.log('⏳ Waiting for existing warmup...');
    return warmupPromise;
  }
  
  warmupPromise = (async () => {
    console.log('🔥 Starting Supabase connection warmup...');
    
    for (let attempt = 1; attempt <= MAX_WARMUP_ATTEMPTS; attempt++) {
      try {
        const tables = ['profiles', 'tasks', 'goals'];
        const results = await Promise.allSettled(
          tables.map(table => 
            supabase
              .from(table)
              .select('count', { count: 'exact', head: true })
              .limit(0)
          )
        );
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        if (successCount >= 1) {
          isWarmedUp = true;
          console.log(`✅ Supabase pre-warmed successfully (${successCount}/${tables.length} tables accessible)`);
          return true;
        }
        
        console.warn(`⚠️ Warmup attempt ${attempt}/${MAX_WARMUP_ATTEMPTS} had issues`);
        
        if (attempt < MAX_WARMUP_ATTEMPTS) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (err) {
        console.warn(`⚠️ Warmup attempt ${attempt} failed:`, err);
        
        if (attempt < MAX_WARMUP_ATTEMPTS) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.warn('⚠️ Supabase pre-warm completed with warnings');
    isWarmedUp = true;
    return false;
  })();
  
  return warmupPromise;
};

// Reset warmup state
export const resetWarmup = () => {
  isWarmedUp = false;
  warmupPromise = null;
  console.log('🔄 Connection warmup state reset');
};

// Get connection status
export const getConnectionStatus = (): { isWarmedUp: boolean } => {
  return { isWarmedUp };
};