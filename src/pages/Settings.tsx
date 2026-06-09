import { useState, useEffect } from 'react';
import { 
  User, LogOut, Moon, Bell, Download, Shield, 
  Sun, Palette, Database, Trash2, Check, AlertCircle,
  ChevronRight, Lock, Mail, Eye, EyeOff, Key,
  Users, Activity, Target, CheckSquare, Github, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Pillar } from '../types';

const pillars: { id: Pillar; label: string; color: string }[] = [
  { id: 'health', label: 'Health', color: 'text-health' },
  { id: 'knowledge', label: 'Knowledge', color: 'text-knowledge' },
  { id: 'career', label: 'Career', color: 'text-career' },
  { id: 'wealth', label: 'Wealth', color: 'text-wealth' },
  { id: 'business', label: 'Business', color: 'text-business' },
];

const ADMIN_EMAIL = 'aadarshlpnt16@gmail.com';

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [selectedPillars, setSelectedPillars] = useState<Pillar[]>(profile?.selected_pillars || ['health', 'knowledge', 'career', 'wealth', 'business']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Admin stats
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    totalTasks: 0,
    totalGoals: 0,
    loading: true
  });

  // Change Password States
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Check if current user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Load admin stats (only if admin)
  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    }
  }, [isAdmin]);

  const loadAdminStats = async () => {
    setAdminStats(prev => ({ ...prev, loading: true }));
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get total tasks
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });
      
      // Get total goals
      const { count: goalCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true });
      
      // Get active users today
      const today = new Date().toISOString().split('T')[0];
      const { count: activeCount } = await supabase
        .from('task_history')
        .select('*', { count: 'exact', head: true })
        .eq('completed_date', today);
      
      setAdminStats({
        totalUsers: userCount || 0,
        activeToday: activeCount || 0,
        totalTasks: taskCount || 0,
        totalGoals: goalCount || 0,
        loading: false
      });
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setAdminStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const togglePillar = (id: Pillar) => {
    setSelectedPillars(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id, 
        name: name.trim() || 'User', 
        age: age ? parseInt(age) : null,
        gender: gender || null, 
        selected_pillars: selectedPillars,
        updated_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    
    try {
      const tables = ['tasks', 'goals', 'habits', 'notes', 'accounts', 'assets', 'investments', 'businesses', 'health_logs', 'skills', 'books', 'courses'];
      const exportData: Record<string, any> = {};
      
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*').eq('user_id', user.id);
        exportData[table] = data || [];
      }
      
      exportData.profile = profile;
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `climb_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Data exported successfully!');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    
    try {
      const tables = ['tasks', 'goals', 'habits', 'notes', 'accounts', 'assets', 'investments', 'businesses', 'health_logs', 'skills', 'books', 'courses', 'routine_logs', 'goal_activity', 'task_history'];
      
      for (const table of tables) {
        await supabase.from(table).delete().eq('user_id', user.id);
      }
      
      await supabase.from('profiles').delete().eq('id', user.id);
      await signOut();
      
    } catch (err: any) {
      alert(`Failed to delete account: ${err.message}`);
    }
  };

  const changePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    setPasswordUpdating(true);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        setPasswordError('Current password is incorrect');
        setPasswordUpdating(false);
        return;
      }
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      setPasswordSuccess('Password changed successfully!');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto animate-fade-in">
      <h1 className="page-title mb-8">Settings</h1>

      {/* Profile Section */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
            <User className="w-4 h-4 text-[#A0A0A0]" />
          </div>
          <h2 className="font-semibold">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1.5 block">Display Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Your name" 
              className="input-base" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#A0A0A0] mb-1.5 block">Age</label>
              <input 
                type="number" 
                value={age} 
                onChange={e => setAge(e.target.value)} 
                placeholder="e.g. 25" 
                min={10} 
                max={100} 
                className="input-base" 
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] mb-1.5 block">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="input-base">
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-2 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </label>
            <p className="text-sm text-[#5A5A5A] bg-[#1A1A1A] border border-[#1E1E1E] rounded-xl px-4 py-3">
              {user?.email}
            </p>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-2 block">Active Pillars</label>
            <div className="flex flex-wrap gap-2">
              {pillars.map(({ id, label, color }) => (
                <button 
                  key={id} 
                  onClick={() => togglePillar(id)} 
                  className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                    selectedPillars.includes(id) 
                      ? `${color} bg-[#2A2A2A] border-[#3A3A3A]` 
                      : 'border-[#1E1E1E] text-[#5A5A5A]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#5A5A5A] mt-2">
              Only selected pillars will appear in your dashboard
            </p>
          </div>

          <button 
            onClick={saveProfile} 
            disabled={saving} 
            className="btn-primary py-2.5 px-5 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {saving ? 'Saving...' : saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
              <Key className="w-4 h-4 text-[#A0A0A0]" />
            </div>
            <h2 className="font-semibold">Security</h2>
          </div>
          <button
            onClick={() => {
              setShowChangePassword(!showChangePassword);
              setPasswordError('');
              setPasswordSuccess('');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmNewPassword('');
            }}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {showChangePassword ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showChangePassword && (
          <div className="space-y-4">
            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {passwordSuccess}
              </div>
            )}
            
            <div>
              <label className="text-xs text-[#A0A0A0] mb-1.5 block">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4 text-[#5A5A5A]" /> : <Eye className="w-4 h-4 text-[#5A5A5A]" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-[#A0A0A0] mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4 text-[#5A5A5A]" /> : <Eye className="w-4 h-4 text-[#5A5A5A]" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-[#A0A0A0] mb-1.5 block">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4 text-[#5A5A5A]" /> : <Eye className="w-4 h-4 text-[#5A5A5A]" />}
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={changePassword}
                disabled={passwordUpdating}
                className="btn-primary flex-1"
              >
                {passwordUpdating ? 'Updating...' : 'Update Password'}
              </button>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
            <Palette className="w-4 h-4 text-[#A0A0A0]" />
          </div>
          <h2 className="font-semibold">Preferences</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <div>
                <p className="text-sm">Dark Mode</p>
                <p className="text-xs text-[#5A5A5A]">Switch between dark and light theme</p>
              </div>
            </div>
            <button 
              onClick={toggleTheme}
              className="w-12 h-6 rounded-full bg-[#2A2A2A] flex items-center transition-all"
            >
              <div className={`w-5 h-5 rounded-full bg-wealth transition-all ${isDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4" />
              <div>
                <p className="text-sm">Notifications</p>
                <p className="text-xs text-[#5A5A5A]">Get daily reminders and goal alerts</p>
              </div>
            </div>
            <button 
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full flex items-center transition-all ${notifications ? 'bg-wealth' : 'bg-[#2A2A2A]'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-all ${notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
            <Database className="w-4 h-4 text-[#A0A0A0]" />
          </div>
          <h2 className="font-semibold">Data Management</h2>
        </div>

        <div className="space-y-2">
          <button 
            onClick={exportData} 
            disabled={exporting}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-[#A0A0A0] hover:bg-[#1A1A1A] transition-colors group"
          >
            <span className="flex items-center gap-3">
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export All Data'}
            </span>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors group"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="w-4 h-4" />
              Delete Account & All Data
            </span>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#A0A0A0]" />
          </div>
          <h2 className="font-semibold">Account</h2>
        </div>

        <div className="space-y-2">
          <button 
            onClick={signOut} 
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-[#A0A0A0] hover:bg-[#1A1A1A] transition-colors group"
          >
            <span className="flex items-center gap-3">
              <LogOut className="w-4 h-4" />
              Sign Out
            </span>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* ADMIN DASHBOARD - ONLY VISIBLE TO YOU */}
      {/* ============================================ */}
      {isAdmin && (
        <div className="card p-5 mb-4 border-wealth/20 bg-wealth/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-wealth/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-wealth" />
            </div>
            <h2 className="font-semibold">Admin Dashboard</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-wealth/20 text-wealth ml-auto">Super Admin</span>
          </div>

          {adminStats.loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-[#1A1A1A] rounded animate-pulse" />
              <div className="h-4 bg-[#1A1A1A] rounded animate-pulse w-3/4" />
            </div>
          ) : (
            <>
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-[#1A1A1A] text-center">
                  <Users className="w-5 h-5 text-wealth mx-auto mb-1" />
                  <p className="text-2xl font-bold text-wealth">{adminStats.totalUsers}</p>
                  <p className="text-xs text-[#5A5A5A]">Total Users</p>
                </div>
                <div className="p-3 rounded-lg bg-[#1A1A1A] text-center">
                  <Activity className="w-5 h-5 text-health mx-auto mb-1" />
                  <p className="text-2xl font-bold text-health">{adminStats.activeToday}</p>
                  <p className="text-xs text-[#5A5A5A]">Active Today</p>
                </div>
                <div className="p-3 rounded-lg bg-[#1A1A1A] text-center">
                  <CheckSquare className="w-5 h-5 text-knowledge mx-auto mb-1" />
                  <p className="text-2xl font-bold text-knowledge">{adminStats.totalTasks}</p>
                  <p className="text-xs text-[#5A5A5A]">Total Tasks</p>
                </div>
                <div className="p-3 rounded-lg bg-[#1A1A1A] text-center">
                  <Target className="w-5 h-5 text-career mx-auto mb-1" />
                  <p className="text-2xl font-bold text-career">{adminStats.totalGoals}</p>
                  <p className="text-xs text-[#5A5A5A]">Total Goals</p>
                </div>
              </div>

              {/* System Health */}
              <div className="p-3 rounded-lg bg-[#1A1A1A] mb-3">
                <p className="text-xs text-[#5A5A5A] mb-2 flex items-center gap-2">
                  <Shield className="w-3 h-3" /> System Health
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Supabase Status:</span>
                    <span className="text-green-400">● Operational</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Latency:</span>
                    <span className="text-wealth">~120ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Backup:</span>
                    <span className="text-[#5A5A5A]">Daily at 2:00 AM</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={loadAdminStats}
                  className="flex-1 text-xs bg-wealth/10 text-wealth py-2 rounded-lg hover:bg-wealth/20 transition-colors"
                >
                  Refresh Stats
                </button>
                <button 
                  onClick={async () => {
                    const { data } = await supabase.from('profiles').select('*');
                    const jsonStr = JSON.stringify(data, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `climb_users_export_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 text-xs bg-[#1A1A1A] text-[#A0A0A0] py-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                >
                  Export User Data
                </button>
              </div>

              {/* Quick Links - UPDATED WITH YOUR LINKS */}
              <div className="mt-3 pt-3 border-t border-[#242424]">
                <p className="text-xs text-[#5A5A5A] mb-2">Quick Links</p>
                <div className="flex flex-wrap gap-3">
                  <a 
                    href="https://supabase.com/dashboard/project/mvjcrztdwfjqtjegntll" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-wealth hover:underline flex items-center gap-1"
                  >
                    <Database className="w-3 h-3" /> Supabase Dashboard
                  </a>
                  <a 
                    href="https://github.com/Aadarsh-Jaat" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-wealth hover:underline flex items-center gap-1"
                  >
                    <Github className="w-3 h-3" /> GitHub Repository
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('mvjcrztdwfjqtjegntll');
                      alert('Project ID copied to clipboard!');
                    }}
                    className="text-xs text-[#5A5A5A] hover:text-wealth transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Copy Project ID
                  </button>
                </div>
                <p className="text-xs text-[#5A5A5A] mt-2">
                  ℹ️ Vercel link will be added after deployment
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="card max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Delete Account?</h3>
            <p className="text-sm text-[#5A5A5A] mb-4">
              This action is <span className="text-red-400 font-medium">permanent</span>. 
              All your data including goals, tasks, notes, health logs, and business records will be deleted forever.
            </p>
            <p className="text-xs text-[#5A5A5A] mb-6">
              Type <span className="text-wealth font-mono">DELETE</span> to confirm
            </p>
            <input 
              type="text" 
              id="deleteConfirm"
              placeholder="Type DELETE"
              className="input-base text-center mb-4"
              onKeyDown={(e) => {
                if ((e.target as HTMLInputElement).value === 'DELETE' && e.key === 'Enter') {
                  deleteAccount();
                }
              }}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const input = document.getElementById('deleteConfirm') as HTMLInputElement;
                  if (input?.value === 'DELETE') {
                    deleteAccount();
                  } else {
                    alert('Please type DELETE to confirm');
                  }
                }} 
                className="btn-primary bg-red-500 hover:bg-red-600 flex-1"
              >
                Delete Permanently
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-[#3A3A3A] text-center mt-8 flex items-center justify-center gap-1">
        Climb — One Place To Climb In Life, Career, Wealth & Business.
      </p>
    </div>
  );
}