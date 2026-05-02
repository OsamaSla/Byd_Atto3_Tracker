import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Database } from './database.types';

type DriveLog = Database['public']['Tables']['drive_logs']['Row'];
type ChargingSession = Database['public']['Tables']['charging_sessions']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

interface ExportData {
  driveLogs: DriveLog[];
  chargingSessions: ChargingSession[];
  settings: UserSettings;
}

export function exportToExcel(data: ExportData) {
  const workbook = XLSX.utils.book_new();

  const driveData = data.driveLogs.map(log => ({
    Date: format(new Date(log.start_time), 'dd/MM/yyyy HH:mm'),
    'Start SoC (%)': log.start_soc,
    'End SoC (%)': log.end_soc,
    'SoC Used (%)': log.start_soc - log.end_soc,
    'Distance (km)': log.distance_km,
    'Efficiency (km/1%)': log.start_soc - log.end_soc > 0
      ? (log.distance_km / (log.start_soc - log.end_soc)).toFixed(2)
      : 0,
    'kWh Used': ((log.start_soc - log.end_soc) / 100 * data.settings.battery_capacity_kwh).toFixed(2),
    Notes: log.notes || '',
  }));

  const driveSheet = XLSX.utils.json_to_sheet(driveData);
  driveSheet['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, driveSheet, 'Trip Log');

  const chargingData = data.chargingSessions.map(session => ({
    Date: format(new Date(session.start_time), 'dd/MM/yyyy HH:mm'),
    'Start SoC (%)': session.start_soc,
    'End SoC (%)': session.end_soc,
    'SoC Gained (%)': session.end_soc - session.start_soc,
    'Energy Added (kWh)': session.kwh_added.toFixed(2),
    'Cost (₪)': session.cost.toFixed(2),
    'Cost per kWh (₪)': session.kwh_added > 0
      ? (session.cost / session.kwh_added).toFixed(3)
      : 0,
    Location: session.location || '',
    '100% Calibration': session.is_full_charge ? 'Yes' : 'No',
  }));

  const chargingSheet = XLSX.utils.json_to_sheet(chargingData);
  chargingSheet['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, chargingSheet, 'Charging & Costs');

  const totalKm = data.driveLogs.reduce((sum, log) => sum + log.distance_km, 0);
  const totalSocUsed = data.driveLogs.reduce((sum, log) => sum + (log.start_soc - log.end_soc), 0);
  const totalKwhUsed = (totalSocUsed / 100) * data.settings.battery_capacity_kwh;
  const totalChargingCost = data.chargingSessions.reduce((sum, s) => sum + s.cost, 0);
  const avgEfficiency = totalSocUsed > 0 ? totalKm / totalSocUsed : 0;
  const totalKwhCharged = data.chargingSessions.reduce((sum, s) => sum + s.kwh_added, 0);

  const petrolEquivalentLiters = (totalKm / 100) * data.settings.avg_petrol_consumption;
  const petrolEquivalentCost = petrolEquivalentLiters * data.settings.petrol_price;
  const totalSaved = petrolEquivalentCost - totalChargingCost;
  const co2Saved = petrolEquivalentLiters * 2.31;

  const healthData = [
    { Metric: 'Total Distance Driven', Value: `${totalKm.toFixed(2)} km`, Unit: '' },
    { Metric: 'Total Energy Used', Value: totalKwhUsed.toFixed(2), Unit: 'kWh' },
    { Metric: 'Total Energy Charged', Value: totalKwhCharged.toFixed(2), Unit: 'kWh' },
    { Metric: 'Average Efficiency', Value: avgEfficiency.toFixed(2), Unit: 'km/1%' },
    { Metric: 'Total Charging Cost', Value: totalChargingCost.toFixed(2), Unit: '₪' },
    { Metric: 'Petrol Equivalent Cost', Value: petrolEquivalentCost.toFixed(2), Unit: '₪' },
    { Metric: 'Total Money Saved', Value: totalSaved.toFixed(2), Unit: '₪' },
    { Metric: 'CO₂ Emissions Saved', Value: co2Saved.toFixed(2), Unit: 'kg' },
    { Metric: 'Battery Capacity', Value: data.settings.battery_capacity_kwh.toFixed(2), Unit: 'kWh' },
    { Metric: 'Total Drives Logged', Value: data.driveLogs.length.toString(), Unit: '' },
    { Metric: 'Total Charging Sessions', Value: data.chargingSessions.length.toString(), Unit: '' },
    { Metric: 'Full Charges (100%)', Value: data.chargingSessions.filter(s => s.is_full_charge).length.toString(), Unit: '' },
  ];

  const healthSheet = XLSX.utils.json_to_sheet(healthData);
  healthSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, healthSheet, 'Battery Health Trends');

  const fileName = `BYD_Atto3_Battery_Report_${format(new Date(), 'dd/MM/yyyy')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

