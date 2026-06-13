import { useEffect, useState } from 'react';
import { Heart, BookOpen, Briefcase, DollarSign, Building2, Target, CheckSquare, TrendingUp, Zap, ArrowRight, Plus, GraduationCap, Layers, Calendar, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Goal, Task, CareerTrack, CareerProfile } from '../types';
import type { AppPage } from '../components/AppLayout';

interface DashboardProps {
  onNavigate: (page: AppPage) => void;
}

const pillars = [
  { id: 'health', label: 'Health', icon: Heart, color: 'text-health', bg: 'bg-health/10 border-health/20' },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen, color: 'text-knowledge', bg: 'bg-knowledge/10 border-knowledge/20' },
  { id: 'career', label: 'Career', icon: Briefcase, color: 'text-career', bg: 'bg-career/10 border-career/20' },
  { id: 'wealth', label: 'Wealth', icon: DollarSign, color: 'text-wealth', bg: 'bg-wealth/10 border-wealth/20' },
  { id: 'business', label: 'Business', icon: Building2, color: 'text-business', bg: 'bg-business/10 border-business/20' },
];

function getPillarColor(pillar: string) {
  const map: Record<string, string> = {
    health: 'bg-health', knowledge: 'bg-knowledge', career: 'bg-career',
    wealth: 'bg-wealth', business: 'bg-business', personal: 'bg-[var(--text-secondary)]',
  };
  return map[pillar] || 'bg-[var(--text-muted)]';
}

function getPillarText(pillar: string) {
  const map: Record<string, string> = {
    health: 'text-health', knowledge: 'text-knowledge', career: 'text-career',
    wealth: 'text-wealth', business: 'text-business', personal: 'text-[var(--text-secondary)]',
  };
  return map[pillar] || 'text-[var(--text-muted)]';
}

// Helper function for safe query with retry
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

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [netWorth, setNetWorth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setLoadError(false);
        const today = new Date().toISOString().split('T')[0];
        
        // Group 1: Goals and Tasks (most important)
        const [goalsRes, tasksRes] = await safeQuery(async () => Promise.all([
          supabase.from('goals').select('*').eq('user_id', user.id).eq('completed', false).order('created_at', { ascending: false }).limit(8),
          supabase.from('tasks').select('*').eq('user_id', user.id).or(`due_date.eq.${today},due_date.is.null`).order('created_at', { ascending: false }),
        ]));
        
        // Group 2: Career data
        const [tracksRes, profileRes] = await safeQuery(async () => Promise.all([
          supabase.from('career_tracks').select('*').eq('user_id', user.id).order('priority', { ascending: false }),
          supabase.from('career_profile').select('*').eq('id', user.id).maybeSingle(),
        ]));
        
        // Group 3: Financial data (accounts, assets, investments, liabilities, loans)
        const [accountsRes, assetsRes, investmentsRes, liabilitiesRes, loansRes] = await safeQuery(async () => Promise.all([
          supabase.from('accounts').select('balance').eq('user_id', user.id),
          supabase.from('assets').select('value').eq('user_id', user.id),
          supabase.from('investments').select('current_value').eq('user_id', user.id),
          supabase.from('liabilities').select('amount').eq('user_id', user.id),
          supabase.from('loans').select('type, remaining_amount').eq('user_id', user.id),
        ]));

        setGoals((goalsRes.data || []) as Goal[]);
        setTasks((tasksRes.data || []) as Task[]);
        setTracks((tracksRes.data || []) as CareerTrack[]);
        setCareerProfile((profileRes.data || null) as CareerProfile | null);

        // Calculate Net Worth consistently with Wealth page
        const totalCash = (accountsRes.data || []).reduce((s: number, a: any) => s + (a.balance || 0), 0);
        const totalAssetsValue = (assetsRes.data || []).reduce((s: number, a: any) => s + (a.value || 0), 0);
        const totalInvestments = (investmentsRes.data || []).reduce((s: number, a: any) => s + (a.current_value || 0), 0);
        const totalLiabilitiesValue = (liabilitiesRes.data || []).reduce((s: number, l: any) => s + (l.amount || 0), 0);
        
        const totalLent = (loansRes.data || [])
          .filter((l: any) => l.type === 'lent')
          .reduce((s: number, l: any) => s + (l.remaining_amount || 0), 0);
        const totalBorrowed = (loansRes.data || [])
          .filter((l: any) => l.type === 'borrowed')
          .reduce((s: number, l: any) => s + (l.remaining_amount || 0), 0);
        
        const netWorthCalc = totalCash + totalAssetsValue + totalInvestments + totalLent - totalLiabilitiesValue - totalBorrowed;
        setNetWorth(netWorthCalc);
        
      } catch (err) {
        console.error('Load error:', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const todayTasks = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return !t.due_date || t.due_date === today;
  });
  const completedToday = todayTasks.filter(t => t.completed).length;
  const completionPct = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  // Calculate goal progress
  const calculateGoalProgress = (goal: Goal): number => {
    const start = goal.start_value || 0;
    const current = goal.current_value || 0;
    const target = goal.target_value || 0;
    if (!target || target === start) return 0;
    return Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100));
  };

  const pillarScores: Record<string, number[]> = {};
  goals.forEach(goal => {
    if (!pillarScores[goal.pillar]) pillarScores[goal.pillar] = [];
    pillarScores[goal.pillar].push(calculateGoalProgress(goal));
  });

  const activePillarScores = Object.values(pillarScores)
    .map(scores => scores.reduce((a, b) => a + b, 0) / scores.length);

  const climbScore = activePillarScores.length >= 2
    ? Math.round(activePillarScores.reduce((a, b) => a + b, 0) / activePillarScores.length)
    : null;

  const formatCurrency = (n: number) => {
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const firstName = profile?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Check if user is a government aspirant
  const isGovtAspirant = careerProfile?.career_type === 'government_aspirant';
  
  // Get primary and secondary tracks
  const primaryTrack = tracks.find(t => t.priority === 'primary');
  const secondaryTracks = tracks.filter(t => t.priority === 'secondary');
  const govtTrack = tracks.find(t => t.type === 'government_exam');

  if (loadError) {
    return (
      <div className="p-6 md:p-8 text-center">
        <div className="card p-8 max-w-md mx-auto">
          <p className="text-red-400 mb-4">Failed to load dashboard data</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-[var(--bg-secondary)] rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-[var(--text-secondary)] mb-1">{greeting},</p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{firstName}</h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Climb Score</p>
          {climbScore === null ? (
            <>
              <p className="text-2xl font-bold text-[var(--text-muted)]">—</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Not enough data yet</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{climbScore}</p>
              <p className="text-xs text-health mt-1">Average of {activePillarScores.length} pillars</p>
            </>
          )}
        </div>

        <div className="card p-5">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Net Worth</p>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-wealth' : 'text-red-400'}`}>
            {formatCurrency(netWorth)}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Assets + Lent - Liabilities - Borrowed</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Today's Tasks</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{completedToday}/{todayTasks.length}</p>
          <div className="progress-bar mt-2">
            <div className="progress-fill bg-career" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Active Goals</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{goals.length}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {goals.length === 0 ? 'Set your first goal' : `${goals.filter(g => (g.current_value || 0) > 0).length} in progress`}
          </p>
        </div>
      </div>

      {/* Career Tracks Summary */}
      {tracks.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-career" />
            <h3 className="font-semibold text-sm">Your Career Journey</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryTrack && (
              <div className="p-4 rounded-xl bg-career/5 border border-career/20">
                <div className="flex items-center gap-2 mb-2">
                  {primaryTrack.type === 'job' && <Briefcase className="w-4 h-4 text-career" />}
                  {primaryTrack.type === 'government_exam' && <GraduationCap className="w-4 h-4 text-knowledge" />}
                  {primaryTrack.type === 'business' && <Building2 className="w-4 h-4 text-business" />}
                  <p className="font-medium text-sm">🎯 Primary Focus</p>
                </div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{primaryTrack.title}</p>
                {primaryTrack.company_or_exam && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{primaryTrack.company_or_exam}</p>
                )}
                {primaryTrack.target_date && (
                  <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Target: {new Date(primaryTrack.target_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            {secondaryTracks.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-[var(--text-secondary)]" />
                  <p className="font-medium text-sm">🔄 Backup / Parallel Tracks</p>
                </div>
                <div className="space-y-2">
                  {secondaryTracks.slice(0, 2).map(track => (
                    <div key={track.id} className="flex items-center gap-2">
                      {track.type === 'job' && <Briefcase className="w-3 h-3 text-career" />}
                      {track.type === 'government_exam' && <GraduationCap className="w-3 h-3 text-knowledge" />}
                      {track.type === 'business' && <Building2 className="w-3 h-3 text-business" />}
                      <p className="text-sm">{track.title}</p>
                    </div>
                  ))}
                  {secondaryTracks.length > 2 && (
                    <p className="text-xs text-[var(--text-secondary)]">+{secondaryTracks.length - 2} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Government Exam Preparation Section */}
      {isGovtAspirant && careerProfile && careerProfile.exam_name && (
        <div className="card p-5 mb-6 border-knowledge/20 bg-knowledge/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-knowledge" />
              <h3 className="font-semibold text-sm">Government Exam Preparation</h3>
            </div>
            <button 
              onClick={() => onNavigate('career')} 
              className="text-xs text-knowledge hover:underline flex items-center gap-1"
            >
              Update Progress <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Target Exam</p>
              <p className="font-semibold text-sm mt-1">{careerProfile.exam_name}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Attempts</p>
              <p className="font-semibold text-lg mt-1">{careerProfile.exam_attempts || 0}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Target Year</p>
              <p className="font-semibold text-sm mt-1">{careerProfile.exam_expected_year || 'Not set'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-secondary)]">Target Rank</p>
              <p className="font-semibold text-sm mt-1">{careerProfile.rank_goal || 'Not set'}</p>
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
          
          {careerProfile.coaching && (
            <p className="text-xs text-[var(--text-secondary)] mt-3 flex items-center gap-1">
              <Award className="w-3 h-3" /> Coaching: {careerProfile.coaching}
            </p>
          )}
        </div>
      )}

      {/* Pillar Scores */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {pillars.map(({ id, label, icon: Icon, color, bg }) => {
          const pillarGoals = goals.filter(g => g.pillar === id);
          const scores = pillarGoals.map(g => calculateGoalProgress(g));
          const pillarScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id as AppPage)}
              className={`card border p-4 text-center transition-all hover:-translate-y-0.5 duration-150 ${bg}`}
            >
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <p className="text-xs font-medium mb-1 text-[var(--text-primary)]">{label}</p>
              <p className={`text-lg font-bold ${pillarScore !== null ? color : 'text-[var(--text-muted)]'}`}>
                {pillarScore !== null ? pillarScore : '—'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Long-Term Goals */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">Long-Term Goals</h2>
            </div>
            <button onClick={() => onNavigate('planner')} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
              Add <Plus className="w-3 h-3" />
            </button>
          </div>
          {goals.length === 0 ? (
            <div className="text-center py-10">
              <Target className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)] mb-3">No goals yet</p>
              <button onClick={() => onNavigate('planner')} className="btn-secondary text-xs px-4 py-2">Set First Goal</button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 6).map(goal => {
                const pct = calculateGoalProgress(goal);
                const targetValue = goal.target_value || 0;
                return (
                  <div key={goal.id} className="flex items-center gap-4">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPillarColor(goal.pillar)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate text-[var(--text-primary)]">{goal.title}</p>
                        <span className="text-xs text-[var(--text-secondary)] ml-2 flex-shrink-0">
                          {goal.start_value} → {goal.current_value} / {targetValue} {goal.unit}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${getPillarColor(goal.pillar)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${getPillarText(goal.pillar)}`}>{Math.round(pct)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Focus */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">Today's Focus</h2>
            </div>
            <button onClick={() => onNavigate('planner')} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <div className="text-center py-10">
              <CheckSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)] mb-3">No tasks today</p>
              <button onClick={() => onNavigate('planner')} className="btn-secondary text-xs px-4 py-2">Add Task</button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map(task => (
                <div key={task.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${task.completed ? 'opacity-50' : 'hover:bg-[var(--bg-secondary)]'}`}>
                  <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-health border-health' : 'border-[var(--border)]'}`}>
                    {task.completed && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                  </div>
                  <p className={`text-sm truncate ${task.completed ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{task.title}</p>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto ${getPillarColor(task.category)}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exam Preparation Quick Tip */}
      {isGovtAspirant && govtTrack && !careerProfile?.mock_test_score && (
        <div className="mt-6 card p-4 border-knowledge/20 bg-knowledge/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-knowledge/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-knowledge" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Exam Prep Tip</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Add your mock test scores in Career profile to track your preparation progress and get personalized insights.
              </p>
            </div>
            <button onClick={() => onNavigate('career')} className="text-xs text-knowledge hover:underline flex items-center gap-1">
              Add Score <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Guide Insight */}
      <div className="mt-6 card p-5 border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-wealth" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Guide Insight</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {goals.length === 0 && tasks.length === 0
                ? 'Start by setting your first long-term goal to unlock personalized insights.'
                : isGovtAspirant && careerProfile?.exam_name
                ? `You're preparing for ${careerProfile.exam_name}. ${careerProfile.mock_test_score ? `Your last mock score: ${careerProfile.mock_test_score}%. ` : ''}${tracks.length > 1 ? `You have ${tracks.length} career tracks. Balance your time wisely.` : 'Stay consistent with your daily study plan.'}`
                : goals.length < 3
                ? `You have ${goals.length} active goal${goals.length === 1 ? '' : 's'}. Add more goals to get a complete picture of your progress.`
                : `Completion rate today: ${completionPct}%. ${completionPct >= 80 ? 'Excellent work!' : completionPct >= 50 ? 'Good progress. Keep pushing.' : 'Focus on your top priorities first.'}`}
            </p>
          </div>
          <button onClick={() => onNavigate('guide')} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 flex-shrink-0">
            Full Guide <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}