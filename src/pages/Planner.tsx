import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Plus, Check, Trash2, Calendar, Tag, ChevronRight, Edit3, RotateCcw, 
  History, Target, Flame, Activity, X, Save, AlertCircle, TrendingUp,
  Repeat, FileText, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Task, Routine, RoutineLog, Goal, GoalActivity, TaskHistoryRecord, Habit, HabitLog } from '../types';

const categories = [
  { id: 'health', label: 'Health', color: 'text-health', dot: 'bg-health' },
  { id: 'knowledge', label: 'Knowledge', color: 'text-knowledge', dot: 'bg-knowledge' },
  { id: 'career', label: 'Career', color: 'text-career', dot: 'bg-career' },
  { id: 'wealth', label: 'Wealth', color: 'text-wealth', dot: 'bg-wealth' },
  { id: 'business', label: 'Business', color: 'text-business', dot: 'bg-business' },
  { id: 'personal', label: 'Personal', color: 'text-[var(--text-secondary)]', dot: 'bg-[var(--text-secondary)]' },
];

type Tab = 'tasks' | 'routines' | 'habits' | 'goals' | 'history';

// Cache for planner data
let plannerCache: { 
  tasks: Task[]; 
  routines: Routine[]; 
  habits: Habit[]; 
  goals: Goal[];
  timestamp: number;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Planner() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [history, setHistory] = useState<TaskHistoryRecord[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showGoalActivityHistory, setShowGoalActivityHistory] = useState<string | null>(null);
  const [goalActivities, setGoalActivities] = useState<GoalActivity[]>([]);

  // Task/Routine/Habit form
  const [itemTitle, setItemTitle] = useState('');
  const [itemCat, setItemCat] = useState('personal');
  const [itemDate, setItemDate] = useState('');
  const [itemPriority, setItemPriority] = useState('medium');
  const [itemDesc, setItemDesc] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalPillar, setGoalPillar] = useState('health');
  const [goalStart, setGoalStart] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalUnit, setGoalUnit] = useState('');
  const [goalDate, setGoalDate] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [selectedRoutineDate, setSelectedRoutineDate] = useState(today);
  const [selectedHabitDate, setSelectedHabitDate] = useState(today);
  const loadingRef = useRef(false);

  // Warm up Supabase connection
  useEffect(() => {
    const warmupConnection = async () => {
      if (user) {
        try {
          await supabase.from('tasks').select('count', { count: 'exact', head: true });
          console.log('Supabase connection ready for Planner');
        } catch (err) {
          console.log('Connection warmup failed');
        }
      }
    };
    warmupConnection();
  }, [user]);

  // Load all data with caching
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    // Check cache
    if (!forceRefresh && plannerCache && (Date.now() - plannerCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached planner data');
      setTasks(plannerCache.tasks);
      setRoutines(plannerCache.routines);
      setHabits(plannerCache.habits);
      setGoals(plannerCache.goals);
      setLoading(false);
      setInitialLoadDone(true);
      return;
    }
    
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setLoading(true);
    try {
      const [t, r, h, g, hist, rl, hl] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('routines').select('*').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(50),
        supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('task_history').select('*').eq('user_id', user.id).order('completed_date', { ascending: false }).limit(100),
        supabase.from('routine_logs').select('*').eq('user_id', user.id).order('logged_date', { ascending: false }).limit(100),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).order('logged_date', { ascending: false }).limit(200),
      ]);
      
      const tasksData = (t.data || []) as Task[];
      const routinesData = (r.data || []) as Routine[];
      const habitsData = (h.data || []) as Habit[];
      const goalsData = (g.data || []) as Goal[];
      const historyData = (hist.data || []) as TaskHistoryRecord[];
      const routineLogsData = (rl.data || []) as RoutineLog[];
      const habitLogsData = (hl.data || []) as HabitLog[];
      
      setTasks(tasksData);
      setRoutines(routinesData);
      setHabits(habitsData);
      setGoals(goalsData);
      setHistory(historyData);
      setRoutineLogs(routineLogsData);
      setHabitLogs(habitLogsData);
      
      plannerCache = {
        tasks: tasksData,
        routines: routinesData,
        habits: habitsData,
        goals: goalsData,
        timestamp: Date.now()
      };
      
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
      loadingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user && !initialLoadDone) {
      loadAllData();
    }
  }, [user, loadAllData, initialLoadDone]);

  // Reset form
  const resetForm = () => {
    setItemTitle('');
    setItemCat('personal');
    setItemDate('');
    setItemPriority('medium');
    setItemDesc('');
    setItemNotes('');
    setShowAddForm(false);
  };

  // TASK CRUD
  const toggleTask = async (task: Task) => {
    if (!user) return;
    
    const newCompleted = !task.completed;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          completed: newCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setTasks(prev => prev.map(t => t.id === task.id ? data as Task : t));
        plannerCache = null;
      }
      
      if (newCompleted) {
        const { data: existing } = await supabase
          .from('task_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', task.title)
          .eq('completed_date', today)
          .maybeSingle();
        
        if (!existing) {
          await supabase.from('task_history').insert({
            user_id: user.id,
            title: task.title,
            category: task.category,
            priority: task.priority,
            completed_date: today,
            due_date: task.due_date,
            created_date: new Date(task.created_at).toISOString().split('T')[0],
          });
        }
        
        const { data: hist } = await supabase
          .from('task_history')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_date', { ascending: false })
          .limit(100);
        
        setHistory((hist || []) as TaskHistoryRecord[]);
      }
    } catch (err: any) {
      console.error('Toggle task error:', err);
      alert(`Failed to update task: ${err.message}`);
    }
  };
  
  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
      plannerCache = null;
    } catch (err: any) {
      alert(`Failed to delete task: ${err.message}`);
    }
  };
  
  const deleteTaskHistory = async (id: string) => {
    try {
      const { error } = await supabase.from('task_history').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(record => record.id !== id));
    } catch (err: any) {
      alert(`Failed to delete history: ${err.message}`);
    }
  };
  
  const addTask = async () => {
    if (!itemTitle.trim() || !user) return;
    if (saving) return;
    
    setSaving(true);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: itemTitle.trim(),
            category: itemCat,
            due_date: itemDate || null,
            priority: itemPriority.toLowerCase(),
            completed: false,
            notes: itemNotes || '',
            recurring: null,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setTasks(prev => [data as Task, ...prev]);
          plannerCache = null;
          resetForm();
          setSaving(false);
          return;
        }
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Task not added: ${err.message}`);
        }
      }
    }
    setSaving(false);
  };

  // ROUTINE CRUD
  const toggleRoutine = async (routine: Routine) => {
    if (!user) return;
    
    try {
      const existing = routineLogs.find(
        log => log.routine_id === routine.id && log.logged_date === selectedRoutineDate
      );
      
      if (existing) {
        const { error } = await supabase.from('routine_logs').delete().eq('id', existing.id);
        if (error) throw error;
        setRoutineLogs(prev => prev.filter(log => log.id !== existing.id));
      } else {
        const { data, error } = await supabase
          .from('routine_logs')
          .insert({
            routine_id: routine.id,
            user_id: user.id,
            logged_date: selectedRoutineDate,
            completed: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setRoutineLogs(prev => [data as RoutineLog, ...prev]);
        }
      }
    } catch (err: any) {
      console.error('Toggle routine error:', err);
      alert(`Failed to update routine: ${err.message}`);
    }
  };
  
  const deleteRoutine = async (id: string) => {
    if (!confirm('Delete this routine?')) return;
    
    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      setRoutines(prev => prev.filter(r => r.id !== id));
      plannerCache = null;
    } catch (err: any) {
      alert(`Failed to delete routine: ${err.message}`);
    }
  };
  
  const addRoutine = async () => {
    if (!itemTitle.trim() || !user) return;
    if (saving) return;
    
    setSaving(true);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase
          .from('routines')
          .insert({
            user_id: user.id,
            title: itemTitle.trim(),
            description: itemDesc?.trim() || '',
            category: itemCat.toLowerCase(),
            active: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setRoutines(prev => [data as Routine, ...prev]);
          plannerCache = null;
          resetForm();
          setSaving(false);
          return;
        }
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Routine not added: ${err.message}`);
        }
      }
    }
    setSaving(false);
  };

  // HABIT CRUD
  const toggleHabit = async (habit: Habit, date: string) => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const existingLog = habitLogs.find(
        log => log.habit_id === habit.id && log.logged_date === date
      );
      
      if (existingLog) {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('id', existingLog.id);
        
        if (error) throw error;
        
        const newHabitLogs = habitLogs.filter(log => log.id !== existingLog.id);
        setHabitLogs(newHabitLogs);
        await updateHabitStreak(habit.id, newHabitLogs);
      } else {
        const { data, error } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habit.id,
            user_id: user.id,
            logged_date: date,
            completed: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
          const newHabitLogs = [data as HabitLog, ...habitLogs];
          setHabitLogs(newHabitLogs);
          await updateHabitStreak(habit.id, newHabitLogs);
        }
      }
    } catch (err: any) {
      console.error('Toggle habit error:', err);
      alert(`Failed to update habit: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateHabitStreak = async (habitId: string, currentLogs: HabitLog[]) => {
    if (!user) return;
    
    const habitLogsList = currentLogs.filter(log => log.habit_id === habitId);
    
    if (habitLogsList.length === 0) {
      const { error } = await supabase
        .from('habits')
        .update({ streak: 0, best_streak: 0 })
        .eq('id', habitId);
      
      if (!error) {
        setHabits(prev => prev.map(h => 
          h.id === habitId ? { ...h, streak: 0, best_streak: 0 } : h
        ));
      }
      return;
    }
    
    const sortedLogs = [...habitLogsList].sort((a, b) => 
      new Date(a.logged_date).getTime() - new Date(b.logged_date).getTime()
    );
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 1;
    
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      const currentDate = new Date(sortedLogs[i].logged_date);
      currentDate.setHours(0, 0, 0, 0);
      
      if (i === sortedLogs.length - 1) {
        currentStreak = 1;
        tempStreak = 1;
        continue;
      }
      
      const nextDate = new Date(sortedLogs[i + 1].logged_date);
      nextDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > currentStreak) currentStreak = tempStreak;
      } else {
        break;
      }
    }
    
    let tempBest = 0;
    let count = 1;
    for (let i = sortedLogs.length - 1; i > 0; i--) {
      const currentDate = new Date(sortedLogs[i].logged_date);
      const prevDate = new Date(sortedLogs[i - 1].logged_date);
      
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        count++;
        if (count > tempBest) tempBest = count;
      } else {
        count = 1;
      }
    }
    bestStreak = Math.max(tempBest, currentStreak);
    
    const { error } = await supabase
      .from('habits')
      .update({ 
        streak: currentStreak,
        best_streak: bestStreak,
        updated_at: new Date().toISOString()
      })
      .eq('id', habitId);
    
    if (!error) {
      setHabits(prev => prev.map(h => 
        h.id === habitId 
          ? { ...h, streak: currentStreak, best_streak: bestStreak }
          : h
      ));
    }
  };

  const isHabitCompleted = (habitId: string, date: string): boolean => {
    return habitLogs.some(
      log => log.habit_id === habitId && log.logged_date === date
    );
  };

  const getHabitCompletionRate = (habitId: string, days: number = 7): number => {
    const habitCompletions = habitLogs.filter(log => log.habit_id === habitId);
    if (habitCompletions.length === 0) return 0;
    
    const lastNDays = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      lastNDays.push(dateStr);
    }
    
    const completedCount = habitCompletions.filter(log => 
      lastNDays.includes(log.logged_date)
    ).length;
    
    return Math.round((completedCount / days) * 100);
  };
  
  const deleteHabit = async (id: string) => {
    if (!confirm('Delete this habit? This will delete all history.')) return;
    
    try {
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
      setHabits(prev => prev.filter(h => h.id !== id));
      setHabitLogs(prev => prev.filter(log => log.habit_id !== id));
      plannerCache = null;
    } catch (err: any) {
      alert(`Failed to delete habit: ${err.message}`);
    }
  };
  
  const addHabit = async () => {
    if (!itemTitle.trim()) {
      alert('Please enter a habit name');
      return;
    }
    
    if (!user) {
      alert('Please log in');
      return;
    }
    
    if (saving) return;
    
    setSaving(true);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase
          .from('habits')
          .insert({
            user_id: user.id,
            title: itemTitle.trim(),
            category: itemCat.toLowerCase(),
            streak: 0,
            best_streak: 0,
            active: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
          const newHabit = data as Habit;
          setHabits(prev => [newHabit, ...prev]);
          plannerCache = null;
          resetForm();
          setSaving(false);
          return;
        }
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Failed to add habit: ${err.message || 'Unknown error'}`);
        }
      }
    }
    setSaving(false);
  };

  // GOAL CRUD
  const addGoal = async () => {
    if (!goalTitle.trim() || !user) return;
    if (saving) return;
    
    setSaving(true);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const start = goalStart ? parseFloat(goalStart) : 0;
        const current = goalCurrent ? parseFloat(goalCurrent) : start;
        const target = goalTarget ? parseFloat(goalTarget) : null;
        
        const payload = {
          user_id: user.id,
          title: goalTitle.trim(),
          pillar: goalPillar,
          start_value: start,
          current_value: current,
          target_value: target,
          unit: goalUnit,
          target_date: goalDate || null,
          completed: false,
        };
        
        if (editingGoal) {
          const { data, error } = await supabase
            .from('goals')
            .update(payload)
            .eq('id', editingGoal.id)
            .select()
            .single();
          
          if (error) throw error;
          if (data) setGoals(prev => prev.map(g => g.id === editingGoal.id ? data as Goal : g));
        } else {
          const { data, error } = await supabase
            .from('goals')
            .insert(payload)
            .select()
            .single();
          
          if (error) throw error;
          if (data) {
            const newGoal = data as Goal;
            setGoals(prev => [newGoal, ...prev]);
            plannerCache = null;
            
            await supabase.from('goal_activity').insert({
              goal_id: newGoal.id,
              user_id: user.id,
              value: current,
              activity_date: today,
              notes: null,
            });
          }
        }
        
        setGoalTitle('');
        setGoalStart('');
        setGoalCurrent('');
        setGoalTarget('');
        setGoalUnit('');
        setGoalDate('');
        setEditingGoal(null);
        setShowGoalForm(false);
        setSaving(false);
        return;
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Failed to ${editingGoal ? 'update' : 'add'} goal: ${err.message}`);
        }
      }
    }
    setSaving(false);
  };
  
  const updateGoalProgress = async (goal: Goal, newValue: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .update({ 
          current_value: newValue, 
          updated_at: new Date().toISOString(),
          completed: newValue >= (goal.target_value || 0)
        })
        .eq('id', goal.id)
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setGoals(prev => prev.map(g => g.id === goal.id ? data as Goal : g));
        plannerCache = null;
        
        await supabase.from('goal_activity').insert({
          goal_id: goal.id,
          user_id: user.id,
          value: newValue,
          activity_date: today,
          notes: null,
        });
      }
    } catch (err: any) {
      console.error('Update progress error:', err);
      alert(`Failed to update progress: ${err.message}`);
    }
  };
  
  const toggleGoalComplete = async (goal: Goal) => {
    const newCompleted = !goal.completed;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .update({ completed: newCompleted })
        .eq('id', goal.id)
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setGoals(prev => prev.map(g => g.id === goal.id ? data as Goal : g));
        plannerCache = null;
      }
    } catch (err: any) {
      console.error('Toggle goal error:', err);
      alert(`Failed to update goal: ${err.message}`);
    }
  };
  
  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
      plannerCache = null;
    } catch (err: any) {
      alert(`Failed to delete goal: ${err.message}`);
    }
  };
  
  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalPillar(goal.pillar);
    setGoalStart(goal.start_value?.toString() || '');
    setGoalCurrent(goal.current_value?.toString() || '');
    setGoalTarget(goal.target_value?.toString() || '');
    setGoalUnit(goal.unit || '');
    setGoalDate(goal.target_date || '');
    setShowGoalForm(true);
  };
  
  const loadGoalActivity = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from('goal_activity')
        .select('*')
        .eq('goal_id', goalId)
        .order('activity_date', { ascending: false });
      
      if (error) throw error;
      setGoalActivities((data || []) as GoalActivity[]);
      setShowGoalActivityHistory(goalId);
    } catch (err: any) {
      console.error('Load activity error:', err);
      alert(`Failed to load activity: ${err.message}`);
    }
  };

  // Helper functions
  const getCatDot = (cat: string) => categories.find(c => c.id === cat)?.dot || 'bg-[var(--text-muted)]';
  const getCatColor = (cat: string) => categories.find(c => c.id === cat)?.color || 'text-[var(--text-secondary)]';
  
  const todayTasks = tasks.filter(t => !t.due_date || t.due_date === today);
  const otherTasks = tasks.filter(t => t.due_date && t.due_date !== today);
  
  const completedRoutines = routineLogs.filter(
    log => log.logged_date === selectedRoutineDate && log.completed
  ).length;
  const totalRoutines = routines.length;
  const routineProgress = totalRoutines > 0 ? Math.round((completedRoutines / totalRoutines) * 100) : 0;
  
  const getGoalProgress = (goal: Goal) => {
    const start = goal.start_value || 0;
    const current = goal.current_value || 0;
    const target = goal.target_value || start;
    if (target === start) return 0;
    const progress = ((current - start) / (target - start)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const handleAddClick = () => {
    setItemTitle('');
    setItemDesc('');
    setItemNotes('');
    setItemCat('personal');
    setItemDate('');
    setItemPriority('medium');
    setShowAddForm(true);
  };

  // Loading skeleton
  if (loading && !initialLoadDone) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-xl" />
          <div className="h-10 bg-[var(--bg-secondary)] rounded-xl w-64" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]" />
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
        <h1 className="page-title">Planner</h1>
        <div className="flex items-center gap-2">
          {tab === 'tasks' && (
            <button onClick={handleAddClick} className="btn-primary flex items-center gap-2 py-2 px-4">
              <Plus className="w-4 h-4" /> Task
            </button>
          )}
          {tab === 'routines' && (
            <button onClick={handleAddClick} className="btn-primary flex items-center gap-2 py-2 px-4">
              <Plus className="w-4 h-4" /> Routine
            </button>
          )}
          {tab === 'habits' && (
            <button onClick={handleAddClick} className="btn-primary flex items-center gap-2 py-2 px-4">
              <Plus className="w-4 h-4" /> Habit
            </button>
          )}
          {tab === 'goals' && (
            <button onClick={() => { setEditingGoal(null); setShowGoalForm(true); }} className="btn-primary flex items-center gap-2 py-2 px-4">
              <Plus className="w-4 h-4" /> Goal
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 mb-6">
        {(['tasks', 'routines', 'habits', 'goals', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all flex items-center gap-2 ${
              tab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'tasks' && <Check className="w-4 h-4" />}
            {t === 'routines' && <RotateCcw className="w-4 h-4" />}
            {t === 'habits' && <Flame className="w-4 h-4" />}
            {t === 'goals' && <Target className="w-4 h-4" />}
            {t === 'history' && <History className="w-4 h-4" />}
            {t}
          </button>
        ))}
      </div>

      {/* TASKS TAB */}
      {tab === 'tasks' && (
        <div className="space-y-6">
          {showAddForm && (
            <div className="card p-4 animate-slide-up">
              <h3 className="font-medium text-sm mb-3 text-[var(--text-primary)]">Add New Task</h3>
              <div className="space-y-3">
                <input
                  value={itemTitle}
                  onChange={e => setItemTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Task title..."
                  className="input-base"
                  autoFocus
                />
                <textarea
                  value={itemNotes}
                  onChange={e => setItemNotes(e.target.value)}
                  placeholder="Notes (optional)..."
                  className="input-base min-h-[60px]"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <select value={itemCat} onChange={e => setItemCat(e.target.value)} className="input-base">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <input type="date" value={itemDate} onChange={e => setItemDate(e.target.value)} className="input-base" />
                  <select value={itemPriority} onChange={e => setItemPriority(e.target.value)} className="input-base">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={addTask} disabled={saving} className="btn-primary py-2 px-4">
                    {saving ? 'Adding...' : 'Add Task'}
                  </button>
                  <button onClick={resetForm} className="btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {todayTasks.length > 0 && (
            <div>
              <p className="section-header mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Today's Tasks
              </p>
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    getCatDot={getCatDot}
                  />
                ))}
              </div>
            </div>
          )}

          {otherTasks.length > 0 && (
            <div>
              <p className="section-header mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming
              </p>
              <div className="space-y-2">
                {otherTasks.slice(0, 20).map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    getCatDot={getCatDot}
                  />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && !showAddForm && (
            <EmptyState icon={Check} text="No tasks yet. Add your first task." />
          )}
        </div>
      )}

      {/* ROUTINES TAB */}
      {tab === 'routines' && (
        <div className="space-y-4">
          <div className="card p-4">
            <label className="text-xs text-[var(--text-secondary)] block mb-2">Select Date</label>
            <input
              type="date"
              value={selectedRoutineDate}
              onChange={(e) => setSelectedRoutineDate(e.target.value)}
              className="input-base"
            />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Today's Routine Progress</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Complete your fixed daily actions before the day ends.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-knowledge">
                  {completedRoutines}/{totalRoutines}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{routineProgress}% completed</p>
              </div>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-2">
              <div
                className="bg-knowledge h-2 rounded-full transition-all duration-300"
                style={{ width: `${routineProgress}%` }}
              />
            </div>
          </div>

          {showAddForm && (
            <div className="card p-4 animate-slide-up">
              <h3 className="font-medium text-sm mb-3 text-[var(--text-primary)]">Add New Routine</h3>
              <div className="space-y-3">
                <input
                  value={itemTitle}
                  onChange={e => setItemTitle(e.target.value)}
                  placeholder="Routine name..."
                  className="input-base"
                  autoFocus
                />
                <input
                  value={itemDesc}
                  onChange={e => setItemDesc(e.target.value)}
                  placeholder="Description (e.g., Walk 10k steps)..."
                  className="input-base"
                />
                <select value={itemCat} onChange={e => setItemCat(e.target.value)} className="input-base">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={addRoutine} disabled={saving} className="btn-primary py-2 px-4">
                    {saving ? 'Adding...' : 'Add Routine'}
                  </button>
                  <button onClick={resetForm} className="btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {routines.length === 0 && !showAddForm ? (
            <EmptyState icon={RotateCcw} text="No routines yet. Create your first daily routine." />
          ) : (
            <div className="space-y-2">
              {routines.map(routine => (
                <RoutineRow
                  key={routine.id}
                  routine={routine}
                  completed={routineLogs.some(
                    log => log.routine_id === routine.id && log.logged_date === selectedRoutineDate && log.completed
                  )}
                  onToggle={toggleRoutine}
                  onDelete={deleteRoutine}
                  getCatDot={getCatDot}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* HABITS TAB */}
      {tab === 'habits' && (
        <div className="space-y-4">
          <div className="card p-4">
            <label className="text-xs text-[var(--text-secondary)] block mb-2">View/Log Habits for Date</label>
            <input
              type="date"
              value={selectedHabitDate}
              onChange={(e) => setSelectedHabitDate(e.target.value)}
              className="input-base"
            />
          </div>

          {habits.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-3 text-center">
                <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-[var(--text-primary)]">{habits.length}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">Active Habits</p>
              </div>
              <div className="card p-3 text-center">
                <Check className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {habits.filter(h => isHabitCompleted(h.id, selectedHabitDate)).length}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)]">Done Today</p>
              </div>
              <div className="card p-3 text-center">
                <Target className="w-4 h-4 text-knowledge mx-auto mb-1" />
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {habits.reduce((sum, h) => sum + (h.streak || 0), 0)}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)]">Total Streak Days</p>
              </div>
            </div>
          )}

          {showAddForm && (
            <div className="card p-4 animate-slide-up">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                <Flame className="w-4 h-4 text-orange-500" /> Add New Habit
              </h3>
              <div className="space-y-3">
                <input
                  value={itemTitle}
                  onChange={e => setItemTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addHabit()}
                  placeholder="Habit name (e.g., Morning Meditation, Read 30 mins)..."
                  className="input-base"
                  autoFocus
                />
                <select value={itemCat} onChange={e => setItemCat(e.target.value)} className="input-base">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={addHabit} disabled={saving} className="btn-primary py-2 px-4">
                    {saving ? 'Adding...' : 'Add Habit'}
                  </button>
                  <button onClick={resetForm} className="btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {habits.length === 0 && !showAddForm ? (
            <EmptyState icon={Flame} text="No habits yet. Build better habits daily." />
          ) : (
            <div className="space-y-3">
              {habits.map(habit => {
                const completedToday = isHabitCompleted(habit.id, selectedHabitDate);
                const completionRate = getHabitCompletionRate(habit.id);
                
                return (
                  <div key={habit.id} className="card-hover p-4 group">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleHabit(habit, selectedHabitDate)}
                        disabled={saving}
                        className={`w-6 h-6 rounded-lg border flex-shrink-0 flex items-center justify-center transition-all mt-0.5 ${
                          completedToday 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-[var(--border)] hover:border-green-500'
                        }`}
                      >
                        {completedToday && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className={`text-sm font-medium ${completedToday ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                            {habit.title}
                          </p>
                          <span className={`text-xs ${getCatColor(habit.category)} bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full`}>
                            {habit.category}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-[var(--text-primary)] font-medium">{habit.streak || 0}</span>
                            <span className="text-[var(--text-secondary)]">day streak</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-knowledge" />
                            <span className="text-[var(--text-primary)] font-medium">{habit.best_streak || 0}</span>
                            <span className="text-[var(--text-secondary)]">best</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[var(--text-primary)] font-medium">{completionRate}%</span>
                            <span className="text-[var(--text-secondary)]">this week</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-3">
                          {[...Array(7)].map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (6 - i));
                            const dateStr = date.toISOString().split('T')[0];
                            const isCompleted = isHabitCompleted(habit.id, dateStr);
                            const isToday = dateStr === today;
                            const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                            
                            return (
                              <button
                                key={i}
                                onClick={() => setSelectedHabitDate(dateStr)}
                                className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center text-[10px] transition-all ${
                                  isCompleted
                                    ? 'bg-green-500/20 text-green-400 border border-green-500'
                                    : isToday
                                    ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'
                                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                                } ${selectedHabitDate === dateStr ? 'ring-1 ring-knowledge' : ''}`}
                                title={dateStr}
                              >
                                <span className="text-[8px] opacity-60">{dayNames[i]}</span>
                                <span className="text-xs font-medium">{date.getDate()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* GOALS TAB */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {showGoalForm && (
            <div className="card p-4 animate-slide-up">
              <h3 className="font-medium text-sm mb-3 text-[var(--text-primary)]">
                {editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </h3>
              <div className="space-y-3">
                <input
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  placeholder="Goal title..."
                  className="input-base"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                  <select value={goalPillar} onChange={e => setGoalPillar(e.target.value)} className="input-base">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <input
                    value={goalUnit}
                    onChange={e => setGoalUnit(e.target.value)}
                    placeholder="Unit (kg, ₹, books, etc)"
                    className="input-base"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Start Value</label>
                    <input
                      type="number"
                      value={goalStart}
                      onChange={e => setGoalStart(e.target.value)}
                      placeholder="0"
                      className="input-base"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Current Value</label>
                    <input
                      type="number"
                      value={goalCurrent}
                      onChange={e => setGoalCurrent(e.target.value)}
                      placeholder="0"
                      className="input-base"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Target Value</label>
                    <input
                      type="number"
                      value={goalTarget}
                      onChange={e => setGoalTarget(e.target.value)}
                      placeholder="100"
                      className="input-base"
                      step="any"
                    />
                  </div>
                </div>
                <input
                  type="date"
                  value={goalDate}
                  onChange={e => setGoalDate(e.target.value)}
                  className="input-base"
                />
                <div className="flex gap-2">
                  <button onClick={addGoal} disabled={saving} className="btn-primary py-2 px-4">
                    {saving ? 'Saving...' : (editingGoal ? 'Update' : 'Add')} Goal
                  </button>
                  <button onClick={() => { setShowGoalForm(false); setEditingGoal(null); }} className="btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {goals.length === 0 && !showGoalForm ? (
            <EmptyState icon={Target} text="No goals yet. Set your first long-term goal." />
          ) : (
            <div className="space-y-3">
              {goals.map(goal => {
                const pct = getGoalProgress(goal);
                const cat = categories.find(c => c.id === goal.pillar);
                return (
                  <div key={goal.id} className={`card-hover p-4 ${goal.completed ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleGoalComplete(goal)}
                        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all mt-0.5 ${
                          goal.completed ? 'bg-health border-health' : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                        }`}
                      >
                        {goal.completed && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-medium ${goal.completed ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                            {goal.title}
                          </p>
                          {cat && (
                            <span className={`badge ${cat.color} bg-[var(--bg-secondary)] border border-[var(--border)]`}>
                              {cat.label}
                            </span>
                          )}
                        </div>

                        {goal.target_value && (
                          <>
                            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                              <span>
                                {goal.start_value} → {goal.current_value} / {goal.target_value} {goal.unit}
                              </span>
                              <span>{Math.round(pct)}%</span>
                            </div>
                            <div className="progress-bar mb-2">
                              <div className={`progress-fill ${getCatDot(goal.pillar)}`} style={{ width: `${pct}%` }} />
                            </div>
                          </>
                        )}

                        {goal.target_date && (
                          <p className="text-xs text-[var(--text-secondary)] mb-3 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Target: {new Date(goal.target_date).toLocaleDateString()}
                          </p>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => openEditGoal(goal)} className="btn-ghost flex items-center gap-1 text-xs py-1.5 px-2.5">
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => loadGoalActivity(goal.id)} className="btn-ghost flex items-center gap-1 text-xs py-1.5 px-2.5">
                            <History className="w-3 h-3" /> History
                          </button>
                          {goal.target_value && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={goal.current_value}
                                onChange={e => updateGoalProgress(goal, parseFloat(e.target.value) || 0)}
                                placeholder="Update..."
                                className="input-base text-xs py-1.5 px-2.5 w-28"
                                step="any"
                              />
                              <span className="text-xs text-[var(--text-secondary)]">{goal.unit}</span>
                            </div>
                          )}
                          <button onClick={() => deleteGoal(goal.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors ml-auto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div>
          <p className="section-header mb-3">Completed Tasks History</p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Tasks you've completed appear here.</p>
          
          {history.length === 0 ? (
            <EmptyState icon={History} text="No completed tasks yet. Complete a task to see it here." />
          ) : (
            <div className="space-y-2">
              {history.slice(0, 50).map(record => (
                <div key={record.id} className="card-hover p-4 flex items-center gap-4">
                  <Check className="w-4 h-4 text-health flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--text-primary)]">{record.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-[var(--text-secondary)]">
                        Completed: {new Date(record.completed_date).toLocaleDateString()}
                      </p>
                      {record.category && (
                        <span className={`text-xs ${getCatColor(record.category)}`}>
                          {record.category}
                        </span>
                      )}
                      {record.priority && (
                        <span className={`text-xs ${
                          record.priority === 'high' ? 'text-red-400' : 
                          record.priority === 'medium' ? 'text-wealth' : 'text-[var(--text-secondary)]'
                        }`}>
                          {record.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTaskHistory(record.id)}
                    className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goal Activity History Modal */}
      {showGoalActivityHistory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowGoalActivityHistory(null)}>
          <div className="card max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[var(--text-primary)]">
                <History className="w-4 h-4" /> Activity History
              </h2>
              <button
                onClick={() => setShowGoalActivityHistory(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {goalActivities.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] text-center py-4">No activity history yet. Update your progress to see it here.</p>
              ) : (
                goalActivities.map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
                    <div>
                      <p className="text-sm font-medium text-knowledge">{activity.value}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{new Date(activity.activity_date).toLocaleDateString()}</p>
                    </div>
                    {activity.notes && <p className="text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{activity.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Task Row Component
function TaskRow({ task, onToggle, onDelete, getCatDot }: {
  task: Task;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  getCatDot: (cat: string) => string;
}) {
  const priorityColors: Record<string, string> = { 
    high: 'text-red-400', 
    medium: 'text-wealth', 
    low: 'text-[var(--text-secondary)]' 
  };
  
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all group ${
      task.completed ? 'border-[var(--border)] opacity-50' : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-card)]'
    }`}>
      <button
        onClick={() => onToggle(task)}
        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
          task.completed ? 'bg-health border-health' : 'border-[var(--border)] hover:border-[var(--border-hover)]'
        }`}
      >
        {task.completed && <Check className="w-3 h-3 text-white" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.completed ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{task.title}</p>
        {task.due_date && !task.completed && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString()}
          </p>
        )}
        {task.notes && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
            <FileText className="w-3 h-3" /> {task.notes.substring(0, 60)}
          </p>
        )}
      </div>
      
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getCatDot(task.category)}`} />
      <span className={`text-xs ${priorityColors[task.priority]} hidden sm:block`}>{task.priority}</span>
      <button
        onClick={() => onDelete(task.id)}
        className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Routine Row Component
function RoutineRow({ routine, completed, onToggle, onDelete, getCatDot }: {
  routine: Routine;
  completed: boolean;
  onToggle: (r: Routine) => void;
  onDelete: (id: string) => void;
  getCatDot: (cat: string) => string;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      completed ? 'border-health/30 bg-health/5 opacity-70' : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-card)]'
    }`}>
      <button
        onClick={() => onToggle(routine)}
        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
          completed ? 'bg-health border-health' : 'border-[var(--border)] hover:border-[var(--border-hover)]'
        }`}
      >
        {completed && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1">
        <p className={`text-sm font-medium ${completed ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
          {routine.title}
        </p>
        {routine.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{routine.description}</p>
        )}
      </div>

      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getCatDot(routine.category)}`} />

      <button
        onClick={() => onDelete(routine.id)}
        className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Empty State Component
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="text-center py-16 card">
      <Icon className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
      <p className="text-[var(--text-secondary)] text-sm">{text}</p>
    </div>
  );
}