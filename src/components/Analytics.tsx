import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Battery, Activity } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { useDriveLogs, useChargingSessions, useSettings } from '../hooks/useData';
import { getEfficiencyTrend, calculateBatteryHealth } from '../lib/analytics';
import { format } from 'date-fns';

export function Analytics() {
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

  const efficiencyTrend = getEfficiencyTrend(driveLogs, 7);

  const socHistory = [...driveLogs, ...chargingSessions]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(-20)
    .map((entry: any) => ({
      date: format(new Date(entry.start_time), 'dd/MM'),
      soc: 'end_soc' in entry ? entry.end_soc : (entry as any).end_soc,
      type: 'distance_km' in entry ? 'drive' : 'charge',
    }));

  const batteryHealth = calculateBatteryHealth(driveLogs, chargingSessions, settings);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthDrives = driveLogs.filter(log => {
      const logDate = new Date(log.start_time);
      return logDate >= monthStart && logDate <= monthEnd;
    });

    const totalKm = monthDrives.reduce((sum, log) => sum + log.distance_km, 0);
    const totalSocUsed = monthDrives.reduce((sum, log) => sum + (log.start_soc - log.end_soc), 0);
    const totalKwh = (totalSocUsed / 100) * settings.battery_capacity_kwh;

    const monthCharges = chargingSessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= monthStart && sessionDate <= monthEnd;
    });

    const totalCost = monthCharges.reduce((sum, session) => sum + session.cost, 0);

    return {
      month: format(monthStart, 'MMM'),
      distance: totalKm,
      energy: totalKwh,
      cost: totalCost,
      efficiency: totalSocUsed > 0 ? totalKm / totalSocUsed : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-100 mb-2">Analytics</h2>
        <p className="text-slate-400/80">Performance insights and trends</p>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <TrendingUp className="w-6 h-6 text-cyan-300 drop-shadow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-cyan-100">7-Day Efficiency Trend</h3>
            <p className="text-sm text-slate-400/80">Daily driving efficiency in km/1%</p>
          </div>
        </div>

        {efficiencyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={efficiencyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e7490" opacity={0.1} />
              <XAxis
                dataKey="date"
                stroke="#67e8f9"
                style={{ fontSize: '12px' }}
                tickFormatter={(date) => format(new Date(date), 'dd/MM')}
              />
              <YAxis stroke="#67e8f9" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                  borderRadius: '8px',
                  color: '#e0f2fe',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="efficiency"
                stroke="#22d3ee"
                strokeWidth={3}
                dot={{ fill: '#22d3ee', r: 5 }}
                name="Efficiency (km/1%)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400/80">
            Not enough data yet. Start logging drives to see trends!
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Battery className="w-6 h-6 text-cyan-300 drop-shadow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-cyan-100">Battery Level History</h3>
            <p className="text-sm text-slate-400/80">Recent SoC changes over time</p>
          </div>
        </div>

        {socHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={socHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e7490" opacity={0.1} />
              <XAxis dataKey="date" stroke="#67e8f9" style={{ fontSize: '12px' }} />
              <YAxis
                stroke="#67e8f9"
                style={{ fontSize: '12px' }}
                domain={[0, 100]}
                label={{ value: 'SoC %', angle: -90, position: 'insideLeft', fill: '#67e8f9' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                  borderRadius: '8px',
                  color: '#e0f2fe',
                }}
              />
              <Line
                type="monotone"
                dataKey="soc"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ fill: '#22d3ee', r: 4 }}
                name="Battery Level (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400/80">
            No battery history yet. Start logging to see your battery patterns!
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Activity className="w-6 h-6 text-cyan-300 drop-shadow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-cyan-100">6-Month Overview</h3>
            <p className="text-sm text-slate-400/80">Distance and energy consumption trends</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0e7490" opacity={0.1} />
            <XAxis dataKey="month" stroke="#67e8f9" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" stroke="#67e8f9" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                borderRadius: '8px',
                color: '#e0f2fe',
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="distance" fill="#22d3ee" name="Distance (km)" />
            <Bar yAxisId="right" dataKey="energy" fill="#fbbf24" name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

        <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <TrendingUp className="w-6 h-6 text-cyan-300 drop-shadow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-cyan-100">Monthly Charging Costs</h3>
            <p className="text-sm text-slate-400/80">Total charging spend by month (₪)</p>
      </div>
    </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0e7490" opacity={0.1} />
            <XAxis dataKey="month" stroke="#67e8f9" style={{ fontSize: '12px' }} />
            <YAxis stroke="#fbbf24" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                borderRadius: '8px',
                color: '#e0f2fe',
              }}
            />
            <Bar dataKey="cost" fill="#fbbf24" name="Cost (₪)" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6">
          <h4 className="text-sm text-slate-400/80 mb-2">Current Battery Health</h4>
          <p className="text-3xl font-bold text-lime-300 drop-shadow mb-1">
            {batteryHealth.stateOfHealth.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-400/80">
            {batteryHealth.currentCapacityKwh.toFixed(2)} / {batteryHealth.factoryCapacity} kWh
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-sm text-slate-400/80 mb-2">Total Drives Logged</h4>
          <p className="text-3xl font-bold text-lime-300 drop-shadow mb-1">{driveLogs.length}</p>
          <p className="text-sm text-slate-400/80">
            {driveLogs.reduce((sum, log) => sum + log.distance_km, 0).toFixed(0)} km total
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-sm text-slate-400/80 mb-2">Charging Sessions</h4>
          <p className="text-3xl font-bold text-lime-300 drop-shadow mb-1">{chargingSessions.length}</p>
          <p className="text-sm text-slate-400/80">
            {chargingSessions.reduce((sum, s) => sum + s.kwh_added, 0).toFixed(1)} kWh total
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

