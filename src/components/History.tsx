import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Zap, Trash2, CreditCard as Edit2, X, Check, Calendar } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { supabase } from '../lib/supabase';
import { useDriveLogs, useChargingSessions, useSettings } from '../hooks/useData';
import { format } from 'date-fns';
import type { Database } from '../lib/database.types';

type DriveLog = Database['public']['Tables']['drive_logs']['Row'];
type ChargingSession = Database['public']['Tables']['charging_sessions']['Row'];

export function History() {
  const { driveLogs, refetch: refetchDrives } = useDriveLogs();
  const { chargingSessions, refetch: refetchCharging } = useChargingSessions();
  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState<'drives' | 'charging'>('drives');
  const [editingDrive, setEditingDrive] = useState<DriveLog | null>(null);
  const [editingCharging, setEditingCharging] = useState<ChargingSession | null>(null);

  const handleDeleteDrive = async (id: string) => {
    if (!confirm('Delete this drive log?')) return;

    const { error } = await supabase.from('drive_logs').delete().eq('id', id);

    if (!error) {
      await refetchDrives();
    }
  };

  const handleDeleteCharging = async (id: string) => {
    if (!confirm('Delete this charging session?')) return;

    const { error } = await supabase.from('charging_sessions').delete().eq('id', id);

    if (!error) {
      await refetchCharging();
    }
  };

    const toLocalISOString = (date: Date) => {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localDate.toISOString().slice(0, 16);
    };

    const handleUpdateDrive = async (drive: DriveLog) => {
    const { error } = await (supabase.from('drive_logs') as any)
      .update({
        start_time: new Date(drive.start_time).toISOString(),
        end_time: new Date(drive.start_time).toISOString(),
        start_soc: drive.start_soc,
        end_soc: drive.end_soc,
        distance_km: drive.distance_km,
        notes: drive.notes,
      })
      .eq('id', drive.id);

    if (!error) {
      setEditingDrive(null);
      await refetchDrives();
    }
  };

    const handleUpdateCharging = async (session: ChargingSession) => {
    const { error } = await (supabase.from('charging_sessions') as any)
      .update({
        start_time: new Date(session.start_time).toISOString(),
        end_time: new Date(session.start_time).toISOString(),
        start_soc: session.start_soc,
        end_soc: session.end_soc,
        cost: session.cost,
        location: session.location,
      })
      .eq('id', session.id);

    if (!error) {
      setEditingCharging(null);
      await refetchCharging();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-100 mb-2">History</h2>
        <p className="text-slate-400/80">View and manage your logs</p>
      </div>

      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg border border-cyan-500/20">
        <button
          onClick={() => setActiveTab('drives')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'drives'
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg'
              : 'text-slate-400/80 hover:text-cyan-400'
          }`}
        >
          <Car className="w-4 h-4 inline mr-2" />
          Drives
        </button>
        <button
          onClick={() => setActiveTab('charging')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'charging'
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg'
              : 'text-slate-400/80 hover:text-cyan-400'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Charging
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'drives' ? (
          <motion.div
            key="drives"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {driveLogs.length === 0 ? (
              <GlassCard className="p-8 text-center text-slate-400/80">
                No drive logs yet. Start logging your drives!
              </GlassCard>
            ) : (
              driveLogs.map((drive) => {
                const kwhUsed = Math.max(0, (drive.start_soc - drive.end_soc) / 100) * (settings?.battery_capacity_kwh || 60.48) * 0.897;
                const costAC = kwhUsed * (0.55 * 1.18);
                const costDC = kwhUsed * (2.75 * 1.18);

                return (
                <GlassCard key={drive.id} className="p-4">
                                    {editingDrive?.id === drive.id ? (
                    <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                          <label className="text-xs text-slate-400/80">Date & Time</label>
                          <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                            <input
                              type="datetime-local"
                              value={toLocalISOString(new Date(editingDrive.start_time))}
                              onChange={(e) =>
                                setEditingDrive({
                                  ...editingDrive,
                                  start_time: new Date(e.target.value).toISOString(),
                                })
                              }
                              className="w-full pl-8 pr-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm [color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-slate-400/80">Start %</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingDrive.start_soc}
                              onChange={(e) =>
                                setEditingDrive({
                                  ...editingDrive,
                                  start_soc: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400/80">End %</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingDrive.end_soc}
                              onChange={(e) =>
                                setEditingDrive({
                                  ...editingDrive,
                                  end_soc: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400/80">Distance</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingDrive.distance_km}
                              onChange={(e) =>
                                setEditingDrive({
                                  ...editingDrive,
                                  distance_km: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <textarea
                        value={editingDrive.notes}
                        onChange={(e) =>
                          setEditingDrive({ ...editingDrive, notes: e.target.value })
                        }
                        className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateDrive(editingDrive)}
                          className="flex-1 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        >
                          <Check className="w-4 h-4 inline mr-1" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDrive(null)}
                          className="flex-1 py-2 bg-slate-700/20 border border-slate-600/30 text-slate-400 rounded-lg hover:bg-slate-700/30 transition-colors"
                        >
                          <X className="w-4 h-4 inline mr-1" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-cyan-300 drop-shadow" />
                            <span className="text-sm text-slate-400/80">
                              {format(new Date(drive.start_time), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="flex gap-2 sm:hidden">
                            <button
                              onClick={() => setEditingDrive(drive)}
                              className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDrive(drive.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 mb-3">
                          <div>
                            <span className="text-[10px] sm:text-xs text-slate-400/80 uppercase tracking-wider">SoC</span>
                            <p className="text-lime-300 font-semibold drop-shadow text-sm sm:text-base">
                              {drive.start_soc.toFixed(1)}% → {drive.end_soc.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-xs text-slate-400/80 uppercase tracking-wider">Distance</span>
                            <p className="text-lime-300 font-semibold drop-shadow text-sm sm:text-base">
                              {drive.distance_km.toFixed(1)} km
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-xs text-slate-400/80 uppercase tracking-wider">Efficiency</span>
                            <p className="text-lime-300 font-semibold drop-shadow text-sm sm:text-base">
                              {((drive.distance_km / (drive.start_soc - drive.end_soc)) || 0).toFixed(2)} km/1%
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-xs text-slate-400/80 uppercase tracking-wider">Energy Used</span>
                            <p className="text-lime-300 font-semibold drop-shadow text-sm sm:text-base">
                              {kwhUsed.toFixed(2)} kWh
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mt-2 mb-2 p-2.5 bg-slate-900/40 rounded-lg border border-slate-700/50">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400/80 block mb-0.5">Energy / 1%</span>
                            <p className="text-cyan-300 font-medium drop-shadow text-sm">
                              {(kwhUsed / (drive.start_soc - drive.end_soc) || 0).toFixed(3)} kWh
                            </p>
                          </div>
                          <div className="flex sm:block justify-between items-center">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400/80 block mb-0.5">Home Cost</span>
                            <p className="text-emerald-400 font-medium drop-shadow text-sm text-right sm:text-left">
                              ₪{costAC.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex sm:block justify-between items-center">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400/80 block mb-0.5">Outside Cost</span>
                            <p className="text-amber-400 font-medium drop-shadow text-sm text-right sm:text-left">
                              ₪{costDC.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {drive.notes && (
                          <p className="text-xs sm:text-sm text-slate-400/80 italic mt-2">{drive.notes}</p>
                        )}
                      </div>
                      <div className="hidden sm:flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingDrive(drive)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDrive(drive.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="charging"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            {chargingSessions.length === 0 ? (
              <GlassCard className="p-8 text-center text-slate-400/80">
                No charging sessions yet. Start logging your charges!
              </GlassCard>
            ) : (
              chargingSessions.map((session) => (
                <GlassCard key={session.id} className="p-4">
                                    {editingCharging?.id === session.id ? (
                    <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                          <label className="text-xs text-slate-400/80">Date & Time</label>
                          <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                            <input
                              type="datetime-local"
                              value={toLocalISOString(new Date(editingCharging.start_time))}
                              onChange={(e) =>
                                setEditingCharging({
                                  ...editingCharging,
                                  start_time: new Date(e.target.value).toISOString(),
                                })
                              }
                              className="w-full pl-8 pr-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm [color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-slate-400/80">Start %</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingCharging.start_soc}
                              onChange={(e) =>
                                setEditingCharging({
                                  ...editingCharging,
                                  start_soc: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400/80">End %</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingCharging.end_soc}
                              onChange={(e) =>
                                setEditingCharging({
                                  ...editingCharging,
                                  end_soc: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400/80">Cost ₪</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingCharging.cost}
                              onChange={(e) =>
                                setEditingCharging({
                                  ...editingCharging,
                                  cost: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400/80">Location</label>
                            <input
                              type="text"
                              value={editingCharging.location}
                              onChange={(e) =>
                                setEditingCharging({
                                  ...editingCharging,
                                  location: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 bg-slate-900/50 border border-cyan-500/30 rounded text-cyan-100 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateCharging(editingCharging)}
                          className="flex-1 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        >
                          <Check className="w-4 h-4 inline mr-1" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCharging(null)}
                          className="flex-1 py-2 bg-slate-700/20 border border-slate-600/30 text-slate-400 rounded-lg hover:bg-slate-700/30 transition-colors"
                        >
                          <X className="w-4 h-4 inline mr-1" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-cyan-300 drop-shadow" />
                          <span className="text-sm text-slate-400/80">
                            {format(new Date(session.start_time), 'dd/MM/yyyy HH:mm')}
                          </span>
                          {session.is_full_charge && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs rounded-full">
                              100% Cal
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-xs text-slate-400/80">SoC</span>
                            <p className="text-lime-300 font-semibold drop-shadow">
                              {session.start_soc.toFixed(1)}% → {session.end_soc.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400/80">Energy</span>
                            <p className="text-lime-300 font-semibold drop-shadow">
                              {session.kwh_added.toFixed(2)} kWh
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400/80">Cost</span>
                            <p className="text-lime-300 font-semibold drop-shadow">
                              ₪{session.cost.toFixed(2)}
                              <span className="text-[10px] text-slate-500 ml-1">
                                ({session.kwh_added > 0 ? (session.cost / session.kwh_added).toFixed(2) : '0.00'} /kWh)
                              </span>
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400/80">Location</span>
                            <p className="text-lime-300 font-semibold drop-shadow">
                              {session.location || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingCharging(session)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCharging(session.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

