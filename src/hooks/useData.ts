import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

type DriveLog = Database['public']['Tables']['drive_logs']['Row'];
type ChargingSession = Database['public']['Tables']['charging_sessions']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export function useDriveLogs() {
  const { user } = useAuth();
  const [driveLogs, setDriveLogs] = useState<DriveLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDriveLogs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('drive_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (!error && data) {
      setDriveLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDriveLogs();
  }, [user]);

  return { driveLogs, loading, refetch: fetchDriveLogs };
}

export function useChargingSessions() {
  const { user } = useAuth();
  const [chargingSessions, setChargingSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChargingSessions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('charging_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (!error && data) {
      setChargingSessions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChargingSessions();
  }, [user]);

  return { chargingSessions, loading, refetch: fetchChargingSessions };
}

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings(data);
    } else if (!data && !error) {
      const { data: newSettings } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          kwh_price: 0.30,
          petrol_price: 1.80,
          battery_capacity_kwh: 60.48,
          avg_petrol_consumption: 7.0,
        } as any)
        .select()
        .single();

      if (newSettings) {
        setSettings(newSettings);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return { settings, loading, refetch: fetchSettings };
}
