import type { Database } from './database.types';

type DriveLog = Database['public']['Tables']['drive_logs']['Row'];
type ChargingSession = Database['public']['Tables']['charging_sessions']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export interface RangeStats {
  avgKmPerPercent: number;
  projectedRange: number;
  lastFiveDrives: number;
}

export interface BatteryHealth {
  currentCapacityKwh: number;
  stateOfHealth: number;
  factoryCapacity: number;
}

export interface FuelSavings {
  totalKwhUsed: number;
  evCost: number;
  petrolEquivalentCost: number;
  totalSaved: number;
  co2Saved: number;
}

export function calculateRangeStats(driveLogs: DriveLog[]): RangeStats {
  const recentDrives = driveLogs
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 5);

  if (recentDrives.length === 0) {
    return {
      avgKmPerPercent: 0,
      projectedRange: 0,
      lastFiveDrives: 0,
    };
  }

  const kmPerPercent = recentDrives.map(log => {
    const socUsed = log.start_soc - log.end_soc;
    return socUsed > 0 ? log.distance_km / socUsed : 0;
  }).filter(val => val > 0);

  const avgKmPerPercent = kmPerPercent.length > 0
    ? kmPerPercent.reduce((a, b) => a + b, 0) / kmPerPercent.length
    : 0;

  return {
    avgKmPerPercent,
    projectedRange: avgKmPerPercent * 100,
    lastFiveDrives: recentDrives.length,
  };
}

export function calculateBatteryHealth(
  _driveLogs: DriveLog[],
  chargingSessions: ChargingSession[],
  settings: UserSettings
): BatteryHealth {
  const factoryCapacity = 60.48;
  const userEnteredBatterySize = (settings as any).battery_size_kwh;

  let currentCapacityKwh = userEnteredBatterySize || factoryCapacity;
  let stateOfHealth = 100;

  if (userEnteredBatterySize) {
    stateOfHealth = (userEnteredBatterySize / factoryCapacity) * 100;
  } else {
    const fullChargeCycles = chargingSessions.filter(s => s.is_full_charge);

    if (fullChargeCycles.length > 0) {
      const recentFullCharges = fullChargeCycles
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 3);

      const avgKwhAdded = recentFullCharges.length > 0
        ? recentFullCharges.reduce((sum, s) => sum + s.kwh_added, 0) / recentFullCharges.length
        : factoryCapacity;

      currentCapacityKwh = Math.min(avgKwhAdded, factoryCapacity);
      stateOfHealth = (currentCapacityKwh / factoryCapacity) * 100;
    }
  }

  return {
    currentCapacityKwh,
    stateOfHealth: Math.min(Math.max(stateOfHealth, 0), 100),
    factoryCapacity,
  };
}

export function calculateFuelSavings(
  driveLogs: DriveLog[],
  settings: UserSettings,
  periodStart?: Date
): FuelSavings {
  const filteredLogs = periodStart
    ? driveLogs.filter(log => new Date(log.start_time) >= periodStart)
    : driveLogs;

  const totalKm = filteredLogs.reduce((sum, log) => sum + log.distance_km, 0);
  const totalSocUsed = filteredLogs.reduce((sum, log) => sum + (log.start_soc - log.end_soc), 0);

  const totalKwhUsed = (totalSocUsed / 100) * settings.battery_capacity_kwh;
  const evCost = totalKwhUsed * settings.kwh_price;

  const petrolLitersEquivalent = (totalKm / 100) * settings.avg_petrol_consumption;
  const petrolEquivalentCost = petrolLitersEquivalent * settings.petrol_price;

  const totalSaved = petrolEquivalentCost - evCost;

  const co2Saved = petrolLitersEquivalent * 2.31;

  return {
    totalKwhUsed,
    evCost,
    petrolEquivalentCost,
    totalSaved,
    co2Saved,
  };
}

export function getEfficiencyTrend(driveLogs: DriveLog[], days: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentLogs = driveLogs.filter(
    log => new Date(log.start_time) >= cutoffDate
  );

  const dailyData: { [key: string]: { km: number; socUsed: number } } = {};

  recentLogs.forEach(log => {
    const date = new Date(log.start_time).toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { km: 0, socUsed: 0 };
    }
    dailyData[date].km += log.distance_km;
    dailyData[date].socUsed += log.start_soc - log.end_soc;
  });

  return Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      efficiency: data.socUsed > 0 ? data.km / data.socUsed : 0,
      distance: data.km,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function checkChargingLogic(
  currentSoc: number,
  lastDriveLog: DriveLog | null,
  recentChargingSessions: ChargingSession[]
): { needsChargingLog: boolean; message: string } {
  if (!lastDriveLog) {
    return { needsChargingLog: false, message: '' };
  }

  const lastEndSoc = lastDriveLog.end_soc;

  if (currentSoc > lastEndSoc) {
    const lastChargeTime = recentChargingSessions[0]
      ? new Date(recentChargingSessions[0].end_time)
      : new Date(0);
    const lastDriveTime = new Date(lastDriveLog.end_time);

    if (lastChargeTime < lastDriveTime) {
      return {
        needsChargingLog: true,
        message: `Battery increased from ${lastEndSoc.toFixed(1)}% to ${currentSoc.toFixed(1)}%. Please create a charging log to maintain accuracy.`,
      };
    }
  }

  return { needsChargingLog: false, message: '' };
}

export function calculateRange(currentSoc: number, avgKmPerPercent: number): number {
  return currentSoc * avgKmPerPercent;
}
