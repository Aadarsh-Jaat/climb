// src/lib/dbOptimizer.ts

// Cache manager
class QueryCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.defaultTTL) {
      return cached.data;
    }
    return null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const queryCache = new QueryCache();

// Optimized query with pagination
export const getPaginatedData = async (
  supabase: any,
  table: string,
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  orderBy: string = 'created_at',
  orderDirection: 'asc' | 'desc' = 'desc'
) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  
  const cacheKey = `${table}_${userId}_${page}_${pageSize}`;
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;
  
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(start, end);
  
  if (error) throw error;
  
  const result = { data, count, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
  queryCache.set(cacheKey, result);
  
  return result;
};

// Optimized single query
export const getOptimizedData = async (
  supabase: any,
  table: string,
  userId: string,
  limit: number = 50
) => {
  const cacheKey = `${table}_${userId}_latest`;
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  queryCache.set(cacheKey, data);
  return data;
};