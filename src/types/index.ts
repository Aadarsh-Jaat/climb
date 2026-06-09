export type Pillar = 'health' | 'knowledge' | 'career' | 'wealth' | 'business' | 'personal';

export interface Profile {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  selected_pillars: Pillar[];
  onboarding_completed: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  pillar: Pillar;
  start_value: number;
  current_value: number;
  target_value?: number;  // Keep only this, remove target?
  unit: string;
  target_age?: number;
  target_date?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalActivity {
  id: string;
  goal_id: string;
  user_id: string;
  value: number;
  activity_date: string;
  notes: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  category: Pillar;
  due_date?: string;
  completed: boolean;
  recurring?: string;
  priority: 'low' | 'medium' | 'high';
  notes: string;
  created_at: string;
  updated_at: string;
}

// In your types/index.ts, update the Habit interface
export interface Habit {
  id: string;
  user_id: string;
  title: string;
  category: Pillar;
  description?: string;  // ADD THIS - optional description
  streak: number;
  best_streak: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  logged_date: string;
  completed: boolean;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  category: Pillar;
  description: string;
  active: boolean;
  // completed?: boolean;  // Remove this - completion is in RoutineLog
  created_at: string;
  updated_at: string;
}

export interface RoutineLog {
  id: string;
  routine_id: string;
  user_id: string;
  logged_date: string;
  completed: boolean;
  created_at: string;
}

export interface TaskHistoryRecord {
  id: string;
  user_id: string;
  title: string;
  category: Pillar;
  priority: 'low' | 'medium' | 'high';
  completed_date: string;
  due_date?: string;
  created_date?: string;
  created_at: string;
}

export interface HealthProfile {
  id: string;
  primary_goal: string | null;
  current_weight: number | null;
  goal_weight: number | null;
  height: number | null;
  target_date: string | null;
  water_goal: number | null;
  steps_goal: number | null;
  created_at: string;
  updated_at: string;
}

export interface HealthLog {
  id: string;
  user_id: string;
  log_date: string;
  weight: number | null;
  steps: number | null;
  water_ml: number | null;
  sleep_hours: number | null;
  workout_done: boolean;
  workout_type: string | null;        // ADD THIS
  workout_duration: number | null;    // ADD THIS
  workout_notes: string | null;
  calories_burned: number | null;     // ADD THIS
  mood: number | null;                // ADD THIS
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  level: number;
  category: string;
  notes: string;

  start_date?: string;
  completed_date?: string;
  status?: 'learning' | 'paused' | 'completed';

  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  status: 'reading' | 'completed' | 'want_to_read';

  start_date?: string;
  completed_date?: string;

  pages_total?: number;
  pages_read: number;
  rating?: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  type: 'course' | 'certification' | 'workshop';
  status: 'in_progress' | 'completed' | 'paused';

  start_date?: string;
  completed_date?: string;

  progress: number;
  created_at: string;
}
export interface CareerTrack {
  id: string;
  type: 'job' | 'government_exam' | 'business' | 'freelancing' | 'higher_studies';
  title: string;  // e.g., "Software Engineer" or "UPSC CSE"
  company_or_exam: string;  // e.g., "Google" or "UPSC"
  status: 'active' | 'paused' | 'completed';
  priority: 'primary' | 'secondary';
  target_date?: string;
  notes?: string;
}

// types/index.ts

export interface CareerProfile {
  id: string;
  career_type: string;
  role_title: string;
  company_name: string;
  current_salary?: number;
  target_salary?: number;
  income_goal?: number;
  income_goal_date?: string;
  resume_url: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
  // NEW FIELDS FOR GOVERNMENT ASPIRANTS
  exam_name?: string;           // e.g., UPSC CSE, SSC CGL, RBI Grade B
  exam_attempts?: number;       // Number of attempts so far
  exam_expected_year?: number;  // Target year to clear
  preferred_posting?: string;   // Preferred location/department
  coaching?: string;            // Coaching institute name
  mock_test_score?: number;     // Latest mock test score
  rank_goal?: number;           // Target rank
  created_at?: string;
  updated_at?: string;
}
export interface Opportunity {
  id: string;
  user_id: string;
  title: string;
  type: 'job' | 'client' | 'partnership' | 'lead';
  company: string;
  status: 'exploring' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'accepted';
  notes: string;
  applied_date?: string;          // ADD THIS
  created_at: string;
  updated_at: string;
}
// Add these new interfaces to your types/index.ts
export interface CareerSkill {
  id: string;
  user_id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  category: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewPrep {
  id: string;
  user_id: string;
  opportunity_id: string;
  question: string;
  answer: string;
  status: 'pending' | 'practiced' | 'mastered';
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'bank' | 'wallet' | 'cash';
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: 'gold' | 'property' | 'vehicle' | 'business' | 'other';
  value: number;
  notes: string;
  created_at: string;
  updated_at: string;
}
// Add Loan interface
export interface Loan {
  id: string;
  user_id: string;
  name: string;           // Person's name
  type: 'lent' | 'borrowed';
  amount: number;
  remaining_amount: number;
  interest_rate?: number;
  due_date?: string;
  status: 'active' | 'partially_paid' | 'completed' | 'defaulted';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Also add to your existing exports
// Find your Investment interface and update it to:
export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: 'mutual_fund' | 'stocks' | 'etf' | 'fd' | 'ppf' | 'epf' | 'nps' | 'crypto';
  invested_amount: number;
  current_value: number;
  interest_rate?: number;        // ADD THIS - for FD, PPF, EPF, NPS
  tenure_months?: number;        // ADD THIS - for FD
  maturity_amount?: number;      // ADD THIS - for FD
  maturity_date?: string;        // ADD THIS - for FD
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type: 'loan' | 'credit_card' | 'other';
  amount: number;
  interest_rate: number;
  emi: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WealthGoal {
  id: string;
  user_id: string;
  name: string;
  type: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  type: string;
  description: string;
  monthly_revenue: number;
  monthly_expenses: number;
  revenue_goal?: number;      // ADD THIS
  profit_goal?: number;       // ADD THIS
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessEntry {
  id: string;
  business_id: string;
  user_id: string;
  type: 'revenue' | 'expense';
  amount: number;
  description: string;
  entry_date: string;
  recurring?: string;         // ADD THIS
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}
