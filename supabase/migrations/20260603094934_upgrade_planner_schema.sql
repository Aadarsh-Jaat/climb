/*
  # Climb Planner Upgrade

  ## Overview
  Separates Tasks and Routines, adds task history, enhances goals with editing and activity tracking.

  ## New Tables

  ### routines
  - Daily recurring actions that auto-reset
  - Similar to habits but specifically for daily routines
  - Examples: Walk 10k steps, Workout, Read 10 pages

  ### routine_logs
  - Daily completion logs for routines
  - Tracks if routine was completed each day

  ### task_history
  - Archive of all completed tasks
  - Stores completion data for reference

  ### goal_activity
  - Tracks historical values for each goal
  - Enables progress charts and trend analysis
  - Fields: value, date, for each goal

  ## Modified Tables

  ### goals
  - Add: start_value (new field)
  - Rename: current_value → current_value (stays same)
  - Rename: target → target_value
  - Update: progress formula now uses (current - start) / (target - start)
  - Keep: created_at, updated_at

  ### tasks
  - No schema changes
  - Will be separated UI from routines

  ## Security
  - All tables have RLS enabled
  - All policies restrict to authenticated users accessing their own data only
*/

-- ROUTINES
CREATE TABLE IF NOT EXISTS routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  category text DEFAULT 'health',
  description text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routines"
  ON routines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routines"
  ON routines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routines"
  ON routines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own routines"
  ON routines FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ROUTINE LOGS
CREATE TABLE IF NOT EXISTS routine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE routine_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routine logs"
  ON routine_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routine logs"
  ON routine_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routine logs"
  ON routine_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own routine logs"
  ON routine_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TASK HISTORY
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  category text DEFAULT 'personal',
  priority text DEFAULT 'medium',
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  created_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task history"
  ON task_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task history"
  ON task_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own task history"
  ON task_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- GOAL ACTIVITY
CREATE TABLE IF NOT EXISTS goal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal activity"
  ON goal_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal activity"
  ON goal_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goal activity"
  ON goal_activity FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own goal activity"
  ON goal_activity FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Update GOALS table to add start_value and rename target to target_value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'start_value'
  ) THEN
    ALTER TABLE goals ADD COLUMN start_value numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'target_value'
  ) THEN
    ALTER TABLE goals ADD COLUMN target_value numeric;
    UPDATE goals SET target_value = target WHERE target IS NOT NULL;
  END IF;
END $$;
