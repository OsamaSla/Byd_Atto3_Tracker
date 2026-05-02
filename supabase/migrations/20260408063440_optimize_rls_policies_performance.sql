/*
  # Optimize RLS Policy Performance

  Replace direct auth.uid() calls with (select auth.uid()) to prevent 
  re-evaluation for each row and improve query performance at scale.

  This is a best practice for Supabase RLS policies that check user 
  authentication across multiple rows.
*/

DROP POLICY "Users can view own drive logs" ON drive_logs;
CREATE POLICY "Users can view own drive logs"
  ON drive_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Users can insert own drive logs" ON drive_logs;
CREATE POLICY "Users can insert own drive logs"
  ON drive_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can update own drive logs" ON drive_logs;
CREATE POLICY "Users can update own drive logs"
  ON drive_logs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can delete own drive logs" ON drive_logs;
CREATE POLICY "Users can delete own drive logs"
  ON drive_logs FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Users can view own charging sessions" ON charging_sessions;
CREATE POLICY "Users can view own charging sessions"
  ON charging_sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Users can insert own charging sessions" ON charging_sessions;
CREATE POLICY "Users can insert own charging sessions"
  ON charging_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can update own charging sessions" ON charging_sessions;
CREATE POLICY "Users can update own charging sessions"
  ON charging_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can delete own charging sessions" ON charging_sessions;
CREATE POLICY "Users can delete own charging sessions"
  ON charging_sessions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Users can view own calibrations" ON battery_calibrations;
CREATE POLICY "Users can view own calibrations"
  ON battery_calibrations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Users can insert own calibrations" ON battery_calibrations;
CREATE POLICY "Users can insert own calibrations"
  ON battery_calibrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can update own calibrations" ON battery_calibrations;
CREATE POLICY "Users can update own calibrations"
  ON battery_calibrations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can delete own calibrations" ON battery_calibrations;
CREATE POLICY "Users can delete own calibrations"
  ON battery_calibrations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can delete own settings" ON user_settings;
CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP INDEX IF EXISTS idx_battery_calibrations_user_date;