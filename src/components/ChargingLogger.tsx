import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Info, Loader2, Calendar, Bluetooth, BluetoothConnected, BluetoothSearching } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useChargingSessions, useSettings } from '../hooks/useData';
import { obdService } from '../lib/obd';

export function ChargingLogger() {
  const { user } = useAuth();
  const { refetch } = useChargingSessions();

  const handleConnectOBD = async () => {
    setObdStatus('connecting');
    const success = await obdService.connect();
    if (success) {
      setObdStatus('connected');
      const data = await obdService.fetchData();
      if (data.soc !== null) {
        setStartSoc(data.soc.toString());
      }
    } else {
      setObdStatus('disconnected');
      setError('Failed to connect to OBD scanner.');
    }
  };

  const handleFetchOBD = async () => {
    const data = await obdService.fetchData();
    if (data.soc !== null) {
      setEndSoc(data.soc.toString());
    }
  };
  const { settings } = useSettings();

  const getLocalDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [startSoc, setStartSoc] = useState('');
  const [endSoc, setEndSoc] = useState('');
  const [startTime, setStartTime] = useState(getLocalDateTime());
  const [costPerKwh, setCostPerKwh] = useState('');
  const [location, setLocation] = useState('');
  const [isFullCharge, setIsFullCharge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [obdStatus, setObdStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showCalibrationInfo, setShowCalibrationInfo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const startSocNum = parseFloat(startSoc);
    const endSocNum = parseFloat(endSoc);
    const costPerKwhNum = parseFloat(costPerKwh || '0');

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

    if (endSocNum <= startSocNum) {
      setError('End SoC must be higher than Start SoC (battery charged)');
      setLoading(false);
      return;
    }

    if (costPerKwhNum < 0) {
      setError('Cost per kWh cannot be negative');
      setLoading(false);
      return;
    }

    try {
      const socGained = endSocNum - startSocNum;
      const kwhAdded = settings
        ? (socGained / 100) * settings.battery_capacity_kwh
        : (socGained / 100) * 60.48;

      const totalCost = kwhAdded * costPerKwhNum;

            const { error: insertError } = await supabase.from('charging_sessions').insert({
        user_id: user!.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(startTime).toISOString(),
        start_soc: startSocNum,
        end_soc: endSocNum,
        kwh_added: kwhAdded,
        cost: totalCost,
        location,
        is_full_charge: isFullCharge,
      } as any);

      if (insertError) throw insertError;

      if (isFullCharge) {
        const { error: calibrationError } = await supabase.from('battery_calibrations').insert({
          user_id: user!.id,
          calibration_date: new Date(startTime).toISOString(),
          notes: `100% charge at ${location || 'unspecified location'}`,
        } as any);

        if (calibrationError) throw calibrationError;
      }

            setStartSoc('');
            setEndSoc('');
            setStartTime(getLocalDateTime());
            setCostPerKwh('');
      setLocation('');
      setIsFullCharge(false);
      await refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save charging session';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Zap className="w-6 h-6 text-cyan-300 drop-shadow" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-cyan-100">Log Charging</h2>
            <p className="text-sm text-slate-400/80">Track charging sessions and costs</p>
          </div>
        </div>
        <button
          type="button"
          onClick={obdStatus === 'connected' ? handleFetchOBD : handleConnectOBD}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            obdStatus === 'connected'
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400'
          }`}
        >
          {obdStatus === 'connecting' ? (
            <BluetoothSearching className="w-4 h-4 animate-pulse" />
          ) : obdStatus === 'connected' ? (
            <BluetoothConnected className="w-4 h-4" />
          ) : (
            <Bluetooth className="w-4 h-4" />
          )}
          <span className="text-xs font-medium">
            {obdStatus === 'connecting' ? 'Connecting...' : obdStatus === 'connected' ? 'Fetch SoC' : 'Connect Car'}
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="chargingStartSoc" className="block text-sm font-medium text-cyan-100 mb-2">
              Start SoC (%)
            </label>
            <input
              id="chargingStartSoc"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={startSoc}
              onChange={(e) => setStartSoc(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              placeholder="30.0"
              required
            />
          </div>

          <div>
            <label htmlFor="chargingEndSoc" className="block text-sm font-medium text-cyan-100 mb-2">
              End SoC (%)
            </label>
            <input
              id="chargingEndSoc"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={endSoc}
              onChange={(e) => setEndSoc(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              placeholder="80.0"
              required
            />
          </div>
        </div>

                <div>
          <label htmlFor="chargingStartTime" className="block text-sm font-medium text-cyan-100 mb-2">
            Date & Time
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/50" />
            <input
              id="chargingStartTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all [color-scheme:dark]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="costPerKwh" className="block text-sm font-medium text-cyan-100 mb-2">
              Cost per kWh (₪)
            </label>
            <input
              id="costPerKwh"
              type="number"
              step="0.01"
              min="0"
              value={costPerKwh}
              onChange={(e) => setCostPerKwh(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              placeholder="0.55"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-cyan-100 mb-2">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              placeholder="Home / Supercharger"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20">
          <div className="flex items-center gap-2">
            <input
              id="fullCharge"
              type="checkbox"
              checked={isFullCharge}
              onChange={(e) => setIsFullCharge(e.target.checked)}
              className="w-5 h-5 rounded border-cyan-500/30 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-400/50"
            />
            <label htmlFor="fullCharge" className="text-sm font-medium text-cyan-100">
              100% Calibration Charge
            </label>
            <button
              type="button"
              onClick={() => setShowCalibrationInfo(!showCalibrationInfo)}
              className="text-slate-400/80 hover:text-cyan-400 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showCalibrationInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400"
          >
            <p className="font-semibold mb-2">About 100% Calibration:</p>
            <p>
              LFP batteries (Blade Battery) benefit from periodic 100% charges for cell balancing.
              BYD recommends charging to 100% every 2-4 weeks to maintain optimal battery health
              and accurate SoC readings.
            </p>
          </motion.div>
        )}

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
            'Log Charging Session'
          )}
        </button>
      </form>
    </GlassCard>
  );
}

