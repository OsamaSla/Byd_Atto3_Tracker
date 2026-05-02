/*
  # BYD Atto 3 Blade Battery Pro - Database Schema

  ## Overview
  Complete battery management system for tracking drives, charging sessions, 
  battery health, and cost analytics.

  ## New Tables

  ### `drive_logs`
  Tracks individual driving sessions with battery consumption data
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `start_time` (timestamptz) - When the drive started
  - `end_time` (timestamptz) - When the drive ended
  - `start_soc` (numeric) - Starting State of Charge (%)
  - `end_soc` (numeric) - Ending State of Charge (%)
  - `distance_km` (numeric) - Distance driven in kilometers
  - `notes` (text) - Optional user notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### `charging_sessions`
  Tracks battery charging events
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `start_time` (timestamptz) - Charging start time
  - `end_time` (timestamptz) - Charging end time
  - `start_soc` (numeric) - SoC at charging start (%)
  - `end_soc` (numeric) - SoC at charging end (%)
  - `kwh_added` (numeric) - Energy added in kWh
  - `cost` (numeric) - Charging cost
  - `location` (text) - Charging location
  - `is_full_charge` (boolean) - Whether charged to 100%
  - `created_at` (timestamptz) - Record creation timestamp

  ### `battery_calibrations`
  Tracks 100% calibration events for cell balancing
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `calibration_date` (timestamptz) - When 100% charge was performed
  - `notes` (text) - Optional notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### `user_settings`
  Stores user preferences and configuration
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `kwh_price` (numeric) - Price per kWh (default 0.30)
  - `petrol_price` (numeric) - Price per liter (default 1.80)
  - `battery_capacity_kwh` (numeric) - Battery capacity (default 60.48)
  - `avg_petrol_consumption` (numeric) - L/100km for comparison (default 7.0)
  - `updated_at` (timestamptz) - Last update timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Authenticated access required for all operations
*/

-- Create drive_logs table
CREATE TABLE IF NOT EXISTS drive_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL DEFAULT now(),
  start_soc numeric(5,2) NOT NULL CHECK (start_soc >= 0 AND start_soc <= 100),
  end_soc numeric(5,2) NOT NULL CHECK (end_soc >= 0 AND end_soc <= 100),
  distance_km numeric(8,2) NOT NULL CHECK (distance_km >= 0),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drive_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drive logs"
  ON drive_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drive logs"
  ON drive_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drive logs"
  ON drive_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drive logs"
  ON drive_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create charging_sessions table
CREATE TABLE IF NOT EXISTS charging_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL DEFAULT now(),
  start_soc numeric(5,2) NOT NULL CHECK (start_soc >= 0 AND start_soc <= 100),
  end_soc numeric(5,2) NOT NULL CHECK (end_soc >= 0 AND end_soc <= 100),
  kwh_added numeric(8,2) DEFAULT 0 CHECK (kwh_added >= 0),
  cost numeric(10,2) DEFAULT 0 CHECK (cost >= 0),
  location text DEFAULT '',
  is_full_charge boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE charging_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own charging sessions"
  ON charging_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own charging sessions"
  ON charging_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own charging sessions"
  ON charging_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own charging sessions"
  ON charging_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create battery_calibrations table
CREATE TABLE IF NOT EXISTS battery_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  calibration_date timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE battery_calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calibrations"
  ON battery_calibrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calibrations"
  ON battery_calibrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calibrations"
  ON battery_calibrations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calibrations"
  ON battery_calibrations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  kwh_price numeric(6,3) DEFAULT 0.30 CHECK (kwh_price >= 0),
  petrol_price numeric(6,3) DEFAULT 1.80 CHECK (petrol_price >= 0),
  battery_capacity_kwh numeric(6,2) DEFAULT 60.48 CHECK (battery_capacity_kwh > 0),
  avg_petrol_consumption numeric(5,2) DEFAULT 7.0 CHECK (avg_petrol_consumption > 0),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drive_logs_user_time ON drive_logs(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_user_time ON charging_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_battery_calibrations_user_date ON battery_calibrations(user_id, calibration_date DESC);