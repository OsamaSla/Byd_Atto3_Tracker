import { Battery, TrendingUp, Gauge, Calendar } from 'lucide-react';
import { StatCard } from './ui/GlassCard';
import { useDriveLogs, useChargingSessions, useSettings } from '../hooks/useData';
import { calculateRangeStats, calculateBatteryHealth, calculateFuelSavings } from '../lib/analytics';
import { format } from 'date-fns';

export function Dashboard() {
  const { driveLogs } = useDriveLogs();
  const { chargingSessions } = useChargingSessions();
  const { settings } = useSettings();

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyan-400">Loading...</div>
      </div>
    );
  }

  const rangeStats = calculateRangeStats(driveLogs);
  const batteryHealth = calculateBatteryHealth(driveLogs, chargingSessions, settings);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fuelSavings = calculateFuelSavings(driveLogs, settings, monthStart);

  const lastCalibration = chargingSessions.find(s => s.is_full_charge);
  const daysSinceCalibration = lastCalibration
    ? Math.floor((now.getTime() - new Date(lastCalibration.end_time).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const currentSoc = driveLogs[0]?.end_soc || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-100 mb-2">Battery Status</h2>
        <p className="text-slate-400/80">Real-time monitoring and analytics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Current Charge"
          value={currentSoc.toFixed(1)}
          unit="%"
          icon={<Battery className="w-6 h-6 text-[#00ffff] [filter:drop-shadow(0_0_5px_rgba(0,255,255,0.55))]" />}
        />

        <StatCard
          title="Projected Range"
          value={rangeStats.projectedRange.toFixed(0)}
          unit="km"
          icon={<Gauge className="w-6 h-6 text-[#00ffff] [filter:drop-shadow(0_0_5px_rgba(0,255,255,0.55))]" />}
          trend={`Based on ${rangeStats.lastFiveDrives} drives`}
        />

        <StatCard
          title="Efficiency"
          value={rangeStats.avgKmPerPercent.toFixed(2)}
          unit="km/1%"
          icon={<TrendingUp className="w-6 h-6 text-[#00ffff] [filter:drop-shadow(0_0_5px_rgba(0,255,255,0.55))]" />}
        />

        <StatCard
          title="Battery Health"
          value={batteryHealth.stateOfHealth.toFixed(1)}
          unit="% SoH"
          icon={<Battery className="w-6 h-6 text-[#00ffff] [filter:drop-shadow(0_0_5px_rgba(0,255,255,0.55))]" />}
          trend={`${batteryHealth.currentCapacityKwh.toFixed(2)} kWh`}
        />

        <StatCard
          title="Monthly Savings"
          value={fuelSavings.totalSaved.toFixed(2)}
          unit="₪"
          icon={<span className="text-[#00ffff] text-2xl font-semibold leading-none [text-shadow:0_0_7px_rgba(0,255,255,0.55)]">₪</span>}
          trend={`${fuelSavings.co2Saved.toFixed(1)} kg CO₂ saved`}
        />

        <StatCard
          title="Last 100% Charge"
          value={daysSinceCalibration !== null ? daysSinceCalibration : 'Never'}
          unit={daysSinceCalibration !== null ? 'days ago' : ''}
          icon={<Calendar className="w-6 h-6 text-[#00ffff] [filter:drop-shadow(0_0_5px_rgba(0,255,255,0.55))]" />}
          trend={lastCalibration ? format(new Date(lastCalibration.end_time), 'dd/MM/yyyy') : 'No calibration'}
        />
      </div>

      {daysSinceCalibration !== null && daysSinceCalibration > 30 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            <strong>Calibration Reminder:</strong> It's been {daysSinceCalibration} days since your last 100% charge.
            Consider charging to 100% soon for optimal battery cell balancing.
          </p>
        </div>
      )}
    </div>
  );
}

