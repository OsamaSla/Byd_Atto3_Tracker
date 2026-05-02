import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDriveLogs, useChargingSessions } from '../hooks/useData';
import { checkChargingLogic } from '../lib/analytics';

export function DriveLogger() {
  const { user } = useAuth();
  const { driveLogs, refetch } = useDriveLogs();
  const { chargingSessions } = useChargingSessions();

  const getLocalDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [startSoc, setStartSoc] = useState('');
  const [endSoc, setEndSoc] = useState('');
  const [startTime, setStartTime] = useState(getLocalDateTime());
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const clampSocInput = (value: string) => {
    if (value === '') return '';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return value;
    return Math.min(100, Math.max(0, numeric)).toString();
  };

  useEffect(() => {
    if (startSoc && driveLogs.length > 0) {
      const lastLog = driveLogs[0];
      const result = checkChargingLogic(parseFloat(startSoc), lastLog, chargingSessions);
      if (result.needsChargingLog) {
        setWarning(result.message);
      } else {
        setWarning('');
      }
    }
  }, [startSoc, driveLogs, chargingSessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const startSocNum = parseFloat(startSoc);
    const endSocNum = parseFloat(endSoc);
    const distanceNum = parseFloat(distance);

    if (startSocNum < 0 || startSocNum > 100) {
      setError('Start SoC must be between 0 and 100%');
      setLoading(false);
      return;
    }

    if (endSocNum < 0 || endSocNum > 100) {
      setError('End SoC must be between 0 and 100%');
      setLoading(false);
      return;
    }

    if (endSocNum >= startSocNum) {
      setError('End SoC must be lower than Start SoC (battery consumed during drive)');
      setLoading(false);
      return;
    }

    if (distanceNum <= 0) {
      setError('Distance must be greater than 0');
      setLoading(false);
      return;
    }

        try {
      const { error: insertError } = await supabase.from('drive_logs').insert({
        user_id: user!.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(startTime).toISOString(),
        start_soc: startSocNum,
        end_soc: endSocNum,
        distance_km: distanceNum,
        notes,
      } as any);

      if (insertError) throw insertError;

            setStartSoc('');
            setEndSoc('');
            setStartTime(getLocalDateTime());
            setDistance('');
      setNotes('');
      setWarning('');
      await refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save drive log';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <Car className="w-6 h-6 text-cyan-300 drop-shadow" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-cyan-100">Log Drive</h2>
          <p className="text-sm text-slate-400/80">Track your journey and consumption</p>
        </div>
      </div>

      {warning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-400 text-sm">{warning}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startSoc" className="block text-sm font-medium text-cyan-100 mb-2">
              Start SoC (%)
            </label>
            <input
              id="startSoc"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={startSoc}
              onChange={(e) => setStartSoc(clampSocInput(e.target.value))}
              className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              placeholder="85.0"
              required
            />
          </div>

          <div>
            <label htmlFor="endSoc" className="block text-sm font-medium text-cyan-100 mb-2">
              End SoC (%)
            </label>
            <input
              id="endSoc"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={endSoc}
              onChange={(e) => setEndSoc(clampSocInput(e.target.value))}
              className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              placeholder="65.0"
              required
            />
          </div>
        </div>

                <div>
          <label htmlFor="driveStartTime" className="block text-sm font-medium text-cyan-100 mb-2">
            Date & Time
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/50" />
            <input
              id="driveStartTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all [color-scheme:dark]"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-cyan-100 mb-2">
            Distance (km)
          </label>
          <input
            id="distance"
            type="number"
            step="0.1"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
            placeholder="120.5"
            required
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-cyan-100 mb-2">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all resize-none"
            placeholder="Highway trip, AC on..."
            rows={3}
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Log Drive'
          )}
        </button>
      </form>
    </GlassCard>
  );
}
