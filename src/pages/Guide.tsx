import { useEffect, useState, useCallback } from 'react';
import { 
  Zap, TrendingUp, TrendingDown, Target, Calendar, AlertCircle, CheckCircle, 
  Award, Brain, Briefcase, Heart, BookOpen, DollarSign, Activity,
  ArrowRight, Clock, Flame, MessageCircle, Sparkles, BarChart3, RefreshCw, GraduationCap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Goal, Task, Habit, HealthLog, Investment, Business, Account, Asset, Liability, CareerTrack, CareerProfile, Loan } from '../types';

// Safe query for loading data - splits into groups to avoid connection pool exhaustion
async function safeQuery<T>(queryFn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    if (retries === 0) throw error;
    console.log('Query failed, retrying...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return safeQuery(queryFn, retries - 1);
  }
}

export default function Guide() {
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [climbScore, setClimbScore] = useState(0);
  const [netWorth, setNetWorth] = useState(0);

  // Load all data with parallel queries (split into groups)
  const loadAllData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setLoadError(false);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      // Group 1: Goals and Tasks
      const [g, t] = await safeQuery(async () => Promise.all([
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('due_date', today),
      ]));
      
      // Group 2: Habits and Health Logs
      const [h, hl] = await safeQuery(async () => Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
        supabase.from('health_logs').select('*').eq('user_id', user.id).gte('log_date', dateStr).limit(30),
      ]));
      
      // Group 3: Investments and Businesses
      const [inv, b] = await safeQuery(async () => Promise.all([
        supabase.from('investments').select('*').eq('user_id', user.id),
        supabase.from('businesses').select('*').eq('user_id', user.id),
      ]));
      
      // Group 4: Accounts, Assets, Liabilities
      const [a, as, lib] = await safeQuery(async () => Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('assets').select('*').eq('user_id', user.id),
        supabase.from('liabilities').select('*').eq('user_id', user.id),
      ]));
      
      // Group 5: Career and Loans
      const [tr, cp, ln] = await safeQuery(async () => Promise.all([
        supabase.from('career_tracks').select('*').eq('user_id', user.id).order('priority', { ascending: false }),
        supabase.from('career_profile').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('loans').select('*').eq('user_id', user.id),
      ]));
      
      setGoals((g.data || []) as Goal[]);
      setTasks((t.data || []) as Task[]);
      setHabits((h.data || []) as Habit[]);
      setHealthLogs((hl.data || []) as HealthLog[]);
      setInvestments((inv.data || []) as Investment[]);
      setBusinesses((b.data || []) as Business[]);
      setAccounts((a.data || []) as Account[]);
      setAssets((as.data || []) as Asset[]);
      setLiabilities((lib.data || []) as Liability[]);
      setLoans((ln.data || []) as Loan[]);
      setTracks((tr.data || []) as CareerTrack[]);
      setCareerProfile((cp.data || null) as CareerProfile | null);
      
      // Calculate Net Worth properly (matching Wealth page)
      const totalAccountsSum = (a.data || []).reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
      const totalAssetsSum = (as.data || []).reduce((sum: number, asset: any) => sum + (asset.value || 0), 0);
      const totalInvestmentsSum = (inv.data || []).reduce((sum: number, invItem: any) => sum + (invItem.current_value || 0), 0);
      const totalLiabilitiesSum = (lib.data || []).reduce((sum: number, libItem: any) => sum + (libItem.amount || 0), 0);
      const totalLent = (ln.data || []).filter((l: any) => l.type === 'lent').reduce((sum: number, l: any) => sum + (l.remaining_amount || 0), 0);
      const totalBorrowed = (ln.data || []).filter((l: any) => l.type === 'borrowed').reduce((sum: number, l: any) => sum + (l.remaining_amount || 0), 0);
      const netWorthVal = totalAccountsSum + totalAssetsSum + totalInvestmentsSum + totalLent - totalLiabilitiesSum - totalBorrowed;
      setNetWorth(netWorthVal);
      
      calculateClimbScore(g.data || [], h.data || [], hl.data || [], inv.data || [], b.data || []);
    } catch (err) {
      console.error('Load error:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [user, loadAllData]);

  // Warm up Supabase connection
  useEffect(() => {
    const warmupConnection = async () => {
      if (user) {
        try {
          await supabase.from('goals').select('count', { count: 'exact', head: true });
          console.log('Supabase connection ready for Guide');
        } catch (err) {
          console.log('Connection warmup failed');
        }
      }
    };
    warmupConnection();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const calculateClimbScore = useCallback((goalsData: any[], habitsData: any[], healthData: any[], investmentsData: any[], businessesData: any[]) => {
    let score = 0;
    
    // Goals progress (40%)
    const activeGoals = goalsData.filter(g => !g.completed);
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((sum, g) => {
        const start = g.start_value || 0;
        const current = g.current_value || 0;
        const target = g.target_value || start;
        const progress = target > start ? ((current - start) / (target - start)) * 100 : 0;
        return sum + Math.min(100, Math.max(0, progress));
      }, 0) / activeGoals.length;
      score += (avgProgress * 0.4);
    } else {
      score += 5;
    }
    
    // Habits consistency (20%)
    if (habitsData.length > 0) {
      const avgStreak = habitsData.reduce((sum, h) => sum + (h.streak || 0), 0) / habitsData.length;
      score += Math.min(20, avgStreak);
    } else {
      score += 5;
    }
    
    // Health (15%)
    if (healthData.length > 0) {
      const workoutDays = healthData.filter(h => h.workout_done).length;
      const avgSteps = healthData.reduce((sum, h) => sum + (h.steps || 0), 0) / healthData.length;
      let healthScore = 0;
      if (workoutDays >= 4) healthScore += 7;
      else if (workoutDays >= 2) healthScore += 4;
      if (avgSteps >= 8000) healthScore += 8;
      else if (avgSteps >= 5000) healthScore += 4;
      score += Math.min(15, healthScore);
    } else {
      score += 3;
    }
    
    // Wealth (15%)
    if (investmentsData.length > 0) {
      const totalValue = investmentsData.reduce((sum, i) => sum + (i.current_value || 0), 0);
      if (totalValue > 1000000) score += 15;
      else if (totalValue > 500000) score += 10;
      else if (totalValue > 100000) score += 5;
      else score += 2;
    } else {
      score += 0;
    }
    
    // Business (10%)
    if (businessesData.length > 0) {
      const totalRevenue = businessesData.reduce((sum, b) => sum + (b.monthly_revenue || 0), 0);
      if (totalRevenue > 1000000) score += 10;
      else if (totalRevenue > 500000) score += 7;
      else if (totalRevenue > 100000) score += 4;
      else score += 2;
    } else {
      score += 0;
    }
    
    setClimbScore(Math.min(100, Math.round(score)));
  }, []);

  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const pillarGoalCounts: Record<string, number> = {};
  goals.forEach(g => { 
    if (!g.completed) pillarGoalCounts[g.pillar] = (pillarGoalCounts[g.pillar] || 0) + 1; 
  });

  const strongestPillar = Object.entries(pillarGoalCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weakestPillar = ['health', 'knowledge', 'career', 'wealth', 'business']
    .find(p => !pillarGoalCounts[p]);

  const pillarColors: Record<string, string> = {
    health: 'text-health', knowledge: 'text-knowledge', career: 'text-career',
    wealth: 'text-wealth', business: 'text-business', personal: 'text-[var(--text-secondary)]',
  };
  const pillarBgs: Record<string, string> = {
    health: 'bg-health/10 border-health/20', knowledge: 'bg-knowledge/10 border-knowledge/20',
    career: 'bg-career/10 border-career/20', wealth: 'bg-wealth/10 border-wealth/20',
    business: 'bg-business/10 border-business/20', personal: 'bg-[var(--bg-secondary)] border-[var(--border)]',
  };
  const pillarIcons: Record<string, React.ReactNode> = {
    health: <Heart className="w-4 h-4" />,
    knowledge: <BookOpen className="w-4 h-4" />,
    career: <Briefcase className="w-4 h-4" />,
    wealth: <DollarSign className="w-4 h-4" />,
    business: <Activity className="w-4 h-4" />,
  };

  const isNewUser = goals.length === 0 && tasks.length === 0 && habits.length === 0;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Check if user is government aspirant
  const isGovtAspirant = careerProfile?.career_type === 'government_aspirant';
  const primaryTrack = tracks.find(t => t.priority === 'primary');
  const govtTrack = tracks.find(t => t.type === 'government_exam');

  const missions = [
    goals.filter(g => !g.completed).length === 0 && { icon: Target, text: 'Set your first long-term goal in the Planner', action: 'Go to Planner', link: '/planner', priority: 'high' },
    tasks.filter(t => !t.completed).length > 0 && { icon: CheckCircle, text: `Complete ${tasks.filter(t => !t.completed).length} pending task${tasks.filter(t => !t.completed).length > 1 ? 's' : ''} for today`, action: 'Go to Planner', link: '/planner', priority: 'medium' },
    habits.filter(h => h.streak === 0).length > 0 && { icon: Flame, text: `Start building streaks for ${habits.filter(h => h.streak === 0).length} habit${habits.filter(h => h.streak === 0).length > 1 ? 's' : ''}`, action: 'Go to Planner', link: '/planner', priority: 'medium' },
    weakestPillar && { icon: AlertCircle, text: `${weakestPillar.charAt(0).toUpperCase() + weakestPillar.slice(1)} pillar has no active goals. Start tracking it.`, action: `Go to ${weakestPillar}`, link: `/${weakestPillar}`, priority: 'high' },
    healthLogs.length === 0 && { icon: Activity, text: 'Log your first health entry to track fitness progress', action: 'Go to Health', link: '/health', priority: 'low' },
    investments.length === 0 && accounts.length === 0 && { icon: TrendingUp, text: 'Start tracking your finances in Wealth', action: 'Go to Wealth', link: '/wealth', priority: 'low' },
    isGovtAspirant && !careerProfile?.mock_test_score && { icon: Target, text: 'Add your mock test scores to track exam preparation', action: 'Go to Career', link: '/career', priority: 'medium' },
  ].filter(Boolean);

  const goalAlerts = goals.filter(g => g.target_date && !g.completed).map(g => {
    const daysLeft = Math.ceil((new Date(g.target_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { goal: g, daysLeft };
  }).filter(a => a.daysLeft > 0 && a.daysLeft <= 180).sort((a, b) => a.daysLeft - b.daysLeft);

  const priorities: Record<string, string> = { high: 'text-red-400', medium: 'text-wealth', low: 'text-[var(--text-secondary)]' };
  const priorityBgs: Record<string, string> = { high: 'bg-red-500/10 border-red-500/20', medium: 'bg-wealth/10 border-wealth/20', low: 'bg-[var(--bg-secondary)] border-[var(--border)]' };

  // Quick insight calculations
  const workoutStreak = calculateWorkoutStreak(healthLogs);
  const totalHabitStreak = habits.reduce((sum, h) => sum + (h.streak || 0), 0);
  const totalBusinessRevenue = businesses.reduce((sum, b) => sum + (b.monthly_revenue || 0), 0);

  const getMotivationalMessage = () => {
    if (climbScore >= 80) return "Exceptional! You're crushing it across all pillars. 🚀";
    if (climbScore >= 60) return "Great momentum! Keep building on your strengths. 📈";
    if (climbScore >= 40) return "Good foundation. Focus on your weakest pillar this week. 💪";
    if (climbScore >= 20) return "Every journey starts somewhere. Add goals to accelerate growth. 🎯";
    return "Welcome aboard! Set your first goals to begin your climb. 🌄";
  };

  const formatCurrency = useCallback((n: number) => {
    return `₹${n.toLocaleString('en-IN')}`;
  }, []);

  // Error state
  if (loadError) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto text-center">
        <div className="card p-8 max-w-md mx-auto">
          <p className="text-red-400 mb-4">Failed to load guide data</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)]" />
              <div>
                <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded-xl" />
                <div className="h-4 w-48 bg-[var(--bg-secondary)] rounded-xl mt-1" />
              </div>
            </div>
          </div>
          <div className="h-32 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            <div className="h-32 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
          </div>
          <div className="h-48 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-wealth/10 border border-wealth/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-wealth" />
          </div>
          <div>
            <h1 className="page-title">Guide</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {getGreeting()}, {profile?.name || 'there'}! {isNewUser ? 'Your personal mentor' : 'Your personal advisor'}
            </p>
          </div>
        </div>
        <button 
          onClick={refreshData} 
          disabled={refreshing}
          className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Climb Score Card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-wealth/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-wealth/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-wealth">{climbScore}</span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Your Climb Score
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)] max-w-md">{getMotivationalMessage()}</p>
            </div>
          </div>
          {totalHabitStreak > 0 && (
            <div className="text-right">
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 justify-end">
                <Flame className="w-3 h-3 text-orange-500" /> Total Streak
              </p>
              <p className="text-xl font-bold text-orange-500">{totalHabitStreak} <span className="text-sm">days</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Briefing */}
      <div className="card p-5 mb-6 border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-career" />
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Daily Briefing</h2>
          <span className="text-xs text-[var(--text-secondary)] ml-auto">
            {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          {isNewUser ? (
            <div className="space-y-2">
              <p className="text-[var(--text-primary)] leading-relaxed">
                Welcome to Climb, {profile?.name || 'there'}! 🎉 You're now the CEO of your own life.
              </p>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Start by setting your first long-term goals and daily tasks. The more data you add, 
                the more personalized your insights become.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[var(--text-secondary)]">
                You have <span className="text-[var(--text-primary)] font-medium">{goals.filter(g => !g.completed).length} active goal{goals.filter(g => !g.completed).length !== 1 ? 's' : ''}</span> across your life pillars.
              </p>
              {tasks.length > 0 && (
                <p className="text-[var(--text-secondary)]">
                  Today: <span className={`font-medium ${completionRate >= 80 ? 'text-health' : completionRate >= 50 ? 'text-wealth' : 'text-[var(--text-primary)]'}`}>
                    {completedTasks}/{tasks.length} tasks done
                  </span> — {completionRate}% completion rate.
                </p>
              )}
              {workoutStreak > 0 && (
                <p className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" /> Workout streak: {workoutStreak} day{workoutStreak !== 1 ? 's' : ''}!
                </p>
              )}
              {completionRate === 100 && tasks.length > 0 && (
                <p className="text-health font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> All tasks completed today. Excellent execution!
                </p>
              )}
              {primaryTrack && (
                <p className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-career" /> Primary focus: {primaryTrack.title}
                </p>
              )}
              {isGovtAspirant && careerProfile?.exam_name && (
                <p className="text-[var(--text-secondary)] flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-knowledge" /> Preparing for: {careerProfile.exam_name}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="card p-3 text-center">
          <Target className="w-4 h-4 text-knowledge mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{goals.filter(g => !g.completed).length}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Active Goals</p>
        </div>
        <div className="card p-3 text-center">
          <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{habits.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Active Habits</p>
        </div>
        <div className="card p-3 text-center">
          <Briefcase className="w-4 h-4 text-business mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{businesses.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Businesses</p>
        </div>
        <div className="card p-3 text-center">
          <DollarSign className="w-4 h-4 text-wealth mx-auto mb-1" />
          <p className="text-xl font-bold text-wealth">{formatCurrency(netWorth)}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Net Worth</p>
        </div>
        <div className="card p-3 text-center">
          <Activity className="w-4 h-4 text-health mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--text-primary)]">{workoutStreak}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Workout Streak</p>
        </div>
      </div>

      {/* Government Exam Preparation Section */}
      {isGovtAspirant && careerProfile?.exam_name && (
        <div className="card p-5 mb-6 border-knowledge/20 bg-knowledge/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-knowledge" />
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Exam Preparation</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Target Exam</p>
              <p className="font-semibold text-sm mt-1 text-[var(--text-primary)]">{careerProfile.exam_name}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Attempts</p>
              <p className="font-semibold text-lg mt-1 text-[var(--text-primary)]">{careerProfile.exam_attempts || 0}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Target Year</p>
              <p className="font-semibold text-sm mt-1 text-[var(--text-primary)]">{careerProfile.exam_expected_year || 'Not set'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Target Rank</p>
              <p className="font-semibold text-sm mt-1 text-[var(--text-primary)]">{careerProfile.rank_goal || 'Not set'}</p>
            </div>
          </div>
          
          {careerProfile.mock_test_score && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--text-secondary)]">Mock Test Performance</span>
                <span className="text-knowledge font-medium">{careerProfile.mock_test_score}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-knowledge" style={{ width: `${careerProfile.mock_test_score}%` }} />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                {careerProfile.mock_test_score >= 70 ? '🎯 Excellent! On track for success.' :
                 careerProfile.mock_test_score >= 50 ? '📈 Good progress. Keep practicing.' :
                 '📚 More practice needed. Focus on weak areas.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pillar Analysis */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {strongestPillar && (
          <div className={`card border p-4 ${pillarBgs[strongestPillar]}`}>
            <div className="flex items-center gap-2 mb-2">
              {pillarIcons[strongestPillar]}
              <TrendingUp className={`w-3 h-3 ${pillarColors[strongestPillar]}`} />
              <p className="text-xs text-[var(--text-secondary)] ml-auto">Strongest</p>
            </div>
            <p className={`text-lg font-bold capitalize ${pillarColors[strongestPillar]}`}>{strongestPillar}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{pillarGoalCounts[strongestPillar]} active goals</p>
          </div>
        )}
        {weakestPillar && (
          <div className="card p-4 border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              {pillarIcons[weakestPillar] || <AlertCircle className="w-3 h-3 text-red-400" />}
              <TrendingDown className="w-3 h-3 text-red-400" />
              <p className="text-xs text-[var(--text-secondary)] ml-auto">Needs Focus</p>
            </div>
            <p className="text-lg font-bold capitalize text-red-400">{weakestPillar}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">No active goals</p>
          </div>
        )}
      </div>

      {/* Daily Missions */}
      {missions.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <Target className="w-4 h-4 text-[var(--text-secondary)]" />
            Daily Missions
          </h2>
          <div className="space-y-3">
            {missions.slice(0, 4).map((mission: any, i) => {
              const MissionIcon = mission.icon;
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${priorityBgs[mission.priority]}`}>
                  <MissionIcon className={`w-4 h-4 flex-shrink-0 ${priorities[mission.priority]}`} />
                  <p className="text-sm flex-1 text-[var(--text-primary)]">{mission.text}</p>
                  <button 
                    onClick={() => window.location.href = mission.link}
                    className={`text-xs font-medium flex items-center gap-1 ${priorities[mission.priority]} hover:underline`}
                  >
                    {mission.action} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goal Deadlines */}
      {goalAlerts.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <AlertCircle className="w-4 h-4 text-[var(--text-secondary)]" />
            Goal Deadlines
          </h2>
          <div className="space-y-3">
            {goalAlerts.slice(0, 5).map(({ goal, daysLeft }) => {
              const start = goal.start_value || 0;
              const current = goal.current_value || 0;
              const target = goal.target_value || start;
              const pct = target > start ? Math.min(100, Math.round(((current - start) / (target - start)) * 100)) : 0;
              const urgency = daysLeft <= 7 ? 'text-red-400' : daysLeft <= 30 ? 'text-wealth' : 'text-[var(--text-secondary)]';
              const urgencyBg = daysLeft <= 7 ? 'bg-red-500/10' : daysLeft <= 30 ? 'bg-wealth/10' : 'bg-[var(--bg-secondary)]';
              
              return (
                <div key={goal.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{goal.title}</p>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${urgency} ${urgencyBg}`}>
                        <Clock className="w-3 h-3" />
                        {daysLeft}d left
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${pillarColors[goal.pillar]?.replace('text-', 'bg-') || 'bg-[var(--text-muted)]'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">{pct}% complete</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Business Insights */}
      {businesses.length > 0 && totalBusinessRevenue > 0 && (
        <div className="card p-5 mb-6 border-business/20 bg-business/5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-[var(--text-primary)]">
            <Briefcase className="w-4 h-4 text-business" />
            Business Insights
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Total Monthly Revenue</p>
              <p className="text-xl font-bold text-business">{formatCurrency(totalBusinessRevenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-secondary)]">Active Businesses</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{businesses.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="w-4 h-4 text-wealth" />
          Recommended Actions
        </h2>
        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          {isNewUser ? (
            <>
              <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">1.</span>Complete your profile in Settings</p>
              <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">2.</span>Add 3-5 long-term goals in the Planner</p>
              <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">3.</span>Log your first health entry in Health</p>
              <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">4.</span>Add your savings and investments in Wealth</p>
              <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">5.</span>Track your first skill in Knowledge</p>
            </>
          ) : (
            <>
              {completionRate < 80 && tasks.length > 0 && (
                <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">•</span>Focus on completing today's tasks before adding new ones</p>
              )}
              {goals.filter(g => !g.completed).length < 5 && (
                <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">•</span>Add more goals to build a complete life roadmap</p>
              )}
              {weakestPillar && (
                <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">•</span>Set goals for your <span className="text-[var(--text-primary)] capitalize">{weakestPillar}</span> pillar</p>
              )}
              {habits.length < 3 && (
                <p className="flex items-start gap-2"><span className="text-wealth mt-0.5">•</span>Create daily habits to build consistency</p>
              )}
              {goalAlerts.length > 0 && goalAlerts[0].daysLeft <= 30 && (
                <p className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">⚠️</span>
                  <span className="text-red-400">Urgent: "{goalAlerts[0].goal.title}" deadline in {goalAlerts[0].daysLeft} days</span>
                </p>
              )}
              {workoutStreak === 0 && healthLogs.length > 0 && (
                <p className="flex items-start gap-2"><span className="text-health mt-0.5">•</span>Log a workout today to start a streak!</p>
              )}
              {isGovtAspirant && !careerProfile?.mock_test_score && (
                <p className="flex items-start gap-2"><span className="text-knowledge mt-0.5">•</span>Add your mock test scores to track exam progress</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="text-center py-4">
        <p className="text-xs text-[var(--text-secondary)] italic">
          {climbScore >= 80 ? "🏆 Consistency beats intensity. Keep climbing!" :
           climbScore >= 60 ? "📈 Small daily improvements lead to extraordinary results." :
           climbScore >= 40 ? "🌱 The best time to start was yesterday. The second best time is now." :
           "🚀 Your future self will thank you for starting today."}
        </p>
      </div>
    </div>
  );
}

// Helper function to calculate workout streak
function calculateWorkoutStreak(logs: HealthLog[]): number {
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const sortedLogs = [...logs].sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    if (!log.workout_done) break;
    
    const logDate = new Date(log.log_date);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (logDate.toDateString() === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}