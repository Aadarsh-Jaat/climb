import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, TrendingUp, Trash2, Target, PiggyBank, Wallet, Home, Car, Briefcase, Landmark, CreditCard, Shield, Award, Calendar, Percent, Building, Banknote, ArrowUpCircle, ArrowDownCircle, Users, DollarSign, RefreshCw, History, Edit3, X, MinusCircle, PlusCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Account, Asset, Investment, Liability, WealthGoal, Loan } from '../types';

type Tab = 'overview' | 'accounts' | 'assets' | 'investments' | 'liabilities' | 'goals' | 'loans';

const investmentTypes = ['mutual_fund', 'stocks', 'etf', 'fd', 'ppf', 'epf', 'nps', 'crypto'];
const assetTypes = ['gold', 'property', 'vehicle', 'business', 'other'];
const accountTypes = ['bank', 'wallet', 'cash'];
const liabilityTypes = ['loan', 'credit_card', 'other'];
const loanTypes = ['lent', 'borrowed'];

// Helper function for retry operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, err);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

export default function Wealth() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [wealthGoals, setWealthGoals] = useState<WealthGoal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [investmentTransactions, setInvestmentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState(50000);
  const [showBalanceModal, setShowBalanceModal] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'add' | 'deduct'>('add');
  const [transactionNote, setTransactionNote] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showLoanAmountModal, setShowLoanAmountModal] = useState<{loanId: string, type: 'increase' | 'decrease'} | null>(null);
  const [loanAmountValue, setLoanAmountValue] = useState('');
  
  // Investment transaction modal
  const [showInvestmentModal, setShowInvestmentModal] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentTxType, setInvestmentTxType] = useState<'add' | 'withdraw'>('add');
  const [investmentTxDate, setInvestmentTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [investmentTxNote, setInvestmentTxNote] = useState('');
  const [showInvestmentHistory, setShowInvestmentHistory] = useState<string | null>(null);
  
  // Update value modal
  const [showUpdateValueModal, setShowUpdateValueModal] = useState<string | null>(null);
  const [updateValueAmount, setUpdateValueAmount] = useState('');
  const [updateValueType, setUpdateValueType] = useState<'current' | 'invested'>('current');

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [amount2, setAmount2] = useState('');
  const [rate, setRate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  // FD specific fields
  const [fdTenure, setFdTenure] = useState('');
  const [fdMaturityAmount, setFdMaturityAmount] = useState('');
  const [fdMaturityDate, setFdMaturityDate] = useState('');

  // Fetch all data including investment transactions with retry
  const fetchAllData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await withRetry(async () => {
        const [a, as, inv, lib, wg, ln, tx] = await Promise.all([
          supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('liabilities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('wealth_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('loans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('investment_transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }),
        ]);
        
        setAccounts((a.data || []) as Account[]);
        setAssets((as.data || []) as Asset[]);
        setInvestments((inv.data || []) as Investment[]);
        setLiabilities((lib.data || []) as Liability[]);
        setWealthGoals((wg.data || []) as WealthGoal[]);
        setLoans((ln.data || []) as Loan[]);
        setInvestmentTransactions((tx.data || []) as any[]);
      });
    } catch (err) {
      console.error('Fetch error:', err);
      alert('Failed to load data after multiple attempts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [user, fetchAllData]);

  useEffect(() => {
    fetchAllData();
    setType(getDefaultType());
  }, [user, tab, fetchAllData]);

  // Warm up Supabase connection
  useEffect(() => {
    const warmupConnection = async () => {
      if (user) {
        try {
          await supabase.from('accounts').select('count', { count: 'exact', head: true });
          console.log('Supabase connection ready for Wealth');
        } catch (err) {
          console.log('Connection warmup failed');
        }
      }
    };
    warmupConnection();
  }, [user]);

  const getDefaultType = () => {
    if (tab === 'accounts') return 'bank';
    if (tab === 'assets') return 'gold';
    if (tab === 'investments') return 'mutual_fund';
    if (tab === 'liabilities') return 'loan';
    if (tab === 'goals') return 'emergency_fund';
    if (tab === 'loans') return 'lent';
    return '';
  };

  const totalAccounts = accounts.reduce((s, a) => s + a.balance, 0);
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0);
  const totalInvestmentValue = investments.reduce((s, i) => s + i.current_value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
  const totalLent = loans.filter(l => l.type === 'lent').reduce((s, l) => s + l.remaining_amount, 0);
  const totalBorrowed = loans.filter(l => l.type === 'borrowed').reduce((s, l) => s + l.remaining_amount, 0);
  const netWorth = totalAccounts + totalAssets + totalInvestmentValue + totalLent - totalLiabilities - totalBorrowed;

  const formatCurrency = useCallback((n: number) => {
    if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  }, []);

  // Calculate days remaining for FD
  const getDaysRemaining = (maturityDate: string) => {
    const today = new Date();
    const maturity = new Date(maturityDate);
    const diffTime = maturity.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Update goal amount with retry
  const updateGoalAmount = async (goalId: string, newAmount: number) => {
    if (newAmount < 0) {
      alert('Amount cannot be negative');
      return;
    }
    
    setSaving(true);
    
    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from('wealth_goals')
          .update({ 
            current_amount: newAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', goalId)
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setWealthGoals(prev => prev.map(g => g.id === goalId ? data as WealthGoal : g));
          alert(`Goal updated! Saved: ${formatCurrency(newAmount)}`);
        }
      });
      
    } catch (err: any) {
      console.error('Update goal failed:', err);
      alert(`Failed to update goal: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Update loan amount (increase or decrease) with retry
  const updateLoanAmount = async (loanId: string, currentRemaining: number, amountToChange: number, operation: 'increase' | 'decrease') => {
    if (amountToChange <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setSaving(true);
    
    try {
      await withRetry(async () => {
        let newRemaining: number;
        let newTotalAmount: number;
        
        const currentLoan = loans.find(l => l.id === loanId);
        if (!currentLoan) throw new Error('Loan not found');
        
        if (operation === 'increase') {
          newRemaining = currentRemaining + amountToChange;
          newTotalAmount = currentLoan.amount + amountToChange;
        } else {
          if (amountToChange > currentRemaining) {
            throw new Error(`Cannot decrease more than remaining amount (${formatCurrency(currentRemaining)})`);
          }
          newRemaining = currentRemaining - amountToChange;
          newTotalAmount = currentLoan.amount - amountToChange;
        }
        
        const status = newRemaining <= 0 ? 'completed' : 
                       newRemaining < newTotalAmount ? 'partially_paid' : 'active';
        
        const { data, error } = await supabase
          .from('loans')
          .update({ 
            amount: newTotalAmount,
            remaining_amount: Math.max(0, newRemaining),
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', loanId)
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setLoans(prev => prev.map(l => l.id === loanId ? data as Loan : l));
          alert(`${operation === 'increase' ? 'Increased' : 'Decreased'} by ${formatCurrency(amountToChange)}! Remaining: ${formatCurrency(Math.max(0, newRemaining))}`);
        }
      });
      
      setShowLoanAmountModal(null);
      setLoanAmountValue('');
      
    } catch (err: any) {
      console.error('Update loan amount failed:', err);
      alert(`Failed to update loan amount: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Add transaction to investment with retry
  const addInvestmentTransaction = async (investmentId: string, currentInvestment: Investment) => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setSaving(true);
    
    try {
      await withRetry(async () => {
        const amountNum = parseFloat(investmentAmount);
        let newInvestedAmount = currentInvestment.invested_amount;
        let newCurrentValue = currentInvestment.current_value;
        
        if (investmentTxType === 'add') {
          newInvestedAmount += amountNum;
          newCurrentValue += amountNum;
        } else {
          if (amountNum > currentInvestment.current_value) {
            throw new Error(`Cannot withdraw more than current value (${formatCurrency(currentInvestment.current_value)})`);
          }
          newInvestedAmount -= amountNum;
          newCurrentValue -= amountNum;
        }
        
        const { error: updateError } = await supabase
          .from('investments')
          .update({
            invested_amount: newInvestedAmount,
            current_value: newCurrentValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', investmentId);
        
        if (updateError) throw updateError;
        
        const { error: txError } = await supabase
          .from('investment_transactions')
          .insert({
            investment_id: investmentId,
            user_id: user.id,
            type: investmentTxType,
            amount: amountNum,
            transaction_date: investmentTxDate,
            note: investmentTxNote || null,
          });
        
        if (txError) throw txError;
        
        await fetchAllData();
        alert(`${investmentTxType === 'add' ? 'Added' : 'Withdrawn'} ${formatCurrency(amountNum)} successfully!`);
      });
      
      setShowInvestmentModal(null);
      setInvestmentAmount('');
      setInvestmentTxNote('');
      
    } catch (err: any) {
      console.error('Investment transaction failed:', err);
      alert(`Failed to process transaction: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Update investment value via modal with retry
  const updateInvestmentValueModal = async (investmentId: string) => {
    if (!updateValueAmount || parseFloat(updateValueAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setSaving(true);
    
    try {
      await withRetry(async () => {
        const amountNum = parseFloat(updateValueAmount);
        let updateData: any = {};
        
        if (updateValueType === 'current') {
          updateData.current_value = amountNum;
        } else {
          updateData.invested_amount = amountNum;
        }
        
        const { error } = await supabase
          .from('investments')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', investmentId);
        
        if (error) throw error;
        await fetchAllData();
        alert(`${updateValueType === 'current' ? 'Current value' : 'Invested amount'} updated successfully!`);
      });
      
      setShowUpdateValueModal(null);
      setUpdateValueAmount('');
      
    } catch (err: any) {
      console.error('Update failed:', err);
      alert(`Failed to update after multiple attempts: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const calculateWealthScore = useCallback(() => {
    let score = 0;
    
    if (netWorth > 0) {
      const netWorthScore = Math.min(40, Math.floor(netWorth / 100000) * 2);
      score += netWorthScore;
    } else if (netWorth < 0) {
      score += 0;
    } else {
      score += 5;
    }
    
    if (wealthGoals.length > 0) {
      const avgGoalProgress = wealthGoals.reduce((sum, g) => {
        const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
        return sum + pct;
      }, 0) / wealthGoals.length;
      score += Math.min(30, Math.floor(avgGoalProgress * 0.3));
    } else {
      score += 5;
    }
    
    if (investments.length > 0) {
      const totalGain = investments.reduce((sum, i) => sum + (i.current_value - i.invested_amount), 0);
      const totalInv = investments.reduce((sum, i) => sum + i.invested_amount, 0);
      const roi = totalInv > 0 ? (totalGain / totalInv) * 100 : 0;
      if (roi > 0) score += Math.min(20, Math.floor(roi));
      else if (roi < 0) score += Math.max(0, 20 + Math.floor(roi));
      else score += 10;
    } else {
      score += 5;
    }
    
    const monthsCovered = totalAccounts / monthlyExpenses;
    score += Math.min(10, Math.floor(monthsCovered));
    
    return Math.min(100, Math.max(0, Math.round(score)));
  }, [netWorth, wealthGoals, investments, totalAccounts, monthlyExpenses]);

  const getWealthScoreMessage = useCallback(() => {
    const score = calculateWealthScore();
    if (score >= 80) return '💰 Excellent financial health!';
    if (score >= 60) return '📈 Good progress, keep going!';
    if (score >= 40) return '📊 Building momentum';
    return '🎯 Start investing to grow wealth';
  }, [calculateWealthScore]);

  // Update account balance with retry
  const updateAccountBalance = async (accountId: string, currentBalance: number) => {
    if (!balanceAmount || parseFloat(balanceAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setSaving(true);
    
    try {
      await withRetry(async () => {
        let newBalance: number;
        const amountNum = parseFloat(balanceAmount);
        
        if (balanceType === 'add') {
          newBalance = currentBalance + amountNum;
        } else {
          if (amountNum > currentBalance) {
            throw new Error(`Cannot deduct more than current balance (${formatCurrency(currentBalance)})`);
          }
          newBalance = currentBalance - amountNum;
        }
        
        const { data, error } = await supabase
          .from('accounts')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', accountId)
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
          setAccounts(prev => prev.map(a => a.id === accountId ? data as Account : a));
          alert(`${balanceType === 'add' ? 'Added' : 'Deducted'} ${formatCurrency(amountNum)} successfully!`);
        }
      });
      
      setShowBalanceModal(null);
      setBalanceAmount('');
      setTransactionNote('');
      
    } catch (err: any) {
      console.error('Update balance failed:', err);
      alert(`Failed to update balance: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Update loan payment with retry
  const updateLoanPayment = async (loanId: string, currentRemaining: number, paymentAmountNum: number) => {
    if (paymentAmountNum <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    
    setSaving(true);
    
    try {
      await withRetry(async () => {
        const newRemaining = currentRemaining - paymentAmountNum;
        const status = newRemaining <= 0 ? 'completed' : 
                       paymentAmountNum > 0 && newRemaining < currentRemaining ? 'partially_paid' : 'active';
        
        const { data, error } = await supabase
          .from('loans')
          .update({ 
            remaining_amount: Math.max(0, newRemaining),
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', loanId)
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setLoans(prev => prev.map(l => l.id === loanId ? data as Loan : l));
          alert(`Payment recorded! Remaining: ${formatCurrency(Math.max(0, newRemaining))}`);
        }
      });
      
      setShowPaymentModal(null);
      setPaymentAmount('');
      
    } catch (err: any) {
      console.error('Payment failed:', err);
      alert(`Failed to record payment after multiple attempts: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !user) return;
    if (saving) return;
    
    setSaving(true);
    
    try {
      await withRetry(async () => {
        if (tab === 'accounts') {
          const { data, error } = await supabase.from('accounts').insert({ 
            user_id: user.id, name: name.trim(), type, balance: parseFloat(amount) || 0 
          }).select().single();
          if (error) throw error;
          if (data) setAccounts(prev => [data as Account, ...prev]);
          
        } else if (tab === 'assets') {
          const { data, error } = await supabase.from('assets').insert({ 
            user_id: user.id, name: name.trim(), type, value: parseFloat(amount) || 0 
          }).select().single();
          if (error) throw error;
          if (data) setAssets(prev => [data as Asset, ...prev]);
          
        } else if (tab === 'investments') {
          const investmentData: any = { 
            user_id: user.id, name: name.trim(), type, 
            invested_amount: parseFloat(amount) || 0, 
            current_value: parseFloat(amount2) || parseFloat(amount) || 0 
          };
          
          if (type === 'fd') {
            investmentData.interest_rate = parseFloat(rate) || null;
            investmentData.tenure_months = parseInt(fdTenure) || null;
            investmentData.maturity_amount = parseFloat(fdMaturityAmount) || null;
            investmentData.maturity_date = fdMaturityDate || null;
          }
          
          const { data, error } = await supabase.from('investments').insert(investmentData).select().single();
          if (error) throw error;
          if (data) setInvestments(prev => [data as Investment, ...prev]);
          
        } else if (tab === 'liabilities') {
          const { data, error } = await supabase.from('liabilities').insert({ 
            user_id: user.id, name: name.trim(), type, 
            amount: parseFloat(amount) || 0, 
            interest_rate: parseFloat(rate) || 0, 
            emi: parseFloat(amount2) || 0 
          }).select().single();
          if (error) throw error;
          if (data) setLiabilities(prev => [data as Liability, ...prev]);
          
        } else if (tab === 'goals') {
          const { data, error } = await supabase.from('wealth_goals').insert({ 
            user_id: user.id, name: name.trim(), type, 
            target_amount: parseFloat(amount) || 0, 
            current_amount: parseFloat(amount2) || 0, 
            target_date: targetDate || null 
          }).select().single();
          if (error) throw error;
          if (data) setWealthGoals(prev => [data as WealthGoal, ...prev]);
          
        } else if (tab === 'loans') {
          const { data, error } = await supabase.from('loans').insert({
            user_id: user.id,
            name: name.trim(),
            type: type,
            amount: parseFloat(amount) || 0,
            remaining_amount: parseFloat(amount) || 0,
            interest_rate: rate ? parseFloat(rate) : null,
            due_date: targetDate || null,
            status: 'active',
            notes: amount2 || null,
          }).select().single();
          if (error) throw error;
          if (data) setLoans(prev => [data as Loan, ...prev]);
        }
      });
      
      setName('');
      setAmount('');
      setAmount2('');
      setRate('');
      setTargetDate('');
      setFdTenure('');
      setFdMaturityAmount('');
      setFdMaturityDate('');
      setShowForm(false);
      
    } catch (err: any) {
      console.error('Add failed:', err);
      alert(`Failed to add: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (t: Tab, id: string) => {
    const tableMap: Record<string, string> = { 
      accounts: 'accounts', 
      assets: 'assets', 
      investments: 'investments', 
      liabilities: 'liabilities', 
      goals: 'wealth_goals',
      loans: 'loans'
    };
    
    if (!confirm('Delete this item?')) return;
    
    try {
      await withRetry(async () => {
        await supabase.from(tableMap[t] as any).delete().eq('id', id);
      });
      
      if (t === 'accounts') setAccounts(prev => prev.filter(a => a.id !== id));
      else if (t === 'assets') setAssets(prev => prev.filter(a => a.id !== id));
      else if (t === 'investments') setInvestments(prev => prev.filter(i => i.id !== id));
      else if (t === 'liabilities') setLiabilities(prev => prev.filter(l => l.id !== id));
      else if (t === 'goals') setWealthGoals(prev => prev.filter(g => g.id !== id));
      else if (t === 'loans') setLoans(prev => prev.filter(l => l.id !== id));
      
      alert('Deleted successfully');
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const getTypeOptions = () => {
    if (tab === 'accounts') return accountTypes;
    if (tab === 'assets') return assetTypes;
    if (tab === 'investments') return investmentTypes;
    if (tab === 'liabilities') return liabilityTypes;
    if (tab === 'loans') return loanTypes;
    return ['emergency_fund', 'marriage', 'house', 'travel', 'business', 'retirement', 'other'];
  };

  const getTypeIcon = (itemType: string) => {
    const icons: Record<string, React.ReactNode> = {
      bank: <Landmark className="w-3 h-3" />,
      wallet: <Wallet className="w-3 h-3" />,
      cash: <Banknote className="w-3 h-3" />,
      gold: <Award className="w-3 h-3" />,
      property: <Home className="w-3 h-3" />,
      vehicle: <Car className="w-3 h-3" />,
      business: <Briefcase className="w-3 h-3" />,
      fd: <Building className="w-3 h-3" />,
      stocks: <TrendingUp className="w-3 h-3" />,
      loans: <Users className="w-3 h-3" />,
    };
    return icons[itemType] || <TrendingUp className="w-3 h-3" />;
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setAmount2('');
    setRate('');
    setTargetDate('');
    setFdTenure('');
    setFdMaturityAmount('');
    setFdMaturityDate('');
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            ))}
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
          <h1 className="page-title">Wealth</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Track net worth, investments & financial goals</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshData} disabled={refreshing} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1" title="Refresh data">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {tab !== 'overview' && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 py-2 px-4">
              <Plus className="w-4 h-4" />Add
            </button>
          )}
        </div>
      </div>

      {/* Wealth Score Card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-wealth/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-wealth/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-wealth">{calculateWealthScore()}</span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Wealth Score</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{getWealthScoreMessage()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">Net Worth</p>
            <p className="text-xl font-bold text-wealth">{formatCurrency(netWorth)}</p>
          </div>
        </div>
      </div>

      {/* Net Worth Banner */}
      <div className="card p-4 mb-6 border-wealth/20 bg-wealth/5">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Savings</p><p className="font-bold text-wealth text-lg">{formatCurrency(totalAccounts)}</p></div>
          <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Assets</p><p className="font-bold text-wealth text-lg">{formatCurrency(totalAssets)}</p></div>
          <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Investments</p><p className="font-bold text-wealth text-lg">{formatCurrency(totalInvestmentValue)}</p></div>
          <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Lent</p><p className="font-bold text-health text-lg">{formatCurrency(totalLent)}</p></div>
          <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Borrowed</p><p className="font-bold text-red-400 text-lg">{formatCurrency(totalBorrowed)}</p></div>
          <div className="text-center"><p className="text-xs text-[var(--text-secondary)]">Liabilities</p><p className="font-bold text-red-400 text-lg">{formatCurrency(totalLiabilities)}</p></div>
        </div>
      </div>

      {/* Monthly Expenses & Emergency Fund */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><p className="text-sm font-medium text-[var(--text-primary)]">Monthly Expenses</p><p className="text-xs text-[var(--text-secondary)]">For emergency fund calculation</p></div>
          <div className="flex items-center gap-2">
            <input type="number" value={monthlyExpenses} onChange={e => setMonthlyExpenses(parseFloat(e.target.value) || 0)} className="input-base w-32 text-right" />
            <span className="text-xs text-[var(--text-secondary)]">₹/month</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)]">Emergency Fund</span>
            <span className="text-wealth">{(totalAccounts / monthlyExpenses).toFixed(1)} / 6 months</span>
          </div>
          <div className="progress-bar"><div className="progress-fill bg-wealth" style={{ width: `${Math.min(100, (totalAccounts / (monthlyExpenses * 6)) * 100)}%` }} /></div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Goal: 6 months of expenses saved</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 mb-6 flex-wrap">
        {(['overview', 'accounts', 'assets', 'investments', 'liabilities', 'goals', 'loans'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); resetForm(); }} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all flex items-center gap-1 ${tab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {getTypeIcon(t)} {t}
          </button>
        ))}
      </div>

      {/* Add Form */}
      {showForm && tab !== 'overview' && (
        <div className="card p-4 mb-5 animate-slide-up">
          <h3 className="font-medium text-sm mb-3 capitalize text-[var(--text-primary)]">Add New {tab.slice(0, -1)}</h3>
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Name..." className="input-base" autoFocus disabled={saving} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Type</label><select value={type} onChange={e => setType(e.target.value)} className="input-base capitalize" disabled={saving}>{getTypeOptions().map(o => <option key={o} value={o}>{o.replace('_', ' ').toUpperCase()}</option>)}</select></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">{tab === 'investments' ? 'Invested (₹)' : tab === 'liabilities' ? 'Amount (₹)' : tab === 'goals' ? 'Target (₹)' : tab === 'loans' ? 'Loan Amount (₹)' : 'Balance/Value (₹)'}</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="input-base" disabled={saving} /></div>
            </div>
            {(tab === 'investments' || tab === 'goals') && (<div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">{tab === 'investments' ? 'Current Value (₹)' : 'Current Amount (₹)'}</label><input type="number" value={amount2} onChange={e => setAmount2(e.target.value)} placeholder="0" className="input-base" disabled={saving} /></div>)}
            {tab === 'loans' && (<div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Notes / Reason</label><input type="text" value={amount2} onChange={e => setAmount2(e.target.value)} placeholder="Optional notes..." className="input-base" disabled={saving} /></div>)}
            {tab === 'investments' && type === 'fd' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 flex items-center gap-1"><Percent className="w-3 h-3" /> Interest Rate (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="7.5" className="input-base" step="0.1" disabled={saving} /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Tenure (Months)</label><input type="number" value={fdTenure} onChange={e => setFdTenure(e.target.value)} placeholder="12" className="input-base" disabled={saving} /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Maturity Amount (₹)</label><input type="number" value={fdMaturityAmount} onChange={e => setFdMaturityAmount(e.target.value)} placeholder="Auto-calculated" className="input-base" disabled={saving} /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Maturity Date</label><input type="date" value={fdMaturityDate} onChange={e => setFdMaturityDate(e.target.value)} className="input-base" disabled={saving} /></div>
              </div>
            )}
            {(tab === 'liabilities' || (tab === 'loans' && type === 'lent')) && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Interest Rate (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" className="input-base" disabled={saving} /></div>
                {tab === 'liabilities' && (<div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">EMI (₹)</label><input type="number" value={amount2} onChange={e => setAmount2(e.target.value)} placeholder="0" className="input-base" disabled={saving} /></div>)}
                {tab === 'loans' && (<div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Due Date</label><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="input-base" disabled={saving} /></div>)}
              </div>
            )}
            {tab === 'goals' && (<input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="input-base" disabled={saving} />)}
            <div className="flex gap-2"><button onClick={() => handleAdd()} disabled={saving} className="btn-primary py-2 px-4">{saving ? 'Adding...' : 'Add'}</button><button onClick={resetForm} className="btn-ghost">Cancel</button></div>
          </div>
        </div>
      )}

      {/* Content */}
      <>
        {/* Overview Tab - SIMPLE: Only shows data, no interactive buttons */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {accounts.length > 0 && (
              <div>
                <p className="section-header flex items-center gap-2 mb-2"><Landmark className="w-4 h-4" /> Accounts & Wallets</p>
                <div className="space-y-2">
                  {accounts.slice(0, 5).map(a => (
                    <SimpleRow key={a.id} label={a.name} sub={a.type} value={formatCurrency(a.balance)} valueColor="text-wealth" />
                  ))}
                  {accounts.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center py-2">+{accounts.length - 5} more accounts</p>}
                </div>
              </div>
            )}
            
            {assets.length > 0 && (
              <div>
                <p className="section-header flex items-center gap-2 mb-2"><Home className="w-4 h-4" /> Assets</p>
                <div className="space-y-2">
                  {assets.slice(0, 5).map(a => (
                    <SimpleRow key={a.id} label={a.name} sub={a.type} value={formatCurrency(a.value)} valueColor="text-wealth" />
                  ))}
                  {assets.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center py-2">+{assets.length - 5} more assets</p>}
                </div>
              </div>
            )}
            
            {investments.length > 0 && (
              <div>
                <p className="section-header flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4" /> Investments</p>
                <div className="space-y-2">
                  {investments.slice(0, 5).map(i => {
                    const gain = i.current_value - i.invested_amount;
                    return (
                      <div key={i.id} className="card-hover p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{i.name}</p>
                            <p className="text-xs text-[var(--text-secondary)] capitalize">{i.type.replace('_', ' ')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-wealth">{formatCurrency(i.current_value)}</p>
                            <p className={`text-xs ${gain >= 0 ? 'text-health' : 'text-red-400'}`}>
                              {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {investments.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center py-2">+{investments.length - 5} more investments</p>}
                </div>
              </div>
            )}
            
            {liabilities.length > 0 && (
              <div>
                <p className="section-header flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4" /> Liabilities</p>
                <div className="space-y-2">
                  {liabilities.slice(0, 5).map(l => (
                    <SimpleRow key={l.id} label={l.name} sub={`${l.type} · ${l.interest_rate}%`} value={formatCurrency(l.amount)} valueColor="text-red-400" />
                  ))}
                  {liabilities.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center py-2">+{liabilities.length - 5} more liabilities</p>}
                </div>
              </div>
            )}
            
            {loans.length > 0 && (
              <div>
                <p className="section-header flex items-center gap-2 mb-2"><Users className="w-4 h-4" /> Personal Loans</p>
                <div className="space-y-2">
                  {loans.slice(0, 5).map(l => (
                    <SimpleRow key={l.id} label={l.name} sub={`${l.type === 'lent' ? 'Lent to' : 'Borrowed from'} · ${l.status}`} value={formatCurrency(l.remaining_amount)} valueColor={l.type === 'lent' ? 'text-health' : 'text-red-400'} />
                  ))}
                  {loans.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center py-2">+{loans.length - 5} more loans</p>}
                </div>
              </div>
            )}
            
            {wealthGoals.length > 0 && (
              <div>
                <p className="section-header flex items-center gap-2 mb-2"><Target className="w-4 h-4" /> Wealth Goals</p>
                <div className="space-y-2">
                  {wealthGoals.slice(0, 5).map(g => (
                    <SimpleRow key={g.id} label={g.name} sub={g.type.replace('_', ' ')} value={formatCurrency(g.target_amount)} valueColor="text-wealth" />
                  ))}
                  {wealthGoals.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center py-2">+{wealthGoals.length - 5} more goals</p>}
                </div>
              </div>
            )}
            
            {accounts.length === 0 && assets.length === 0 && investments.length === 0 && liabilities.length === 0 && loans.length === 0 && wealthGoals.length === 0 && (
              <Empty icon={PiggyBank} text="Start tracking your wealth journey" />
            )}
          </div>
        )}

        {/* Accounts Tab */}
        {tab === 'accounts' && (
          accounts.length === 0 ? <Empty icon={PiggyBank} text="No accounts yet. Add your bank accounts and wallets." /> : 
          <div className="space-y-2">
            {accounts.map(a => (
              <AccountRow 
                key={a.id} 
                account={a} 
                formatCurrency={formatCurrency}
                onDelete={() => deleteItem('accounts', a.id)}
                onUpdateBalance={() => setShowBalanceModal(a.id)}
              />
            ))}
            <div className="card p-4 mt-2 bg-wealth/5">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">Total Savings</span>
                <span className="text-sm font-bold text-wealth">{formatCurrency(totalAccounts)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Assets Tab */}
        {tab === 'assets' && (
          assets.length === 0 ? <Empty icon={Home} text="No assets yet. Add property, gold, vehicles, etc." /> : 
          <div className="space-y-2">
            {assets.map(a => (
              <WealthRow 
                key={a.id} 
                label={a.name} 
                sub={a.type} 
                value={formatCurrency(a.value)} 
                valueColor="text-wealth" 
                onDelete={() => deleteItem('assets', a.id)} 
              />
            ))}
            <div className="card p-4 mt-2 bg-wealth/5">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">Total Assets Value</span>
                <span className="text-sm font-bold text-wealth">{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Investments Tab - WITH DELETE OPTION PRESERVED */}
        {tab === 'investments' && (
          investments.length === 0 ? <Empty icon={TrendingUp} text="No investments yet. Start building wealth through investments." /> :
          <div className="space-y-3">
            {investments.map(i => {
              const gain = i.current_value - i.invested_amount;
              const gainPct = i.invested_amount > 0 ? ((gain / i.invested_amount) * 100).toFixed(1) : '0';
              const isFD = i.type === 'fd';
              const daysLeft = isFD && i.maturity_date ? getDaysRemaining(i.maturity_date) : null;
              const transactions = investmentTransactions.filter(tx => tx.investment_id === i.id);
              
              return (
                <div key={i.id} className="card-hover p-4 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="font-medium text-sm text-[var(--text-primary)]">{i.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] capitalize">{i.type.replace('_', ' ')}</p>
                        {isFD && i.interest_rate && (<span className="text-xs text-wealth px-1.5 py-0.5 rounded-full bg-wealth/10">{i.interest_rate}% p.a.</span>)}
                        {isFD && daysLeft !== null && daysLeft > 0 && (<span className="text-xs text-wealth px-1.5 py-0.5 rounded-full bg-wealth/10">{daysLeft} days left</span>)}
                        {isFD && daysLeft !== null && daysLeft <= 0 && (<span className="text-xs text-green-400 px-1.5 py-0.5 rounded-full bg-green-500/10">Matured</span>)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {/* Invested Amount */}
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">Invested</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[var(--text-primary)]">{formatCurrency(i.invested_amount)}</p>
                            <button 
                              onClick={() => { setShowUpdateValueModal(i.id); setUpdateValueAmount(i.invested_amount.toString()); setUpdateValueType('invested'); }} 
                              className="p-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
                              title="Edit invested amount"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-wealth cursor-pointer" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Current Value */}
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">Current</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[var(--text-primary)]">{formatCurrency(i.current_value)}</p>
                            <button 
                              onClick={() => { 
                                setShowUpdateValueModal(i.id); 
                                setUpdateValueAmount(i.current_value.toString()); 
                                setUpdateValueType('current'); 
                              }} 
                              className="p-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
                              title="Edit current value"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-wealth cursor-pointer" />
                            </button>
                          </div>
                        </div>
                        
                        {/* P&L */}
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">P&L</p>
                          <p className={`font-medium ${gain >= 0 ? 'text-health' : 'text-red-400'}`}>
                            {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct}%)
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-4 mt-3">
                        <button onClick={() => setShowInvestmentModal(i.id)} className="text-xs text-wealth flex items-center gap-1 hover:underline">
                          <ArrowUpCircle className="w-3.5 h-3.5" /> Add/Withdraw
                        </button>
                        <button onClick={() => setShowInvestmentHistory(i.id)} className="text-xs text-career flex items-center gap-1 hover:underline">
                          <History className="w-3.5 h-3.5" /> History
                        </button>
                      </div>
                      
                      {transactions.length > 0 && (<div className="mt-2"><p className="text-[10px] text-[var(--text-muted)]">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p></div>)}
                    </div>
                    {/* DELETE BUTTON - PRESERVED */}
                    <button onClick={() => deleteItem('investments', i.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="card p-4 mt-2 bg-wealth/5">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-[var(--text-secondary)]">Total Invested</p><p className="text-sm font-bold text-wealth">{formatCurrency(totalInvested)}</p></div>
                <div><p className="text-xs text-[var(--text-secondary)]">Current Value</p><p className="text-sm font-bold text-wealth">{formatCurrency(totalInvestmentValue)}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Liabilities Tab */}
        {tab === 'liabilities' && (
          liabilities.length === 0 ? <Empty icon={CreditCard} text="No liabilities yet. Track loans and credit cards." /> : 
          <div className="space-y-2">
            {liabilities.map(l => (
              <WealthRow 
                key={l.id} 
                label={l.name} 
                sub={`${l.type} · ${l.interest_rate}% interest · EMI: ${formatCurrency(l.emi)}`} 
                value={formatCurrency(l.amount)} 
                valueColor="text-red-400" 
                onDelete={() => deleteItem('liabilities', l.id)} 
              />
            ))}
            <div className="card p-4 mt-2 bg-red-400/5">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">Total Liabilities</span>
                <span className="text-sm font-bold text-red-400">{formatCurrency(totalLiabilities)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Loans Tab - WITH BOTH INCREASE AND DECREASE OPTIONS */}
        {tab === 'loans' && (
          loans.length === 0 ? <Empty icon={Users} text="No loans yet. Track money lent to others or borrowed from someone." /> :
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="card p-4 text-center bg-green-500/5 border-green-500/20">
                <p className="text-xs text-[var(--text-secondary)]">💰 Money Lent</p>
                <p className="text-xl font-bold text-health">{formatCurrency(totalLent)}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{loans.filter(l => l.type === 'lent').length} active loans</p>
              </div>
              <div className="card p-4 text-center bg-red-500/5 border-red-500/20">
                <p className="text-xs text-[var(--text-secondary)]">🏦 Money Borrowed</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(totalBorrowed)}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{loans.filter(l => l.type === 'borrowed').length} active loans</p>
              </div>
            </div>
            {loans.map(loan => {
              const isLent = loan.type === 'lent';
              const paidAmount = loan.amount - loan.remaining_amount;
              const paidPercent = loan.amount > 0 ? (paidAmount / loan.amount) * 100 : 0;
              const isOverdue = loan.due_date && new Date(loan.due_date) < new Date() && loan.status !== 'completed';
              return (
                <div key={loan.id} className="card-hover p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-sm text-[var(--text-primary)]">{loan.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isLent ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{isLent ? 'Lent to' : 'Borrowed from'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${loan.status === 'completed' ? 'bg-green-500/10 text-green-400' : loan.status === 'partially_paid' ? 'bg-wealth/10 text-wealth' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>{loan.status === 'partially_paid' ? 'Partially Paid' : loan.status}</span>
                        {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">⚠️ Overdue</span>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-xs">
                        <div><p className="text-[var(--text-secondary)]">Total</p><p className="font-medium">{formatCurrency(loan.amount)}</p></div>
                        <div><p className="text-[var(--text-secondary)]">Remaining</p><p className={`font-medium ${isLent ? 'text-health' : 'text-red-400'}`}>{formatCurrency(loan.remaining_amount)}</p></div>
                        {loan.interest_rate && <div><p className="text-[var(--text-secondary)]">Interest</p><p className="font-medium">{loan.interest_rate}%</p></div>}
                        {loan.due_date && <div><p className="text-[var(--text-secondary)]">Due</p><p className={`font-medium ${isOverdue ? 'text-red-400' : ''}`}>{new Date(loan.due_date).toLocaleDateString()}</p></div>}
                      </div>
                      {loan.notes && <p className="text-xs text-[var(--text-secondary)] mt-2">📝 {loan.notes}</p>}
                      {loan.status !== 'completed' && loan.amount > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[var(--text-secondary)]">Payment Progress</span>
                            <span className={isLent ? 'text-health' : 'text-wealth'}>{paidPercent.toFixed(0)}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className={`progress-fill ${isLent ? 'bg-health' : 'bg-wealth'}`} style={{ width: `${paidPercent}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* Increase & Decrease Buttons for Loans */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setShowLoanAmountModal({ loanId: loan.id, type: 'decrease' }); setLoanAmountValue(''); }} 
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group"
                          title="Decrease loan amount"
                        >
                          <MinusCircle className="w-4 h-4 text-red-400" />
                        </button>
                        <button 
                          onClick={() => { setShowLoanAmountModal({ loanId: loan.id, type: 'increase' }); setLoanAmountValue(''); }} 
                          className="p-1.5 hover:bg-green-500/10 rounded-lg transition-colors group"
                          title="Increase loan amount"
                        >
                          <PlusCircle className="w-4 h-4 text-green-400" />
                        </button>
                      </div>
                    
                      {/* Delete Button for Loans */}
                      <button 
                        onClick={() => deleteItem('loans', loan.id)} 
                        className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Goals Tab - FIXED: No hooks inside map */}
        {tab === 'goals' && (
          wealthGoals.length === 0 ? <Empty icon={Target} text="No wealth goals yet. Set financial targets to achieve." /> :
          <div className="space-y-3">
            {wealthGoals.map(g => {
              const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
              
              return (
                <div key={g.id} className="card-hover p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm text-[var(--text-primary)]">{g.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] capitalize">{g.type.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs text-[var(--text-secondary)]">Target</p>
                        <p className="text-sm font-semibold text-wealth">{formatCurrency(g.target_amount)}</p>
                      </div>
                      <button onClick={() => deleteItem('goals', g.id)} className="text-[var(--text-muted)] hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Current Amount with Edit Buttons */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Saved:</span>
                      <span className="text-sm font-medium text-wealth">{formatCurrency(g.current_amount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          const newAmount = prompt('Enter amount to DECREASE (₹):', '0');
                          if (newAmount && !isNaN(parseFloat(newAmount))) {
                            const decreaseAmount = parseFloat(newAmount);
                            const updatedAmount = Math.max(0, g.current_amount - decreaseAmount);
                            await updateGoalAmount(g.id, updatedAmount);
                          }
                        }}
                        className="p-1 rounded-md hover:bg-red-500/10 transition-colors"
                        title="Decrease saved amount"
                      >
                        <MinusCircle className="w-4 h-4 text-red-400" />
                      </button>
                      <button
                        onClick={async () => {
                          const newAmount = prompt('Enter amount to ADD (₹):', '0');
                          if (newAmount && !isNaN(parseFloat(newAmount))) {
                            const addAmount = parseFloat(newAmount);
                            const updatedAmount = g.current_amount + addAmount;
                            await updateGoalAmount(g.id, updatedAmount);
                          }
                        }}
                        className="p-1 rounded-md hover:bg-green-500/10 transition-colors"
                        title="Increase saved amount"
                      >
                        <PlusCircle className="w-4 h-4 text-green-400" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                    <span>{formatCurrency(g.current_amount)} saved</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill bg-wealth" style={{ width: `${pct}%` }} />
                  </div>
                  {g.target_date && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Target Date: {new Date(g.target_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>

      {/* Balance Update Modal */}
      {showBalanceModal && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowBalanceModal(null)}><div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}><h3 className="font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]"><Wallet className="w-4 h-4 text-wealth" /> Update Balance</h3><div className="space-y-4"><div className="flex gap-2"><button onClick={() => setBalanceType('add')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${balanceType === 'add' ? 'bg-green-500/20 text-green-400 border border-green-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'}`}><ArrowUpCircle className="w-4 h-4" /> Add Money</button><button onClick={() => setBalanceType('deduct')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${balanceType === 'deduct' ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'}`}><ArrowDownCircle className="w-4 h-4" /> Deduct Money</button></div><div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Amount (₹)</label><input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="Enter amount" className="input-base" autoFocus step="any" /></div><div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Note (optional)</label><input type="text" value={transactionNote} onChange={e => setTransactionNote(e.target.value)} placeholder="e.g., Salary, Shopping, Rent, etc." className="input-base" /></div><div className="flex gap-3 pt-2"><button onClick={() => { const account = accounts.find(a => a.id === showBalanceModal); if (account) updateAccountBalance(showBalanceModal, account.balance); }} disabled={!balanceAmount || saving} className="btn-primary flex-1">{saving ? 'Updating...' : `Confirm ${balanceType === 'add' ? 'Addition' : 'Deduction'}`}</button><button onClick={() => { setShowBalanceModal(null); setBalanceAmount(''); setTransactionNote(''); }} className="btn-ghost flex-1">Cancel</button></div></div></div></div>)}

      {/* Payment Modal for Loans */}
      {showPaymentModal && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(null)}><div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}><h3 className="font-medium mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-wealth" /> Record Payment</h3><div className="space-y-4"><div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Payment Amount (₹)</label><input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter amount" className="input-base" autoFocus step="any" /></div><div className="flex gap-3 pt-2"><button onClick={() => { const loan = loans.find(l => l.id === showPaymentModal); if (loan) updateLoanPayment(showPaymentModal, loan.remaining_amount, parseFloat(paymentAmount)); }} disabled={!paymentAmount || saving} className="btn-primary flex-1">{saving ? 'Recording...' : 'Record Payment'}</button><button onClick={() => setShowPaymentModal(null)} className="btn-ghost flex-1">Cancel</button></div></div></div></div>)}

      {/* Loan Amount Increase/Decrease Modal */}
      {showLoanAmountModal && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowLoanAmountModal(null)}><div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}><h3 className="font-medium mb-4 flex items-center gap-2">{showLoanAmountModal.type === 'increase' ? <PlusCircle className="w-4 h-4 text-green-400" /> : <MinusCircle className="w-4 h-4 text-red-400" />} {showLoanAmountModal.type === 'increase' ? 'Increase' : 'Decrease'} Loan Amount</h3><div className="space-y-4"><div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Amount (₹)</label><input type="number" value={loanAmountValue} onChange={e => setLoanAmountValue(e.target.value)} placeholder={`Enter amount to ${showLoanAmountModal.type}`} className="input-base" autoFocus step="any" /></div><div className="flex gap-3 pt-2"><button onClick={() => { const loan = loans.find(l => l.id === showLoanAmountModal.loanId); if (loan) updateLoanAmount(showLoanAmountModal.loanId, loan.remaining_amount, parseFloat(loanAmountValue), showLoanAmountModal.type); }} disabled={!loanAmountValue || saving} className="btn-primary flex-1">{saving ? 'Processing...' : `Confirm ${showLoanAmountModal.type}`}</button><button onClick={() => setShowLoanAmountModal(null)} className="btn-ghost flex-1">Cancel</button></div></div></div></div>)}

      {/* Investment Transaction Modal */}
      {showInvestmentModal && (() => {
        const investment = investments.find(i => i.id === showInvestmentModal);
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowInvestmentModal(null)}>
            <div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="font-medium mb-4 flex items-center gap-2">{investment?.name}</h3>
              <div className="space-y-4">
                <div className="flex gap-2"><button onClick={() => setInvestmentTxType('add')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${investmentTxType === 'add' ? 'bg-green-500/20 text-green-400 border border-green-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}><ArrowUpCircle className="w-4 h-4 inline mr-1" /> Add Money</button><button onClick={() => setInvestmentTxType('withdraw')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${investmentTxType === 'withdraw' ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}><ArrowDownCircle className="w-4 h-4 inline mr-1" /> Withdraw</button></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Amount (₹)</label><input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)} placeholder="Enter amount" className="input-base" autoFocus step="any" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Date</label><input type="date" value={investmentTxDate} onChange={e => setInvestmentTxDate(e.target.value)} className="input-base" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Note (optional)</label><input type="text" value={investmentTxNote} onChange={e => setInvestmentTxNote(e.target.value)} placeholder="e.g., SIP installment, Bonus" className="input-base" /></div>
                <div className="flex gap-3 pt-2"><button onClick={() => investment && addInvestmentTransaction(showInvestmentModal, investment)} disabled={!investmentAmount || saving} className="btn-primary flex-1">{saving ? 'Processing...' : 'Confirm'}</button><button onClick={() => setShowInvestmentModal(null)} className="btn-ghost flex-1">Cancel</button></div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Investment History Modal */}
      {showInvestmentHistory && (() => {
        const investment = investments.find(i => i.id === showInvestmentHistory);
        const transactions = investmentTransactions.filter(tx => tx.investment_id === showInvestmentHistory);
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowInvestmentHistory(null)}>
            <div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-medium">{investment?.name} - Transaction History</h3><button onClick={() => setShowInvestmentHistory(null)} className="text-[var(--text-secondary)]"><X className="w-5 h-5" /></button></div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? <p className="text-xs text-[var(--text-secondary)] text-center py-4">No transactions yet</p> : transactions.map(tx => (<div key={tx.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg"><div><p className={`text-sm font-medium ${tx.type === 'add' ? 'text-health' : 'text-red-400'}`}>{tx.type === 'add' ? '+' : '-'}{formatCurrency(tx.amount)}</p><p className="text-xs text-[var(--text-secondary)]">{new Date(tx.transaction_date).toLocaleDateString()}</p></div>{tx.note && <p className="text-xs text-[var(--text-muted)]">{tx.note}</p>}</div>))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Update Investment Value Modal */}
      {showUpdateValueModal && (() => {
        const investment = investments.find(i => i.id === showUpdateValueModal);
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowUpdateValueModal(null)}>
            <div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-[var(--text-primary)]">Update {investment?.name}</h3>
                <button onClick={() => setShowUpdateValueModal(null)} className="text-[var(--text-secondary)]"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setUpdateValueType('current')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${updateValueType === 'current' ? 'bg-wealth/20 text-wealth border border-wealth' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>Current Value</button>
                  <button onClick={() => setUpdateValueType('invested')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${updateValueType === 'invested' ? 'bg-wealth/20 text-wealth border border-wealth' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>Invested Amount</button>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">{updateValueType === 'current' ? 'Current Value' : 'Invested Amount'} (₹)</label>
                  <input type="number" value={updateValueAmount} onChange={e => setUpdateValueAmount(e.target.value)} placeholder={`Enter ${updateValueType === 'current' ? 'current value' : 'invested amount'}`} className="input-base" autoFocus step="any" />
                </div>
                {investment && (
                  <div className="p-2 rounded-lg bg-wealth/5 text-xs text-[var(--text-secondary)]">
                    {updateValueType === 'current' ? `Invested: ${formatCurrency(investment.invested_amount)}` : `Current: ${formatCurrency(investment.current_value)}`}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => updateInvestmentValueModal(showUpdateValueModal)} disabled={!updateValueAmount || saving} className="btn-primary flex-1">{saving ? 'Updating...' : 'Update'}</button>
                  <button onClick={() => { setShowUpdateValueModal(null); setUpdateValueAmount(''); }} className="btn-ghost flex-1">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Simple Row for Overview (no delete or edit buttons)
function SimpleRow({ label, sub, value, valueColor }: { label: string; sub: string; value: string; valueColor: string }) {
  return (
    <div className="card-hover p-3 flex items-center justify-between">
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-[var(--text-secondary)] capitalize">{sub}</p>
      </div>
      <p className={`font-semibold text-sm ${valueColor} flex-shrink-0`}>{value}</p>
    </div>
  );
}

// Account Row Component with Balance Update
function AccountRow({ account, formatCurrency, onDelete, onUpdateBalance }: { account: Account; formatCurrency: (n: number) => string; onDelete: () => void; onUpdateBalance: () => void; }) {
  return (
    <div className="card-hover p-4 group">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate text-[var(--text-primary)]">{account.name}</p><p className="text-xs text-[var(--text-secondary)] capitalize">{account.type}</p></div>
        <div className="text-right"><p className="font-semibold text-sm text-wealth">{formatCurrency(account.balance)}</p></div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onUpdateBalance} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors" title="Update balance"><Wallet className="w-3.5 h-3.5 text-[var(--text-secondary)]" /></button>
          <button onClick={onDelete} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-400" /></button>
        </div>
      </div>
    </div>
  );
}

// Wealth Row Component
function WealthRow({ label, sub, value, valueColor, onDelete }: { label: string; sub: string; value: string; valueColor: string; onDelete: () => void; }) {
  return (
    <div className="card-hover p-4 flex items-center justify-between gap-3 group">
      <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate text-[var(--text-primary)]">{label}</p><p className="text-xs text-[var(--text-secondary)] capitalize truncate">{sub}</p></div>
      <p className={`font-semibold text-sm ${valueColor} flex-shrink-0`}>{value}</p>
      <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (<div className="text-center py-16 card"><Icon className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" /><p className="text-[var(--text-secondary)] text-sm">{text}</p></div>);
}