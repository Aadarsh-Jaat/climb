import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Plus, Briefcase, Link, Trash2, ExternalLink, TrendingUp, Target, 
  Award, Calendar, FileText, CheckCircle, XCircle, Clock, BarChart3,
  Brain, FileCheck, Users, MessageSquare, Star, TrendingDown, Github, Linkedin,
  GraduationCap, BookOpen, Timer, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { CareerProfile, Opportunity, CareerTrack } from '../types';

const oppTypes = ['job', 'client', 'partnership', 'lead'];
const oppStatuses = ['exploring', 'applied', 'interviewing', 'offer', 'rejected', 'accepted'];
const careerTypes = ['student', 'employee', 'freelancer', 'creator', 'business_owner', 'government_aspirant'];
const trackTypes = ['job', 'government_exam', 'business', 'freelancing', 'higher_studies'];
const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const statusColors: Record<string, string> = {
  exploring: 'text-[var(--text-secondary)]', applied: 'text-knowledge', interviewing: 'text-career',
  offer: 'text-health', rejected: 'text-red-400', accepted: 'text-health',
};

interface CareerSkill {
  id: string;
  user_id: string;
  name: string;
  level: string;
  category: string;
  created_at: string;
}

interface InterviewPrep {
  id: string;
  user_id: string;
  opportunity_id: string;
  question: string;
  answer: string;
  status: 'pending' | 'practiced' | 'mastered';
  created_at: string;
}

// Cache for career data
let careerCache: { 
  profile: CareerProfile | null; 
  opportunities: Opportunity[]; 
  skills: CareerSkill[];
  tracks: CareerTrack[];
  timestamp: number;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Career() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [skills, setSkills] = useState<CareerSkill[]>([]);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep[]>([]);
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showOppForm, setShowOppForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadingRef = useRef(false);

  // Profile form state
  const [careerType, setCareerType] = useState('employee');
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [incomeGoal, setIncomeGoal] = useState('');
  const [incomeGoalDate, setIncomeGoalDate] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Exam specific fields
  const [examName, setExamName] = useState('');
  const [examAttempts, setExamAttempts] = useState('');
  const [examExpectedYear, setExamExpectedYear] = useState('');
  const [preferredPosting, setPreferredPosting] = useState('');
  const [coaching, setCoaching] = useState('');
  const [mockTestScore, setMockTestScore] = useState('');
  const [rankGoal, setRankGoal] = useState('');

  // Track form state
  const [trackType, setTrackType] = useState('job');
  const [trackTitle, setTrackTitle] = useState('');
  const [trackCompany, setTrackCompany] = useState('');
  const [trackPriority, setTrackPriority] = useState('secondary');
  const [trackTargetDate, setTrackTargetDate] = useState('');

  // Opportunity form
  const [oppTitle, setOppTitle] = useState('');
  const [oppType, setOppType] = useState('job');
  const [oppCompany, setOppCompany] = useState('');
  const [oppStatus, setOppStatus] = useState('exploring');
  const [oppNotes, setOppNotes] = useState('');
  const [appliedDate, setAppliedDate] = useState('');

  // Skill form
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [skillCategory, setSkillCategory] = useState('Technical');

  // Interview prep form
  const [interviewQuestion, setInterviewQuestion] = useState('');
  const [interviewAnswer, setInterviewAnswer] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Warm up Supabase connection
  useEffect(() => {
    const warmupConnection = async () => {
      if (user) {
        try {
          await supabase.from('career_profile').select('count', { count: 'exact', head: true });
          console.log('Supabase connection ready for Career');
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
    if (!forceRefresh && careerCache && (Date.now() - careerCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached career data');
      setProfile(careerCache.profile);
      setOpportunities(careerCache.opportunities);
      setSkills(careerCache.skills);
      setTracks(careerCache.tracks);
      setLoading(false);
      setInitialLoadDone(true);
      return;
    }
    
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setLoading(true);
    try {
      const [p, o, s, i, t] = await Promise.all([
        supabase.from('career_profile').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('opportunities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('career_skills').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('interview_prep').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('career_tracks').select('*').eq('user_id', user.id).order('priority', { ascending: false }),
      ]);
      
      const cp = p.data as CareerProfile | null;
      setProfile(cp);
      if (cp) {
        setCareerType(cp.career_type || 'employee');
        setRoleTitle(cp.role_title || '');
        setCompanyName(cp.company_name || '');
        setCurrentSalary(cp.current_salary?.toString() || '');
        setTargetSalary(cp.target_salary?.toString() || '');
        setIncomeGoal(cp.income_goal?.toString() || '');
        setIncomeGoalDate(cp.income_goal_date || '');
        setResumeUrl(cp.resume_url || '');
        setPortfolioUrl(cp.portfolio_url || '');
        setLinkedinUrl(cp.linkedin_url || '');
        setGithubUrl(cp.github_url || '');
        setExamName(cp.exam_name || '');
        setExamAttempts(cp.exam_attempts?.toString() || '');
        setExamExpectedYear(cp.exam_expected_year?.toString() || '');
        setPreferredPosting(cp.preferred_posting || '');
        setCoaching(cp.coaching || '');
        setMockTestScore(cp.mock_test_score?.toString() || '');
        setRankGoal(cp.rank_goal?.toString() || '');
      }
      
      const opportunitiesData = (o.data || []) as Opportunity[];
      const skillsData = (s.data || []) as CareerSkill[];
      const interviewPrepData = (i.data || []) as InterviewPrep[];
      const tracksData = (t.data || []) as CareerTrack[];
      
      setOpportunities(opportunitiesData);
      setSkills(skillsData);
      setInterviewPrep(interviewPrepData);
      setTracks(tracksData);
      
      // Update cache
      careerCache = {
        profile: cp,
        opportunities: opportunitiesData,
        skills: skillsData,
        tracks: tracksData,
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

  const saveProfile = async () => {
    if (!user) return;
    if (saving) return;
    
    setSaving(true);
    
    const payload = {
      id: user.id, 
      career_type: careerType, 
      role_title: roleTitle, 
      company_name: companyName,
      current_salary: currentSalary ? parseFloat(currentSalary) : null,
      target_salary: targetSalary ? parseFloat(targetSalary) : null,
      income_goal: incomeGoal ? parseFloat(incomeGoal) : null,
      income_goal_date: incomeGoalDate || null,
      resume_url: resumeUrl, 
      portfolio_url: portfolioUrl,
      linkedin_url: linkedinUrl, 
      github_url: githubUrl,
      exam_name: examName || null,
      exam_attempts: examAttempts ? parseInt(examAttempts) : null,
      exam_expected_year: examExpectedYear ? parseInt(examExpectedYear) : null,
      preferred_posting: preferredPosting || null,
      coaching: coaching || null,
      mock_test_score: mockTestScore ? parseInt(mockTestScore) : null,
      rank_goal: rankGoal ? parseInt(rankGoal) : null,
      updated_at: new Date().toISOString(),
    };
    
    const { data } = await supabase.from('career_profile').upsert(payload).select().single();
    if (data) {
      setProfile(data as CareerProfile);
      careerCache = null; // Invalidate cache
      await loadAllData(true);
    }
    setShowProfile(false);
    setSaving(false);
  };

  // Track CRUD with retry
  const addTrack = async () => {
    if (!trackTitle.trim() || !user) return;
    if (saving) return;
    
    setSaving(true);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase.from('career_tracks').insert({
          user_id: user.id,
          type: trackType,
          title: trackTitle.trim(),
          company_or_exam: trackCompany.trim(),
          priority: trackPriority,
          target_date: trackTargetDate || null,
          status: 'active'
        }).select().single();
        
        if (error) throw error;
        
        if (data) {
          setTracks(prev => [data as CareerTrack, ...prev]);
          careerCache = null;
          resetTrackForm();
          setSaving(false);
          return;
        }
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Failed to add track: ${err.message}`);
        }
      }
    }
    setSaving(false);
  };

  const deleteTrack = async (id: string) => {
    if (!confirm('Delete this career track?')) return;
    await supabase.from('career_tracks').delete().eq('id', id);
    setTracks(prev => prev.filter(t => t.id !== id));
    careerCache = null;
  };

  const resetTrackForm = () => {
    setTrackTitle('');
    setTrackCompany('');
    setTrackType('job');
    setTrackPriority('secondary');
    setTrackTargetDate('');
    setShowTrackForm(false);
  };

  // Opportunity CRUD with retry
  const addOpp = async () => {
    if (!oppTitle.trim() || !user) return;
    if (saving) return;
    
    setSaving(true);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase.from('opportunities').insert({
          user_id: user.id, 
          title: oppTitle.trim(), 
          type: oppType,
          company: oppCompany, 
          status: oppStatus, 
          notes: oppNotes,
          applied_date: appliedDate || null,
        }).select().single();
        
        if (error) throw error;
        
        if (data) {
          setOpportunities(prev => [data as Opportunity, ...prev]);
          careerCache = null;
          resetOppForm();
          setSaving(false);
          return;
        }
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Failed to add opportunity: ${err.message}`);
        }
      }
    }
    setSaving(false);
  };

  const deleteOpp = async (id: string) => {
    if (!confirm('Delete this opportunity?')) return;
    await supabase.from('opportunities').delete().eq('id', id);
    setOpportunities(prev => prev.filter(o => o.id !== id));
    careerCache = null;
  };

  const updateOppStatus = async (id: string, status: string) => {
    const { data } = await supabase.from('opportunities').update({ status }).eq('id', id).select().single();
    if (data) {
      setOpportunities(prev => prev.map(o => o.id === id ? data as Opportunity : o));
      careerCache = null;
    }
  };

  const resetOppForm = () => {
    setOppTitle('');
    setOppCompany('');
    setOppNotes('');
    setAppliedDate('');
    setOppType('job');
    setOppStatus('exploring');
    setShowOppForm(false);
  };

  // Skill CRUD with retry
  const addSkill = async () => {
    if (!skillName.trim()) {
      alert('Please enter a skill name');
      return;
    }
    if (!user) return;
    if (saving) return;
    
    setSaving(true);
    
    const skillData = {
      name: skillName.trim(),
      level: skillLevel,
      category: skillCategory,
    };
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase
          .from('career_skills')
          .insert({
            user_id: user.id,
            name: skillData.name,
            level: skillData.level,
            category: skillData.category,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
          setSkills(prev => [data as CareerSkill, ...prev]);
          careerCache = null;
          setSkillName('');
          setSkillLevel('Intermediate');
          setSkillCategory('Technical');
          setShowSkillForm(false);
          setSaving(false);
          return;
        }
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Failed to add skill: ${err.message}`);
        }
      }
    }
    setSaving(false);
  };

  const deleteSkill = async (id: string) => {
    await supabase.from('career_skills').delete().eq('id', id);
    setSkills(prev => prev.filter(s => s.id !== id));
    careerCache = null;
  };

  const updateSkillLevel = async (id: string, level: string) => {
    const { data } = await supabase.from('career_skills').update({ level }).eq('id', id).select().single();
    if (data) {
      setSkills(prev => prev.map(s => s.id === id ? data as CareerSkill : s));
      careerCache = null;
    }
  };

  // Interview Prep CRUD
  const addInterviewQuestion = async (opportunityId: string) => {
    if (!interviewQuestion.trim() || !user) return;
    if (saving) return;
    
    setSaving(true);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase.from('interview_prep').insert({
          user_id: user.id,
          opportunity_id: opportunityId,
          question: interviewQuestion.trim(),
          answer: interviewAnswer.trim(),
          status: 'pending',
        }).select().single();
        
        if (error) throw error;
        
        if (data) {
          setInterviewPrep(prev => [data as InterviewPrep, ...prev]);
          setInterviewQuestion('');
          setInterviewAnswer('');
          setShowInterviewForm(null);
          setSaving(false);
          return;
        }
      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          alert(`Failed to add question: ${err.message}`);
        }
      }
    }
    setSaving(false);
  };

  const deleteInterviewQuestion = async (id: string) => {
    await supabase.from('interview_prep').delete().eq('id', id);
    setInterviewPrep(prev => prev.filter(i => i.id !== id));
  };

  const updateInterviewStatus = async (id: string, status: 'pending' | 'practiced' | 'mastered') => {
    const { data } = await supabase.from('interview_prep').update({ status }).eq('id', id).select().single();
    if (data) setInterviewPrep(prev => prev.map(i => i.id === id ? data as InterviewPrep : i));
  };

  // Calculations
  const formatSalary = (n?: number) => n ? `₹${(n / 100000).toFixed(1)}L` : '—';
  
  const careerScore = calculateCareerScore(profile, opportunities, skills);
  
  const applicationStats = {
    total: opportunities.length,
    applied: opportunities.filter(o => o.status === 'applied').length,
    interviewing: opportunities.filter(o => o.status === 'interviewing').length,
    offers: opportunities.filter(o => o.status === 'offer').length,
    accepted: opportunities.filter(o => o.status === 'accepted').length,
    rejected: opportunities.filter(o => o.status === 'rejected').length,
  };
  
  const conversionRate = applicationStats.total > 0 
    ? Math.round((applicationStats.accepted / applicationStats.total) * 100) 
    : 0;
  
  const interviewRate = applicationStats.applied > 0
    ? Math.round((applicationStats.interviewing / applicationStats.applied) * 100)
    : 0;
  
  const salaryProgress = profile?.target_salary && profile?.current_salary
    ? Math.min(100, Math.round((profile.current_salary / profile.target_salary) * 100))
    : 0;
  
  const incomeGoalProgress = profile?.income_goal && profile?.current_salary
    ? Math.min(100, Math.round((profile.current_salary / profile.income_goal) * 100))
    : 0;

  const isGovtAspirant = careerType === 'government_aspirant';

  // Loading skeleton
  if (loading && !initialLoadDone) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />)}
          </div>
          <div className="h-32 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
          <div className="h-40 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Career</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Track jobs, skills, and career growth</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowProfile(!showProfile)} className="btn-secondary py-2 px-4 text-sm">
            {showProfile ? 'Cancel' : 'Profile'}
          </button>
          <button onClick={() => setShowOppForm(!showOppForm)} className="btn-primary flex items-center gap-2 py-2 px-4">
            <Plus className="w-4 h-4" />Opportunity
          </button>
        </div>
      </div>

      {/* Career Profile Card */}
      {profile && !showProfile && (
        <div className="card p-5 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="font-semibold text-lg text-[var(--text-primary)]">{profile.role_title || 'Add your role'}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {profile.company_name || ''} · <span className="capitalize">{profile.career_type?.replace('_', ' ')}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-secondary)]">Target Salary</p>
              <p className="text-xl font-bold text-career">{formatSalary(profile.target_salary)}</p>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4 text-sm">
            {profile.current_salary && (
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Current Salary</p>
                <p className="font-medium text-[var(--text-primary)]">{formatSalary(profile.current_salary)}</p>
              </div>
            )}
            {profile.target_salary && (
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Target Salary</p>
                <p className="font-medium text-career">{formatSalary(profile.target_salary)}</p>
              </div>
            )}
          </div>
          
          {isGovtAspirant && profile.exam_name && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> Exam Preparation
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-secondary)]">Target Exam</p>
                  <p className="font-medium text-sm">{profile.exam_name}</p>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-secondary)]">Attempts</p>
                  <p className="font-medium text-sm">{profile.exam_attempts || 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-secondary)]">Target Year</p>
                  <p className="font-medium text-sm">{profile.exam_expected_year || 'Not set'}</p>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-secondary)]">Target Rank</p>
                  <p className="font-medium text-sm">{profile.rank_goal || 'Not set'}</p>
                </div>
              </div>
              {profile.mock_test_score && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)]">Mock Test Score</span>
                    <span className="text-career">{profile.mock_test_score}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill bg-career" style={{ width: `${profile.mock_test_score}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {(profile.linkedin_url || profile.github_url || profile.portfolio_url || profile.resume_url) && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)] mb-2">Links & Profiles</p>
              <div className="flex flex-wrap gap-3">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-career transition-colors">
                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                  </a>
                )}
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-career transition-colors">
                    <Github className="w-3.5 h-3.5" /> GitHub
                  </a>
                )}
                {profile.portfolio_url && (
                  <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-career transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Portfolio
                  </a>
                )}
                {profile.resume_url && (
                  <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-career transition-colors">
                    <FileText className="w-3.5 h-3.5" /> Resume
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Career Score Card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-career/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-career/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-career">{careerScore || 0}</span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Career Score</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {careerScore >= 80 ? '🚀 Excellent trajectory!' : 
                 careerScore >= 60 ? '📈 Good progress!' : 
                 careerScore >= 40 ? '📊 Building momentum' : 
                 careerScore > 0 ? '🎯 Keep growing!' : '🎯 Start tracking to grow'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">Target Salary</p>
            <p className="text-xl font-bold text-career">{formatSalary(profile?.target_salary)}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Briefcase} label="Opportunities" value={applicationStats.total} color="text-career" />
        <StatCard icon={FileCheck} label="Applied" value={applicationStats.applied} color="text-knowledge" />
        <StatCard icon={Users} label="Interviewing" value={applicationStats.interviewing} color="text-career" />
        <StatCard icon={Star} label="Offers" value={applicationStats.offers} color="text-health" />
        <StatCard icon={Award} label="Won" value={applicationStats.accepted} color="text-health" />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Conversion Rate</p>
            <span className="text-sm font-bold text-career">{conversionRate}%</span>
          </div>
          <div className="w-full bg-[var(--border)] rounded-full h-1.5">
            <div className="bg-career h-1.5 rounded-full" style={{ width: `${conversionRate}%` }} />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">Applications → Accepted</p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1"><Users className="w-3 h-3" /> Interview Rate</p>
            <span className="text-sm font-bold text-knowledge">{interviewRate}%</span>
          </div>
          <div className="w-full bg-[var(--border)] rounded-full h-1.5">
            <div className="bg-knowledge h-1.5 rounded-full" style={{ width: `${interviewRate}%` }} />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">Applied → Interviewing</p>
        </div>
      </div>

      {/* Salary Progress */}
      {profile?.target_salary && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-career" /><p className="text-sm font-medium text-[var(--text-primary)]">Salary Goal Progress</p></div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Current: {formatSalary(profile.current_salary)}</span>
            <span className="text-[var(--text-secondary)]">Target: {formatSalary(profile.target_salary)}</span>
          </div>
          <div className="w-full bg-[var(--border)] rounded-full h-2">
            <div className="bg-career h-2 rounded-full transition-all" style={{ width: `${salaryProgress}%` }} />
          </div>
        </div>
      )}

      {/* Income Goal */}
      {profile?.income_goal && (
        <div className="card p-4 mb-6 border-knowledge/20">
          <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-knowledge" /><p className="text-sm font-medium text-[var(--text-primary)]">Income Goal</p></div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Current: {formatSalary(profile.current_salary)}</span>
            <span className="text-[var(--text-secondary)]">Target: {formatSalary(profile.income_goal)}</span>
          </div>
          <div className="w-full bg-[var(--border)] rounded-full h-2">
            <div className="bg-knowledge h-2 rounded-full transition-all" style={{ width: `${incomeGoalProgress}%` }} />
          </div>
          {profile.income_goal_date && (
            <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> Target Date: {new Date(profile.income_goal_date).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {/* Multiple Career Tracks Section */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-career" /><h3 className="font-semibold text-sm">Career Tracks</h3></div>
          <button onClick={() => setShowTrackForm(!showTrackForm)} className="btn-secondary text-xs py-1.5 px-3"><Plus className="w-3 h-3 inline mr-1" /> Add Track</button>
        </div>

        {showTrackForm && (
          <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Track Type</label>
                <select value={trackType} onChange={e => setTrackType(e.target.value)} className="input-base" disabled={saving}>
                  <option value="job">💼 Job / Corporate Career</option>
                  <option value="government_exam">📚 Government Exam Preparation</option>
                  <option value="business">🏢 Business / Entrepreneurship</option>
                  <option value="freelancing">💻 Freelancing</option>
                  <option value="higher_studies">🎓 Higher Studies</option>
                </select>
              </div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">{trackType === 'government_exam' ? 'Exam Name' : 'Role / Title'}</label>
                <input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder={trackType === 'government_exam' ? "e.g., UPSC CSE" : "e.g., Software Engineer"} className="input-base" disabled={saving} />
              </div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">{trackType === 'government_exam' ? 'Coaching / Platform' : 'Company / Organization'}</label>
                <input value={trackCompany} onChange={e => setTrackCompany(e.target.value)} placeholder={trackType === 'government_exam' ? "e.g., Vision IAS" : "e.g., Google"} className="input-base" disabled={saving} />
              </div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Priority</label>
                <select value={trackPriority} onChange={e => setTrackPriority(e.target.value)} className="input-base" disabled={saving}>
                  <option value="primary">⭐ Primary Focus</option>
                  <option value="secondary">🔄 Secondary / Backup</option>
                </select>
              </div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Target Date</label>
                <input type="date" value={trackTargetDate} onChange={e => setTrackTargetDate(e.target.value)} className="input-base" disabled={saving} />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={addTrack} disabled={saving} className="btn-primary py-2 px-4 w-full">{saving ? 'Adding...' : 'Add Track'}</button>
              </div>
            </div>
          </div>
        )}

        {tracks.length === 0 ? (
          <div className="text-center py-8"><Layers className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" /><p className="text-xs text-[var(--text-secondary)]">Add multiple career tracks (Job + Govt Exam + Business)</p></div>
        ) : (
          <div className="space-y-3">
            {tracks.map(track => {
              const isPrimary = track.priority === 'primary';
              return (
                <div key={track.id} className={`p-4 rounded-xl border transition-all ${isPrimary ? 'border-career/30 bg-career/5' : 'border-[var(--border)]'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isPrimary ? 'bg-career text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                          {isPrimary ? '🎯 Primary' : '🔄 Secondary'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)]">
                          {track.type === 'job' ? '💼 Job' : track.type === 'government_exam' ? '📚 Govt Exam' : track.type === 'business' ? '🏢 Business' : track.type === 'freelancing' ? '💻 Freelance' : '🎓 Studies'}
                        </span>
                      </div>
                      <p className="font-medium text-[var(--text-primary)]">{track.title}</p>
                      {track.company_or_exam && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{track.company_or_exam}</p>}
                      {track.target_date && <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> Target: {new Date(track.target_date).toLocaleDateString()}</p>}
                    </div>
                    <button onClick={() => deleteTrack(track.id)} className="text-[var(--text-muted)] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Form */}
      {showProfile && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="font-semibold text-sm mb-4 text-[var(--text-primary)]">Career Profile</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Career Type</label>
              <div className="flex flex-wrap gap-2">
                {careerTypes.map(t => (
                  <button key={t} onClick={() => setCareerType(t)} className={`px-3 py-1.5 rounded-lg text-xs border transition-all capitalize ${careerType === t ? 'border-career bg-career/10 text-career' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                    {t === 'government_aspirant' ? '🎯 Govt Job Aspirant' : t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Role Title</label><input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="e.g. Software Engineer" className="input-base" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Company</label><input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" className="input-base" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Current Salary (₹)</label><input type="number" value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g. 800000" className="input-base" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Target Salary (₹)</label><input type="number" value={targetSalary} onChange={e => setTargetSalary(e.target.value)} placeholder="e.g. 1500000" className="input-base" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Income Goal (₹)</label><input type="number" value={incomeGoal} onChange={e => setIncomeGoal(e.target.value)} placeholder="e.g. 2000000" className="input-base" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Income Goal Date</label><input type="date" value={incomeGoalDate} onChange={e => setIncomeGoalDate(e.target.value)} className="input-base" /></div>
            </div>

            {careerType === 'government_aspirant' && (
              <div className="border-t border-[var(--border)] pt-3 mt-2">
                <p className="text-xs font-medium text-career mb-3 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Government Exam Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Target Exam Name</label><input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g., UPSC CSE, SSC CGL" className="input-base" /></div>
                  <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Attempts So Far</label><input type="number" value={examAttempts} onChange={e => setExamAttempts(e.target.value)} placeholder="0" className="input-base" /></div>
                  <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Target Year</label><input type="number" value={examExpectedYear} onChange={e => setExamExpectedYear(e.target.value)} placeholder="e.g., 2025" className="input-base" /></div>
                  <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Target Rank</label><input type="number" value={rankGoal} onChange={e => setRankGoal(e.target.value)} placeholder="e.g., 100" className="input-base" /></div>
                  <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Coaching Institute</label><input value={coaching} onChange={e => setCoaching(e.target.value)} placeholder="e.g., Vision IAS" className="input-base" /></div>
                  <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Preferred Posting</label><input value={preferredPosting} onChange={e => setPreferredPosting(e.target.value)} placeholder="e.g., Delhi, Home State" className="input-base" /></div>
                  <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Latest Mock Test Score (%)</label><input type="number" value={mockTestScore} onChange={e => setMockTestScore(e.target.value)} placeholder="e.g., 65" className="input-base" /></div>
                </div>
              </div>
            )}
            
            <div className="border-t border-[var(--border)] pt-3 mt-2">
              <p className="text-xs font-medium text-career mb-3">Links & Profiles</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">LinkedIn URL</label><input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://..." className="input-base" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">GitHub URL</label><input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://..." className="input-base" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Portfolio URL</label><input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://..." className="input-base" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Resume URL</label><input value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="https://..." className="input-base" /></div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={saveProfile} disabled={saving} className="btn-primary py-2 px-4">{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowProfile(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Skills Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="section-header flex items-center gap-2"><Brain className="w-4 h-4" /> Skills & Expertise</p>
          <button onClick={() => { setShowSkillForm(!showSkillForm); if (!showSkillForm) { setSkillName(''); setSkillLevel('Intermediate'); setSkillCategory('Technical'); } }} className="btn-secondary text-xs py-1.5 px-3"><Plus className="w-3 h-3 inline mr-1" /> Add Skill</button>
        </div>

        {showSkillForm && (
          <div className="card p-4 mb-4 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input value={skillName} onChange={e => setSkillName(e.target.value)} onKeyDown={e => e.key === 'Enter' && !saving && addSkill()} placeholder="Skill name (e.g., React, Python)" className="input-base md:col-span-2" autoFocus disabled={saving} />
              <select value={skillCategory} onChange={e => setSkillCategory(e.target.value)} className="input-base" disabled={saving}>
                <option value="Technical">Technical</option>
                <option value="Soft Skills">Soft Skills</option>
                <option value="Management">Management</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
              </select>
              <div className="flex gap-2">
                <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)} className="input-base flex-1" disabled={saving}>
                  {skillLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <button onClick={addSkill} disabled={saving} className="btn-primary px-3 whitespace-nowrap">{saving ? 'Adding...' : 'Add'}</button>
                <button onClick={() => { setShowSkillForm(false); setSkillName(''); }} className="btn-ghost px-3" disabled={saving}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {skills.length === 0 ? (
          <div className="text-center py-8 card"><Brain className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" /><p className="text-xs text-[var(--text-secondary)]">Add skills to track your professional growth</p></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <div key={skill.id} className="group relative">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-career/30 transition-all">
                  <span className="text-sm text-[var(--text-primary)]">{skill.name}</span>
                  <select value={skill.level} onChange={e => updateSkillLevel(skill.id, e.target.value)} className="text-[10px] bg-transparent border-none outline-none cursor-pointer text-career">
                    {skillLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button onClick={() => deleteSkill(skill.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-[var(--text-secondary)] hover:text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Opportunities Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3"><p className="section-header flex items-center gap-2"><Briefcase className="w-4 h-4" /> Opportunities</p></div>

        {showOppForm && (
          <div className="card p-4 mb-4 animate-slide-up">
            <div className="space-y-3">
              <input value={oppTitle} onChange={e => setOppTitle(e.target.value)} placeholder="Opportunity title..." className="input-base" autoFocus />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select value={oppType} onChange={e => setOppType(e.target.value)} className="input-base capitalize">{oppTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                <input value={oppCompany} onChange={e => setOppCompany(e.target.value)} placeholder="Company" className="input-base" />
                <select value={oppStatus} onChange={e => setOppStatus(e.target.value)} className="input-base">{oppStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <input type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} className="input-base" />
              </div>
              <textarea value={oppNotes} onChange={e => setOppNotes(e.target.value)} placeholder="Notes, job description link, contact info..." className="input-base min-h-[80px]" />
              <div className="flex gap-2"><button onClick={addOpp} disabled={saving} className="btn-primary py-2 px-4">{saving ? 'Adding...' : 'Add Opportunity'}</button><button onClick={resetOppForm} className="btn-ghost">Cancel</button></div>
            </div>
          </div>
        )}

        {loading && !initialLoadDone ? (
          <div className="space-y-3">{([1,2,3].map(i => <div key={i} className="h-24 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] animate-pulse" />))}</div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-16 card"><Briefcase className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" /><p className="text-[var(--text-secondary)] text-sm">No opportunities yet. Start tracking jobs, clients, and more.</p></div>
        ) : (
          <div className="space-y-3">
            {opportunities.map(opp => (
              <div key={opp.id} className="card-hover p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm text-[var(--text-primary)]">{opp.title}</p>
                      {opp.company && <span className="text-xs text-[var(--text-secondary)]">at {opp.company}</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] capitalize text-[var(--text-secondary)]">{opp.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                      <select value={opp.status} onChange={e => updateOppStatus(opp.id, e.target.value)} className={`bg-transparent border-none outline-none cursor-pointer font-medium ${statusColors[opp.status]}`}>
                        {oppStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {opp.applied_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Applied: {new Date(opp.applied_date).toLocaleDateString()}</span>}
                    </div>
                    {opp.notes && <p className="text-xs text-[var(--text-secondary)] mt-2">{opp.notes}</p>}
                    
                    <div className="mt-3">
                      <button onClick={() => setShowInterviewForm(showInterviewForm === opp.id ? null : opp.id)} className="text-xs text-career flex items-center gap-1"><MessageSquare className="w-3 h-3" />{showInterviewForm === opp.id ? 'Hide' : 'Add Interview Questions'}</button>
                      {showInterviewForm === opp.id && (
                        <div className="mt-2 space-y-2">
                          <textarea value={interviewQuestion} onChange={e => setInterviewQuestion(e.target.value)} placeholder="Interview question..." className="input-base text-sm" rows={2} />
                          <textarea value={interviewAnswer} onChange={e => setInterviewAnswer(e.target.value)} placeholder="Your answer / notes..." className="input-base text-sm" rows={2} />
                          <button onClick={() => addInterviewQuestion(opp.id)} disabled={saving} className="btn-primary text-xs py-1.5 px-3">Add Question</button>
                        </div>
                      )}
                      {interviewPrep.filter(i => i.opportunity_id === opp.id).length > 0 && (
                        <div className="mt-2 space-y-2">
                          {interviewPrep.filter(i => i.opportunity_id === opp.id).map(q => (
                            <div key={q.id} className="bg-[var(--bg-secondary)] rounded-lg p-2 text-xs">
                              <div className="flex items-start justify-between">
                                <div className="flex-1"><p className="font-medium text-career mb-1">{q.question}</p><p className="text-[var(--text-secondary)]">{q.answer}</p></div>
                                <div className="flex items-center gap-1 ml-2">
                                  <button onClick={() => updateInterviewStatus(q.id, q.status === 'pending' ? 'practiced' : q.status === 'practiced' ? 'mastered' : 'pending')} className={`px-2 py-0.5 rounded text-[10px] ${q.status === 'mastered' ? 'bg-green-500/20 text-green-400' : q.status === 'practiced' ? 'bg-knowledge/20 text-knowledge' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>{q.status}</button>
                                  <button onClick={() => deleteInterviewQuestion(q.id)}><Trash2 className="w-3 h-3 text-[var(--text-secondary)] hover:text-red-400" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteOpp(opp.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="card p-4 text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-2`} />
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{label}</p>
    </div>
  );
}

// Calculate Career Score
function calculateCareerScore(profile: CareerProfile | null, opportunities: Opportunity[], skills: CareerSkill[]): number {
  let score = 0;
  
  let profileComplete = 0;
  if (profile?.role_title) profileComplete += 10;
  if (profile?.company_name) profileComplete += 5;
  if (profile?.current_salary) profileComplete += 5;
  if (profile?.target_salary) profileComplete += 5;
  if (profile?.linkedin_url) profileComplete += 5;
  profileComplete = Math.min(30, profileComplete);
  score += profileComplete;
  
  const skillScore = Math.min(20, skills.length * 4);
  score += skillScore;
  
  const acceptedCount = opportunities.filter(o => o.status === 'accepted').length;
  const interviewingCount = opportunities.filter(o => o.status === 'interviewing').length;
  const appliedCount = opportunities.filter(o => o.status === 'applied').length;
  
  let oppScore = 0;
  oppScore += Math.min(15, acceptedCount * 5);
  oppScore += Math.min(10, interviewingCount * 3);
  oppScore += Math.min(5, appliedCount * 1);
  score += Math.min(30, oppScore);
  
  if (profile?.income_goal && profile?.current_salary) {
    const incomeProgress = Math.min(20, (profile.current_salary / profile.income_goal) * 20);
    score += incomeProgress;
  } else if (profile?.target_salary && profile?.current_salary) {
    const salaryProgress = Math.min(20, (profile.current_salary / profile.target_salary) * 20);
    score += salaryProgress;
  } else {
    score += 0;
  }
  
  if (score === 0) return 0;
  return Math.min(100, Math.round(score));
}