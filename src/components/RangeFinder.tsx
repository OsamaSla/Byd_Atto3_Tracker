import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation2, AlertCircle } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { useDriveLogs } from '../hooks/useData';
import { calculateRangeStats, calculateRange } from '../lib/analytics';

export function RangeFinder() {
  const { driveLogs } = useDriveLogs();
  const [currentSoc, setCurrentSoc] = useState('85');
  const [destinationDistance, setDestinationDistance] = useState('100');
  const [remainingRange, setRemainingRange] = useState(0);
  const [arrivalSoc, setArrivalSoc] = useState(0);
  const [isReachable, setIsReachable] = useState(true);

  const rangeStats = calculateRangeStats(driveLogs);
  const currentSocNum = parseFloat(currentSoc);
  const destinationDistanceNum = parseFloat(destinationDistance);
  const socTextClass = currentSocNum > 50 ? 'text-green-400' : currentSocNum > 20 ? 'text-yellow-400' : 'text-red-400';

  useEffect(() => {
    if (currentSocNum >= 0 && currentSocNum <= 100 && destinationDistanceNum >= 0) {
      const projectedRange = calculateRange(currentSocNum, rangeStats.avgKmPerPercent);
      const arrivalPercentage = Math.max(0, currentSocNum - (destinationDistanceNum / rangeStats.avgKmPerPercent));

      setRemainingRange(projectedRange);
      setArrivalSoc(arrivalPercentage);
      setIsReachable(projectedRange >= destinationDistanceNum);
    }
  }, [currentSoc, destinationDistance, rangeStats.avgKmPerPercent]);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <Navigation2 className="w-6 h-6 text-cyan-300 drop-shadow" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-cyan-100">Find Your Range</h2>
          <p className="text-sm text-slate-400/80">Plan your trip and check arrival percentage</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="currentSoc" className="block text-sm font-medium text-cyan-100 mb-2">
            Current Battery Level: <span className={socTextClass}>{currentSocNum.toFixed(0)}%</span>
          </label>
          <div className="flex items-center gap-4">
            <input
            id="currentSoc"
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={currentSoc}
            onChange={(e) => setCurrentSoc(e.target.value)}
              className="flex-1 h-3 bg-slate-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
            <input
              type="number"
              min="0"
              max="100"
              value={currentSoc}
              onChange={(e) => setCurrentSoc(e.target.value)}
              className="w-16 px-2 py-1 bg-[#0b1224] border border-cyan-500/20 rounded text-cyan-100 text-center"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400/80 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
        </div>
        </div>

            <div>
          <label htmlFor="destination" className="block text-sm font-medium text-cyan-100 mb-2">
            Trip Distance (km)
          </label>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-400/80" />
            <input
              id="destination"
              type="number"
              step="1"
              min="0"
              value={destinationDistance}
              onChange={(e) => setDestinationDistance(e.target.value)}
              className="flex-1 px-4 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              placeholder="150"
            />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20"
          >
            <p className="text-xs text-slate-400/80 mb-1">Estimated Range</p>
            <p className="text-2xl font-bold text-lime-300 drop-shadow">
              {remainingRange.toFixed(0)} <span className="text-sm text-slate-400/80">km</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20"
          >
            <p className="text-xs text-slate-400/80 mb-1">Arrival Battery</p>
            <p className="text-2xl font-bold text-lime-300 drop-shadow">
              {arrivalSoc.toFixed(1)} <span className="text-sm text-slate-400/80">%</span>
            </p>
          </motion.div>
          </div>

        {!isReachable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold">Trip Not Reachable</p>
              <p className="text-sm text-red-400/80">
                You need {(destinationDistanceNum / rangeStats.avgKmPerPercent).toFixed(1)}% battery for this trip.
                Current: {currentSocNum.toFixed(1)}%
              </p>
            </div>
          </motion.div>
        )}

        {isReachable && arrivalSoc < 20 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-3"
          >
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold">Low Margin Warning</p>
              <p className="text-sm text-yellow-400/80">
                You'll arrive at {arrivalSoc.toFixed(1)}% battery. Consider charging or finding a closer destination.
              </p>
            </div>
          </motion.div>
        )}

        {isReachable && arrivalSoc >= 20 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <p className="text-green-400 font-semibold">Trip Feasible</p>
            <p className="text-sm text-green-400/80">
              Safe margin with {arrivalSoc.toFixed(1)}% battery remaining upon arrival.
            </p>
          </motion.div>
        )}

        {rangeStats.lastFiveDrives === 0 && (
          <div className="p-4 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/15 text-slate-400/80 text-sm">
            <p>Log at least 5 drives to calculate accurate range estimates.</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

