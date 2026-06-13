import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Building2, Trash2, TrendingUp, DollarSign, ArrowUp, ArrowDown, 
  Edit3, Calendar, Filter, Download, Target, Award, PieChart, 
  RefreshCw, AlertCircle, CheckCircle, Clock, BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Business, BusinessEntry } from '../types';

const businessTypes = ['product', 'service', 'agency', 'content', 'freelancing', 'ecommerce', 'other'];
const recurringOptions = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

export default function BusinessPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [entries, setEntries] = useState<BusinessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBizForm, setShowBizForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BusinessEntry | null>(null);
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  // Business form
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState('product');
  const [bizDesc, setBizDesc] = useState('');
  const [bizRevenue, setBizRevenue] = useState('');
  const [bizExpenses, setBizExpenses] = useState('');
  const [revenueGoal, setRevenueGoal] = useState('');
  const [profitGoal, setProfitGoal] = useState('');

  // Entry form
  const [entryType, setEntryType] = useState('revenue');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurring, setRecurring] = useState('none');

  // Load businesses with parallel queries
  const loadBusinesses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const bizList = (data || []) as Business[];
      setBusinesses(bizList);
      if (bizList.length > 0 && !selectedBiz) setSelectedBiz(bizList[0]);
      else if (selectedBiz) {
        const stillExists = bizList.find(b => b.id === selectedBiz.id);
        if (!stillExists && bizList.length > 0) setSelectedBiz(bizList[0]);
      }
    } catch (err) {
      console.error('Load businesses error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBiz]);

  // Load entries with date filter
  const loadEntries = useCallback(async () => {
    if (!selectedBiz || !user) return;
    
    try {
      let query = supabase
        .from('business_entries')
        .select('*')
        .eq('business_id', selectedBiz.id)
        .order('entry_date', { ascending: false });
      
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
        else if (dateRange === 'quarter') startDate.setMonth(now.getMonth() - 3);
        else if (dateRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
        
        query = query.gte('entry_date', startDate.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query.limit(500);
      if (error) throw error;
      setEntries((data || []) as BusinessEntry[]);
    } catch (err) {
      console.error('Load entries error:', err);
    }
  }, [selectedBiz, user, dateRange]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadBusinesses();
    if (selectedBiz) await loadEntries();
    setRefreshing(false);
  }, [user, loadBusinesses, loadEntries, selectedBiz]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadBusinesses();
    }
  }, [user, loadBusinesses]);

  // Load entries when selected business or date range changes
  useEffect(() => {
    if (selectedBiz && user) {
      loadEntries();
    }
  }, [selectedBiz, dateRange, user, loadEntries]);

  // Warm up Supabase connection
  useEffect(() => {
    const warmupConnection = async () => {
      if (user) {
        try {
          await supabase.from('businesses').select('count', { count: 'exact', head: true });
          console.log('Supabase connection ready for Business');
        } catch (err) {
          console.log('Connection warmup failed');
        }
      }
    };
    warmupConnection();
  }, [user]);

  const addBiz = async (retryCount = 0) => {
    if (!bizName.trim() || !user || saving) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase.from('businesses').insert({
        user_id: user.id, 
        name: bizName.trim(), 
        type: bizType, 
        description: bizDesc,
        monthly_revenue: parseFloat(bizRevenue) || 0, 
        monthly_expenses: parseFloat(bizExpenses) || 0,
        revenue_goal: revenueGoal ? parseFloat(revenueGoal) : null,
        profit_goal: profitGoal ? parseFloat(profitGoal) : null,
      }).select().single();
      
      if (error) throw error;
      
      if (data) {
        const biz = data as Business;
        setBusinesses(prev => [biz, ...prev]);
        setSelectedBiz(biz);
      }
      
      resetBizForm();
    } catch (err: any) {
      console.error('Add business failed:', err);
      
      if (retryCount === 0 && (err.message === 'Failed to fetch' || err.message === 'Load failed')) {
        console.log('Retrying after 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaving(false);
        return addBiz(1);
      }
      
      alert(`Failed to add business: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBiz = async (id: string) => {
    if (!confirm('Delete this business? All entries will be deleted.')) return;
    
    try {
      await supabase.from('businesses').delete().eq('id', id);
      const remaining = businesses.filter(b => b.id !== id);
      setBusinesses(remaining);
      setSelectedBiz(remaining[0] || null);
    } catch (err: any) {
      alert(`Failed to delete business: ${err.message}`);
    }
  };

  const updateBusinessStats = useCallback(async () => {
    if (!selectedBiz || !user) return;
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('business_entries')
        .select('*')
        .eq('business_id', selectedBiz.id)
        .gte('entry_date', dateStr);
      
      if (error) throw error;
      
      const recentEntries = (data || []) as BusinessEntry[];
      const monthlyRevenue = recentEntries.filter(e => e.type === 'revenue').reduce((s, e) => s + e.amount, 0);
      const monthlyExpenses = recentEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
      
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ 
          monthly_revenue: monthlyRevenue, 
          monthly_expenses: monthlyExpenses,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBiz.id);
      
      if (updateError) throw updateError;
      
      setBusinesses(prev => prev.map(b => 
        b.id === selectedBiz.id 
          ? { ...b, monthly_revenue: monthlyRevenue, monthly_expenses: monthlyExpenses }
          : b
      ));
      setSelectedBiz(prev => prev ? { ...prev, monthly_revenue: monthlyRevenue, monthly_expenses: monthlyExpenses } : null);
    } catch (err) {
      console.error('Update business stats error:', err);
    }
  }, [selectedBiz, user]);

  const addEntry = async (retryCount = 0) => {
    if (!entryAmount || !selectedBiz || !user || saving) return;
    
    setSaving(true);
    try {
      const entryData: any = {
        business_id: selectedBiz.id, 
        user_id: user.id,
        type: entryType, 
        amount: parseFloat(entryAmount), 
        description: entryDesc, 
        entry_date: entryDate,
        recurring: recurring !== 'none' ? recurring : null,
      };
      
      let result;
      if (editingEntry) {
        result = await supabase
          .from('business_entries')
          .update(entryData)
          .eq('id', editingEntry.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('business_entries')
          .insert(entryData)
          .select()
          .single();
      }
      
      if (result.error) throw result.error;
      
      if (result.data) {
        if (editingEntry) {
          setEntries(prev => prev.map(e => e.id === editingEntry.id ? result.data as BusinessEntry : e));
        } else {
          setEntries(prev => [result.data as BusinessEntry, ...prev]);
        }
      }
      
      resetEntryForm();
      await updateBusinessStats();
      
    } catch (err: any) {
      console.error('Add entry failed:', err);
      
      if (retryCount === 0 && (err.message === 'Failed to fetch' || err.message === 'Load failed')) {
        console.log('Retrying after 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaving(false);
        return addEntry(1);
      }
      
      alert(`Failed to add entry: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    
    try {
      const { error } = await supabase.from('business_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
      await updateBusinessStats();
    } catch (err: any) {
      alert(`Failed to delete entry: ${err.message}`);
    }
  };

  const editEntry = (entry: BusinessEntry) => {
    setEditingEntry(entry);
    setEntryType(entry.type);
    setEntryAmount(entry.amount.toString());
    setEntryDesc(entry.description || '');
    setEntryDate(entry.entry_date);
    setRecurring(entry.recurring || 'none');
    setShowEntryForm(true);
  };

  const resetBizForm = () => {
    setBizName('');
    setBizDesc('');
    setBizRevenue('');
    setBizExpenses('');
    setRevenueGoal('');
    setProfitGoal('');
    setBizType('product');
    setShowBizForm(false);
  };

  const resetEntryForm = () => {
    setEntryAmount('');
    setEntryDesc('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryType('revenue');
    setRecurring('none');
    setEditingEntry(null);
    setShowEntryForm(false);
  };

  const formatCurrency = useCallback((n: number) => {
  return `₹${n.toLocaleString('en-IN')}`;
}, []);

  // Memoized calculations
  const totalRevenue = entries.filter(e => e.type === 'revenue').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  
  const businessScore = calculateBusinessScore(selectedBiz, profit, profitMargin, entries.length);
  
  const revenueGoalProgress = selectedBiz?.revenue_goal 
    ? Math.min(100, (totalRevenue / selectedBiz.revenue_goal) * 100)
    : 0;
  const profitGoalProgress = selectedBiz?.profit_goal 
    ? Math.min(100, (profit / selectedBiz.profit_goal) * 100)
    : 0;

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-xl" />
          <div className="h-40 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-64 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            <div className="lg:col-span-3 h-96 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Business</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Track revenue, expenses & business growth</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshData} 
            disabled={refreshing}
            className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowBizForm(!showBizForm)} className="btn-primary flex items-center gap-2 py-2 px-4">
            <Plus className="w-4 h-4" />Business
          </button>
        </div>
      </div>

      {/* Add Business Form */}
      {showBizForm && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="font-semibold text-sm mb-4 text-[var(--text-primary)]">Add Business</h3>
          <div className="space-y-3">
            <input 
              value={bizName} 
              onChange={e => setBizName(e.target.value)} 
              placeholder="Business name..." 
              className="input-base" 
              autoFocus 
              disabled={saving}
            />
            <textarea 
              value={bizDesc} 
              onChange={e => setBizDesc(e.target.value)} 
              placeholder="Description..." 
              className="input-base min-h-[60px]" 
              disabled={saving}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={bizType} onChange={e => setBizType(e.target.value)} className="input-base capitalize" disabled={saving}>
                {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" value={bizRevenue} onChange={e => setBizRevenue(e.target.value)} placeholder="Monthly revenue (₹)" className="input-base" disabled={saving} />
              <input type="number" value={bizExpenses} onChange={e => setBizExpenses(e.target.value)} placeholder="Monthly expenses (₹)" className="input-base" disabled={saving} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Revenue Goal (₹/month)
                </label>
                <input type="number" value={revenueGoal} onChange={e => setRevenueGoal(e.target.value)} placeholder="Optional" className="input-base" disabled={saving} />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <Award className="w-3 h-3" /> Profit Goal (₹/month)
                </label>
                <input type="number" value={profitGoal} onChange={e => setProfitGoal(e.target.value)} placeholder="Optional" className="input-base" disabled={saving} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addBiz()} disabled={saving} className="btn-primary py-2 px-4">
                {saving ? 'Adding...' : 'Add Business'}
              </button>
              <button onClick={resetBizForm} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {businesses.length === 0 ? (
        <div className="text-center py-24 card">
          <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-lg font-medium mb-2 text-[var(--text-primary)]">No businesses yet</p>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Add your first business to start tracking revenue and growth.</p>
          <button onClick={() => setShowBizForm(true)} className="btn-primary py-2.5 px-6">Add Business</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Business List */}
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-secondary)] mb-2">YOUR BUSINESSES</p>
            {businesses.map(biz => (
              <button
                key={biz.id}
                onClick={() => setSelectedBiz(biz)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all group ${
                  selectedBiz?.id === biz.id 
                    ? 'bg-[var(--bg-secondary)] border-business/50 text-[var(--text-primary)]' 
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate">{biz.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5">{biz.type}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBiz(biz.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--bg-card)] rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-400" />
                  </button>
                </div>
              </button>
            ))}
          </div>

          {/* Business Detail */}
          {selectedBiz && (
            <div className="lg:col-span-3">
              <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedBiz.name}</h2>
                  <p className="text-sm text-[var(--text-secondary)] capitalize">{selectedBiz.type}</p>
                  {selectedBiz.description && <p className="text-xs text-[var(--text-secondary)] mt-1">{selectedBiz.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={refreshData} disabled={refreshing} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1" title="Refresh">
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => setShowGoalsModal(true)} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> Goals
                  </button>
                  <button onClick={() => setShowEntryForm(!showEntryForm)} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
                    <Plus className="w-3.5 h-3.5" />Entry
                  </button>
                </div>
              </div>

              {/* Business Score */}
              <div className="card p-4 mb-5 bg-gradient-to-r from-business/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-business/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-business">{businessScore}</span>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">Business Health Score</p>
                      <p className="text-xs text-[var(--text-primary)]">
                        {businessScore >= 80 ? '🚀 Excellent performance!' : 
                         businessScore >= 60 ? '📈 Good growth!' : 
                         businessScore >= 40 ? '📊 Steady progress' : '🎯 Focus on growth'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-secondary)]">Profit Margin</p>
                    <p className={`text-lg font-bold ${profitMargin >= 0 ? 'text-business' : 'text-red-400'}`}>
                      {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="card p-4">
                  <ArrowUp className="w-4 h-4 text-health mb-2" />
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Revenue</p>
                  <p className="font-bold text-health text-lg">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="card p-4">
                  <ArrowDown className="w-4 h-4 text-red-400 mb-2" />
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Expenses</p>
                  <p className="font-bold text-red-400 text-lg">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="card p-4">
                  <TrendingUp className={`w-4 h-4 mb-2 ${profit >= 0 ? 'text-business' : 'text-red-400'}`} />
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Profit</p>
                  <p className={`font-bold text-lg ${profit >= 0 ? 'text-business' : 'text-red-400'}`}>{formatCurrency(profit)}</p>
                </div>
              </div>

              {/* Goal Progress Bars */}
              {(selectedBiz.revenue_goal || selectedBiz.profit_goal) && (
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {selectedBiz.revenue_goal && (
                    <div className="card p-3">
                      <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Revenue Goal: {formatCurrency(selectedBiz.revenue_goal)}/month
                      </p>
                      <div className="progress-bar">
                        <div className="progress-fill bg-health" style={{ width: `${revenueGoalProgress}%` }} />
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">{revenueGoalProgress.toFixed(0)}% achieved</p>
                    </div>
                  )}
                  {selectedBiz.profit_goal && (
                    <div className="card p-3">
                      <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Profit Goal: {formatCurrency(selectedBiz.profit_goal)}/month
                      </p>
                      <div className="progress-bar">
                        <div className="progress-fill bg-business" style={{ width: `${profitGoalProgress}%` }} />
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">{profitGoalProgress.toFixed(0)}% achieved</p>
                    </div>
                  )}
                </div>
              )}

              {/* Date Filter */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Recent Transactions
                </p>
                <div className="flex gap-1">
                  {(['all', 'month', 'quarter', 'year'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-2 py-1 rounded text-[10px] transition-all capitalize ${
                        dateRange === range ? 'bg-business/20 text-business' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add/Edit Entry Form */}
              {showEntryForm && (
                <div className="card p-4 mb-5 animate-slide-up">
                  <h3 className="font-medium text-sm mb-3 text-[var(--text-primary)]">
                    {editingEntry ? 'Edit Entry' : 'Add New Entry'}
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Type</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEntryType('revenue')}
                            className={`flex-1 py-2 rounded-lg text-xs border transition-all ${
                              entryType === 'revenue' ? 'border-health bg-health/10 text-health' : 'border-[var(--border)] text-[var(--text-secondary)]'
                            }`}
                            disabled={saving}
                          >
                            Revenue
                          </button>
                          <button
                            onClick={() => setEntryType('expense')}
                            className={`flex-1 py-2 rounded-lg text-xs border transition-all ${
                              entryType === 'expense' ? 'border-red-400 bg-red-400/10 text-red-400' : 'border-[var(--border)] text-[var(--text-secondary)]'
                            }`}
                            disabled={saving}
                          >
                            Expense
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Amount (₹)</label>
                        <input 
                          type="number" 
                          value={entryAmount} 
                          onChange={e => setEntryAmount(e.target.value)} 
                          placeholder="0" 
                          className="input-base" 
                          autoFocus
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Date</label>
                        <input 
                          type="date" 
                          value={entryDate} 
                          onChange={e => setEntryDate(e.target.value)} 
                          className="input-base" 
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Recurring</label>
                        <select value={recurring} onChange={e => setRecurring(e.target.value)} className="input-base" disabled={saving}>
                          {recurringOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <input 
                      value={entryDesc} 
                      onChange={e => setEntryDesc(e.target.value)} 
                      placeholder="Description..." 
                      className="input-base" 
                      disabled={saving}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => addEntry()} disabled={saving} className="btn-primary py-2 px-4">
                        {saving ? 'Saving...' : (editingEntry ? 'Update' : 'Add')}
                      </button>
                      <button onClick={resetEntryForm} className="btn-ghost">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Entries List */}
              {entries.length === 0 ? (
                <div className="text-center py-10 card">
                  <DollarSign className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">No entries yet. Add your first revenue or expense.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {entries.map(entry => (
                    <div key={entry.id} className="card-hover p-3.5 flex items-center gap-4 group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        entry.type === 'revenue' ? 'bg-health/10' : 'bg-red-500/10'
                      }`}>
                        {entry.type === 'revenue' ? 
                          <ArrowUp className="w-4 h-4 text-health" /> : 
                          <ArrowDown className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                          {entry.description || (entry.type === 'revenue' ? 'Revenue' : 'Expense')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span>{new Date(entry.entry_date).toLocaleDateString()}</span>
                          {entry.recurring && entry.recurring !== 'none' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[10px]">
                              🔄 {entry.recurring}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`font-semibold text-sm flex-shrink-0 ${
                        entry.type === 'revenue' ? 'text-health' : 'text-red-400'
                      }`}>
                        {entry.type === 'revenue' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editEntry(entry)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded">
                          <Edit3 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        </button>
                        <button onClick={() => deleteEntry(entry.id)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded">
                          <Trash2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Goals Modal */}
      {showGoalsModal && selectedBiz && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowGoalsModal(false)}>
          <div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2 text-[var(--text-primary)]">
                <Target className="w-4 h-4 text-business" /> Set Goals for {selectedBiz.name}
              </h3>
              <button onClick={() => setShowGoalsModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Monthly Revenue Goal (₹)</label>
                <input
                  type="number"
                  value={selectedBiz.revenue_goal || ''}
                  onChange={async (e) => {
                    const newGoal = parseFloat(e.target.value);
                    await supabase.from('businesses')
                      .update({ revenue_goal: newGoal || null })
                      .eq('id', selectedBiz.id);
                    setSelectedBiz(prev => prev ? { ...prev, revenue_goal: newGoal || null } : null);
                    setBusinesses(prev => prev.map(b => b.id === selectedBiz.id ? { ...b, revenue_goal: newGoal || null } : b));
                  }}
                  placeholder="e.g., 500000"
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Monthly Profit Goal (₹)</label>
                <input
                  type="number"
                  value={selectedBiz.profit_goal || ''}
                  onChange={async (e) => {
                    const newGoal = parseFloat(e.target.value);
                    await supabase.from('businesses')
                      .update({ profit_goal: newGoal || null })
                      .eq('id', selectedBiz.id);
                    setSelectedBiz(prev => prev ? { ...prev, profit_goal: newGoal || null } : null);
                    setBusinesses(prev => prev.map(b => b.id === selectedBiz.id ? { ...b, profit_goal: newGoal || null } : b));
                  }}
                  placeholder="e.g., 100000"
                  className="input-base"
                />
              </div>
              <button onClick={() => setShowGoalsModal(false)} className="btn-primary w-full">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Calculate Business Health Score
function calculateBusinessScore(biz: Business | null, profit: number, profitMargin: number, entryCount: number): number {
  if (!biz) return 0;
  
  let score = 0;
  
  // Profitability (40%)
  if (profit > 0) score += Math.min(40, profit / 10000);
  else if (profit < 0) score += Math.max(0, 20 + profit / 10000);
  else score += 20;
  
  // Profit Margin (30%)
  if (profitMargin >= 20) score += 30;
  else if (profitMargin >= 10) score += 20;
  else if (profitMargin >= 5) score += 15;
  else if (profitMargin > 0) score += 10;
  else score += 0;
  
  // Goal achievement (20%)
  if (biz.revenue_goal && biz.monthly_revenue) {
    const revenueProgress = Math.min(20, (biz.monthly_revenue / biz.revenue_goal) * 20);
    score += revenueProgress;
  }
  if (biz.profit_goal && profit > 0) {
    const profitProgress = Math.min(20, (profit / biz.profit_goal) * 20);
    score += profitProgress;
  } else {
    score += 10;
  }
  
  // Activity (10%)
  if (entryCount >= 10) score += 10;
  else if (entryCount >= 5) score += 7;
  else if (entryCount >= 1) score += 5;
  else score += 0;
  
  return Math.min(100, Math.round(score));
}