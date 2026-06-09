import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Plus, TrendingUp, Droplets, Moon, Footprints, Dumbbell, Scale, 
  Trash2, Camera, Target, Heart, Calendar, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { HealthLog, HealthProfile } from '../types';

const goalOptions = [
  { id: 'gain_muscle', label: 'Gain Muscle', icon: '💪' },
  { id: 'lose_weight', label: 'Lose Weight', icon: '⚖️' },
  { id: 'general_fitness', label: 'General Fitness', icon: '🏃' },
  { id: 'improve_stamina', label: 'Improve Stamina', icon: '🏊' },
];

const workoutTypes = [
  { id: 'cardio', label: 'Cardio', icon: '🏃' },
  { id: 'strength', label: 'Strength', icon: '💪' },
  { id: 'hiit', label: 'HIIT', icon: '⚡' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'walking', label: 'Walking', icon: '🚶' },
];

// Cache for health data
let healthDataCache: { logs: HealthLog[]; profile: HealthProfile | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export default function Health() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [selectedLogDate, setSelectedLogDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [steps, setSteps] = useState('');
  const [water, setWater] = useState('');
  const [sleep, setSleep] = useState('');
  const [workoutDone, setWorkoutDone] = useState(false);
  const [workoutType, setWorkoutType] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [calories, setCalories] = useState('');
  const [mood, setMood] = useState(3);

  // Profile form
  const [primaryGoal, setPrimaryGoal] = useState('general_fitness');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [height, setHeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [waterGoal, setWaterGoal] = useState(2500);
  const [stepsGoal, setStepsGoal] = useState(8000);

  const loadingRef = useRef(false);

  // Load health data with caching
  const loadHealthData = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    // Check cache
    if (!forceRefresh && healthDataCache && (Date.now() - healthDataCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached health data');
      setProfile(healthDataCache.profile);
      setLogs(healthDataCache.logs);
      setLoading(false);
      setInitialLoadDone(true);
      return;
    }
    
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setLoading(true);
    try {
      // Fetch profile and logs in parallel
      const [profileResult, logsResult] = await Promise.all([
        supabase.from('health_profile').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('health_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }).limit(50)
      ]);
      
      if (profileResult.error) console.error('Profile error:', profileResult.error);
      if (logsResult.error) console.error('Logs error:', logsResult.error);
      
      let profileData = null;
      if (profileResult.data) {
        profileData = profileResult.data as HealthProfile;
        setProfile(profileData);
        setPrimaryGoal(profileData.primary_goal || 'general_fitness');
        setCurrentWeight(profileData.current_weight?.toString() || '');
        setGoalWeight(profileData.goal_weight?.toString() || '');
        setHeight(profileData.height?.toString() || '');
        setTargetDate(profileData.target_date || '');
        setWaterGoal(profileData.water_goal || 2500);
        setStepsGoal(profileData.steps_goal || 8000);
      }
      
      const logsData = (logsResult.data || []) as HealthLog[];
      setLogs(logsData);
      
      // Update cache
      healthDataCache = {
        profile: profileData,
        logs: logsData,
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
      loadHealthData();
    }
  }, [user, loadHealthData, initialLoadDone]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const { data, error } = await supabase.from('health_profile').upsert({
        id: user.id,
        primary_goal: primaryGoal,
        current_weight: currentWeight ? parseFloat(currentWeight) : null,
        goal_weight: goalWeight ? parseFloat(goalWeight) : null,
        height: height ? parseFloat(height) : null,
        target_date: targetDate || null,
        water_goal: waterGoal,
        steps_goal: stepsGoal,
        updated_at: new Date().toISOString(),
      }).select().single();
      
      if (error) throw error;
      if (data) {
        setProfile(data as HealthProfile);
        healthDataCache = null;
      }
      setShowProfileForm(false);
      await loadHealthData(true);
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addLog = async () => {
    if (!user) {
      alert('Please log in to save health data');
      return;
    }
    
    if (saving) return;
    
    setSaving(true);
    
    const payload = {
      user_id: user.id,
      log_date: selectedLogDate,
      weight: weight ? parseFloat(weight) : null,
      steps: steps ? parseInt(steps) : null,
      water_ml: water ? parseInt(water) : null,
      sleep_hours: sleep ? parseFloat(sleep) : null,
      workout_done: workoutDone,
      workout_type: workoutType || null,
      workout_duration: workoutDuration ? parseInt(workoutDuration) : null,
      workout_notes: workoutNotes || null,
      calories_burned: calories ? parseInt(calories) : null,
      mood: mood,
    };
    
    const existing = logs.find(l => l.log_date === selectedLogDate);
    
    const performSave = async () => {
      if (existing) {
        const { data, error } = await supabase
          .from('health_logs')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('health_logs')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    };
    
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await performSave();
        if (result) {
          healthDataCache = null;
          await loadHealthData(true);
          resetForm();
          setSaving(false);
          return;
        }
      } catch (err: any) {
        lastError = err;
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    }
    
    alert(`Failed to save health log: ${lastError?.message || 'Connection error'}`);
    setSaving(false);
  };

  const resetForm = () => {
    setShowLogForm(false);
    setWeight('');
    setSteps('');
    setWater('');
    setSleep('');
    setWorkoutDone(false);
    setWorkoutType('');
    setWorkoutDuration('');
    setWorkoutNotes('');
    setCalories('');
    setMood(3);
    setSelectedLogDate(today);
  };

  const deleteLog = async (id: string) => {
    if (!confirm('Delete this health log?')) return;
    
    try {
      const { error } = await supabase.from('health_logs').delete().eq('id', id);
      if (error) throw error;
      healthDataCache = null;
      await loadHealthData(true);
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const selectedLog = logs.find(l => l.log_date === selectedLogDate);
  
  useEffect(() => {
    if (selectedLog) {
      setWeight(selectedLog.weight?.toString() || '');
      setSteps(selectedLog.steps?.toString() || '');
      setWater(selectedLog.water_ml?.toString() || '');
      setSleep(selectedLog.sleep_hours?.toString() || '');
      setWorkoutDone(!!selectedLog.workout_done);
      setWorkoutType(selectedLog.workout_type || '');
      setWorkoutDuration(selectedLog.workout_duration?.toString() || '');
      setWorkoutNotes(selectedLog.workout_notes || '');
      setCalories(selectedLog.calories_burned?.toString() || '');
      setMood(selectedLog.mood || 3);
    } else {
      setWeight('');
      setSteps('');
      setWater('');
      setSleep('');
      setWorkoutDone(false);
      setWorkoutType('');
      setWorkoutDuration('');
      setWorkoutNotes('');
      setCalories('');
      setMood(3);
    }
  }, [selectedLogDate, logs]);

  // Calculations
  const latestWeight = logs.find(l => l.weight)?.weight;
  const last7DaysLogs = logs.slice(0, 7);
  const avgSleep = last7DaysLogs.filter(l => l.sleep_hours).length > 0 
    ? last7DaysLogs.filter(l => l.sleep_hours).reduce((s, l) => s + (l.sleep_hours || 0), 0) / last7DaysLogs.filter(l => l.sleep_hours).length 
    : 0;
  const totalSteps = last7DaysLogs.filter(l => l.steps).reduce((s, l) => s + (l.steps || 0), 0);
  const avgSteps = last7DaysLogs.filter(l => l.steps).length > 0 
    ? Math.round(totalSteps / last7DaysLogs.filter(l => l.steps).length) 
    : 0;
  const workoutStreak = calculateWorkoutStreak(logs);
  const waterAvg = last7DaysLogs.filter(l => l.water_ml).length > 0
    ? Math.round(last7DaysLogs.filter(l => l.water_ml).reduce((s, l) => s + (l.water_ml || 0), 0) / last7DaysLogs.filter(l => l.water_ml).length)
    : 0;
  
  const bmi = profile?.height && latestWeight 
    ? (latestWeight / ((profile.height / 100) ** 2)).toFixed(1)
    : null;
    
  const bmiCategory = bmi 
    ? parseFloat(bmi) < 18.5 ? 'Underweight'
      : parseFloat(bmi) < 25 ? 'Normal'
      : parseFloat(bmi) < 30 ? 'Overweight'
      : 'Obese'
    : null;

  const healthScore = calculateHealthScore(logs, profile, waterGoal, stepsGoal);

  // Loading skeleton
  if (loading && !initialLoadDone) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-24 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
            ))}
          </div>
          <div className="h-32 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
          <div className="h-64 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Health</h1>
          {profile?.primary_goal && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1">
              {goalOptions.find(g => g.id === profile.primary_goal)?.icon} 
              {goalOptions.find(g => g.id === profile.primary_goal)?.label}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadHealthData(true)} className="btn-secondary py-2 px-3 text-sm" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowPhotoModal(true)} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
            <Camera className="w-4 h-4" /> Photos
          </button>
          <button onClick={() => setShowProfileForm(!showProfileForm)} className="btn-secondary py-2 px-4 text-sm">
            Settings
          </button>
          <button onClick={() => setShowLogForm(!showLogForm)} className="btn-primary flex items-center gap-2 py-2 px-4">
            <Plus className="w-4 h-4" />Log Today
          </button>
        </div>
      </div>

      {/* Health Score Card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-health/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-health/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-health">{healthScore}</span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Health Score</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {healthScore >= 80 ? 'Excellent! 🎉' : healthScore >= 60 ? 'Good progress 📈' : 'Room to grow 💪'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">Workout Streak</p>
            <p className="text-xl font-bold text-health">{workoutStreak} <span className="text-sm">days</span></p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Scale} label="Weight" value={latestWeight ? `${latestWeight} kg` : '—'} color="text-health" />
        <StatCard icon={Footprints} label="Daily Steps" value={avgSteps > 0 ? avgSteps.toLocaleString() : '—'} subValue={`Goal: ${stepsGoal.toLocaleString()}`} color="text-knowledge" />
        <StatCard icon={Droplets} label="Water" value={waterAvg > 0 ? `${waterAvg} ml` : '—'} subValue={`Goal: ${waterGoal} ml`} color="text-cyan-400" />
        <StatCard icon={Moon} label="Sleep" value={avgSleep > 0 ? `${avgSleep.toFixed(1)}h` : '—'} subValue="7-9h recommended" color="text-career" />
        <StatCard icon={Dumbbell} label="Workouts" value={last7DaysLogs.filter(l => l.workout_done).length.toString()} subValue="in last 7 days" color="text-wealth" />
      </div>

      {/* BMI Card */}
      {bmi && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className={`w-5 h-5 ${
              bmiCategory === 'Normal' ? 'text-green-400' : 
              bmiCategory === 'Underweight' ? 'text-yellow-400' : 'text-orange-400'
            }`} />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">BMI: {bmi}</p>
              <p className="text-xs text-[var(--text-secondary)]">{bmiCategory}</p>
            </div>
          </div>
          <div className="w-32 h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-health rounded-full" style={{ width: `${(parseFloat(bmi) / 40) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Goal info */}
      {profile && profile.goal_weight && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-4 h-4 text-health" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Weight Goal Progress</p>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Current: {latestWeight || profile.current_weight || '—'} kg</span>
            <span className="text-[var(--text-secondary)]">Target: {profile.goal_weight} kg</span>
          </div>
          <div className="progress-bar mb-2">
            <div className="progress-fill bg-health" style={{ 
              width: `${Math.min(100, Math.max(0, ((profile.current_weight || latestWeight || 0) - profile.goal_weight) / (profile.current_weight || 1) * 100))}%` 
            }} />
          </div>
          {profile.target_date && (
            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Target date: {new Date(profile.target_date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Profile Settings Form */}
      {showProfileForm && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="font-semibold text-sm mb-4 text-[var(--text-primary)]">Health Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Primary Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {goalOptions.map(g => (
                  <button 
                    key={g.id} 
                    onClick={() => setPrimaryGoal(g.id)} 
                    className={`py-2 px-3 rounded-xl text-sm border transition-all flex items-center gap-2 justify-center ${
                      primaryGoal === g.id ? 'border-health bg-health/10 text-health' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <span>{g.icon}</span> {g.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Current Weight (kg)</label>
                <input type="number" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} placeholder="75" className="input-base" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Goal Weight (kg)</label>
                <input type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} placeholder="65" className="input-base" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Height (cm)</label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" className="input-base" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Target Date</label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="input-base" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Daily Water Goal (ml)</label>
                <input type="number" value={waterGoal} onChange={e => setWaterGoal(parseInt(e.target.value))} placeholder="2500" className="input-base" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Daily Steps Goal</label>
                <input type="number" value={stepsGoal} onChange={e => setStepsGoal(parseInt(e.target.value))} placeholder="8000" className="input-base" />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={saveProfile} disabled={saving} className="btn-primary py-2 px-4">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowProfileForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Log Form */}
      {showLogForm && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="font-semibold text-sm mb-4 text-[var(--text-primary)]">
            Log Health — {selectedLogDate}
          </h3>

          <div className="mb-3">
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Select Date</label>
            <input type="date" value={selectedLogDate} onChange={(e) => setSelectedLogDate(e.target.value)} className="input-base" />
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Weight (kg)</label>
              <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 72.5" className="input-base" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Steps</label>
              <input type="number" value={steps} onChange={e => setSteps(e.target.value)} placeholder="e.g. 8000" className="input-base" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Water (ml)</label>
              <input type="number" value={water} onChange={e => setWater(e.target.value)} placeholder="e.g. 2500" className="input-base" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Sleep (hours)</label>
              <input type="number" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="e.g. 7.5" className="input-base" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Calories Burned</label>
              <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="e.g. 500" className="input-base" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Mood (1-5)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                      mood === m ? 'bg-health text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {m === 1 ? '😔' : m === 2 ? '😐' : m === 3 ? '😊' : m === 4 ? '😁' : '🤩'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-3">
            <button 
              type="button"
              onClick={() => setWorkoutDone(!workoutDone)} 
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${workoutDone ? 'bg-health border-health' : 'border-[var(--border)]'}`}
            >
              {workoutDone && <svg className="w-3 h-3 text-white" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
            </button>
            <span className="text-sm text-[var(--text-primary)]">Worked out today</span>
          </div>
          
          {workoutDone && (
            <div className="space-y-3 mb-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Workout Type</label>
                  <div className="flex flex-wrap gap-1">
                    {workoutTypes.map(wt => (
                      <button
                        key={wt.id}
                        type="button"
                        onClick={() => setWorkoutType(wt.id)}
                        className={`py-1.5 px-2 rounded-lg text-xs transition-all ${
                          workoutType === wt.id ? 'bg-health/20 border border-health text-health' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {wt.icon} {wt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Duration (minutes)</label>
                  <input type="number" value={workoutDuration} onChange={e => setWorkoutDuration(e.target.value)} placeholder="45" className="input-base" />
                </div>
              </div>
              <input 
                value={workoutNotes} 
                onChange={e => setWorkoutNotes(e.target.value)} 
                placeholder="Workout notes (exercises, weights, etc)..." 
                className="input-base" 
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <button onClick={addLog} disabled={saving} className="btn-primary py-2 px-4">
              {saving ? 'Saving...' : (selectedLog ? 'Update Log' : 'Save Log')}
            </button>
            <button onClick={resetForm} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Log History */}
      <div>
        <p className="section-header mb-3">History</p>
        {logs.length === 0 ? (
          <div className="text-center py-16 card">
            <Dumbbell className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)] text-sm">No health logs yet. Log your first day.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 30).map(log => (
              <div key={log.id} className="card-hover p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center w-12 flex-shrink-0">
                    <p className="text-xs text-[var(--text-secondary)]">{new Date(log.log_date).toLocaleDateString('en', { month: 'short' })}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{new Date(log.log_date).getDate()}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">Weight</p>
                      <p className="font-medium text-[var(--text-primary)]">{log.weight ? `${log.weight}kg` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">Steps</p>
                      <p className="font-medium text-[var(--text-primary)]">{log.steps ? log.steps.toLocaleString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">Water</p>
                      <p className="font-medium text-[var(--text-primary)]">{log.water_ml ? `${log.water_ml}ml` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">Sleep</p>
                      <p className="font-medium text-[var(--text-primary)]">{log.sleep_hours ? `${log.sleep_hours}h` : '—'}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteLog(log.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {log.workout_done && (
                  <div className="mt-2 ml-16 flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-health">
                      <Dumbbell className="w-3 h-3" /> Workout: 
                      {log.workout_type && ` ${log.workout_type}`}
                      {log.workout_duration && ` (${log.workout_duration} min)`}
                    </span>
                    {log.calories_burned && (
                      <span className="text-[var(--text-secondary)]">🔥 {log.calories_burned} cal</span>
                    )}
                    {log.mood && (
                      <span className="text-[var(--text-secondary)]">
                        {log.mood === 1 ? '😔' : log.mood === 2 ? '😐' : log.mood === 3 ? '😊' : log.mood === 4 ? '😁' : '🤩'}
                      </span>
                    )}
                  </div>
                )}
                
                {log.workout_notes && (
                  <p className="mt-1 ml-16 text-xs text-[var(--text-secondary)] italic">{log.workout_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPhotoModal(false)}>
          <div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium mb-4 text-[var(--text-primary)]">Progress Photos</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Progress photos help you see visual changes over time.</p>
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center mb-4">
              <Camera className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-secondary)]">Upload front/side/back photos</p>
              <input type="file" accept="image/*" className="hidden" />
              <button className="btn-secondary text-sm mt-3">Take Photo</button>
            </div>
            <button onClick={() => setShowPhotoModal(false)} className="btn-ghost w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }: { icon: React.ElementType; label: string; value: string; subValue?: string; color: string }) {
  return (
    <div className="card p-4">
      <Icon className={`w-4 h-4 ${color} mb-2`} />
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
      {subValue && <p className="text-[10px] text-[var(--text-secondary)] mt-1">{subValue}</p>}
    </div>
  );
}

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

function calculateHealthScore(logs: HealthLog[], profile: HealthProfile | null, waterGoal: number, stepsGoal: number): number {
  if (logs.length === 0) return 0;
  
  const last7Days = logs.slice(0, 7);
  
  let weightScore = 50;
  if (profile?.goal_weight && logs.find(l => l.weight)) {
    const latestWeight = logs.find(l => l.weight)?.weight || 0;
    const goalDiff = Math.abs(latestWeight - profile.goal_weight);
    const initialDiff = Math.abs((profile.current_weight || latestWeight) - profile.goal_weight);
    weightScore = initialDiff > 0 ? Math.max(0, 100 - (goalDiff / initialDiff) * 100) : 100;
  }
  
  const avgSteps = last7Days.filter(l => l.steps).length > 0
    ? last7Days.filter(l => l.steps).reduce((s, l) => s + (l.steps || 0), 0) / last7Days.filter(l => l.steps).length
    : 0;
  const stepScore = Math.min(100, (avgSteps / stepsGoal) * 100);
  
  const avgWater = last7Days.filter(l => l.water_ml).length > 0
    ? last7Days.filter(l => l.water_ml).reduce((s, l) => s + (l.water_ml || 0), 0) / last7Days.filter(l => l.water_ml).length
    : 0;
  const waterScore = Math.min(100, (avgWater / waterGoal) * 100);
  
  const avgSleep = last7Days.filter(l => l.sleep_hours).length > 0
    ? last7Days.filter(l => l.sleep_hours).reduce((s, l) => s + (l.sleep_hours || 0), 0) / last7Days.filter(l => l.sleep_hours).length
    : 0;
  let sleepScore = 0;
  if (avgSleep >= 7 && avgSleep <= 9) sleepScore = 100;
  else if (avgSleep >= 6 && avgSleep < 7) sleepScore = 70;
  else if (avgSleep >= 9 && avgSleep <= 10) sleepScore = 80;
  else if (avgSleep < 6) sleepScore = 50;
  else sleepScore = 60;
  
  const workoutDays = last7Days.filter(l => l.workout_done).length;
  const workoutScore = Math.min(100, (workoutDays / 5) * 100);
  
  const avgMood = last7Days.filter(l => l.mood).length > 0
    ? last7Days.filter(l => l.mood).reduce((s, l) => s + (l.mood || 0), 0) / last7Days.filter(l => l.mood).length
    : 0;
  const moodScore = (avgMood / 5) * 100;
  
  return Math.round(
    (weightScore * 0.25) +
    (stepScore * 0.15) +
    (waterScore * 0.15) +
    (sleepScore * 0.2) +
    (workoutScore * 0.15) +
    (moodScore * 0.1)
  );
}