import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Navigation2, Search, Battery, Bluetooth, BluetoothConnected, BluetoothSearching, Loader2, AlertCircle, Zap } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { useDriveLogs } from '../hooks/useData';
import { calculateRangeStats } from '../lib/analytics';
import { obdService } from '../lib/obd';
import L from 'leaflet';

// Fix for Leaflet default marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Custom icon for charging stations
const chargingIcon = L.divIcon({
  html: `<div class="bg-emerald-500 p-1 rounded-full border-2 border-white shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 10 10 10-10"></path><path d="m16 11 3 3 3-3"></path></svg></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to update map view
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function RoutePlanner() {
  const { driveLogs } = useDriveLogs();
  const rangeStats = calculateRangeStats(driveLogs);

  const [currentSoc, setCurrentSoc] = useState<number>(80);
  const [obdStatus, setObdStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [startPos] = useState<[number, number]>([32.0853, 34.7818]); // Tel Aviv default
  const [endPos, setEndPos] = useState<[number, number] | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([32.0853, 34.7818]);
  const [mapZoom, setMapZoom] = useState(13);
  const [chargingStations, setChargingStations] = useState<any[]>([]);

  // Stats
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [estArrivalSoc, setEstArrivalSoc] = useState<number | null>(null);

  useEffect(() => {
    if (distanceKm !== null && rangeStats.avgKmPerPercent > 0) {
      const socNeeded = distanceKm / rangeStats.avgKmPerPercent;
      setEstArrivalSoc(Math.max(0, currentSoc - socNeeded));
    }
  }, [distanceKm, currentSoc, rangeStats.avgKmPerPercent]);

  const handleConnectOBD = async () => {
    setObdStatus('connecting');
    const success = await obdService.connect();
    if (success) {
      setObdStatus('connected');
      const data = await obdService.fetchData();
      if (data.soc !== null) {
        setCurrentSoc(data.soc);
      }
    } else {
      setObdStatus('disconnected');
      setError('Failed to connect to OBD scanner.');
    }
  };

  const handleFetchOBD = async () => {
    const data = await obdService.fetchData();
    if (data.soc !== null) {
      setCurrentSoc(data.soc);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const newEndPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setEndPos(newEndPos);
        setMapCenter(newEndPos);
        setMapZoom(12);
        
        // Calculate Route
        await calculateRoute(startPos, newEndPos);
        
        // Fetch Charging Stations near destination and start
        await fetchChargingStations(newEndPos);
      } else {
        setError('Location not found');
      }
    } catch (err) {
      setError('Failed to search location');
    } finally {
      setLoading(false);
    }
  };

  const fetchChargingStations = async (pos: [number, number]) => {
    try {
      // Overpass API query for charging stations within 10km
      const query = `
        [out:json];
        node["amenity"="charging_station"](around:10000,${pos[0]},${pos[1]});
        out;
      `;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      const data = await response.json();
      setChargingStations(data.elements || []);
    } catch (err) {
      console.error('Error fetching stations:', err);
    }
  };

  const calculateRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        setRouteData(data.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]));
        setDistanceKm(data.routes[0].distance / 1000);
      }
    } catch (err) {
      console.error('Routing error:', err);
      setError('Failed to calculate route');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cyan-100 mb-2">Route Planner</h2>
          <p className="text-slate-400/80">Plan your trip based on real-time data</p>
        </div>
        <button
          type="button"
          onClick={obdStatus === 'connected' ? handleFetchOBD : handleConnectOBD}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            obdStatus === 'connected'
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400'
          }`}
        >
          {obdStatus === 'connecting' ? (
            <BluetoothSearching className="w-5 h-5 animate-pulse" />
          ) : obdStatus === 'connected' ? (
            <BluetoothConnected className="w-5 h-5" />
          ) : (
            <Bluetooth className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {obdStatus === 'connecting' ? 'Connecting...' : obdStatus === 'connected' ? `SoC: ${currentSoc}%` : 'Connect OBD'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-cyan-100 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Where to?
            </h3>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter destination..."
                  className="w-full pl-4 pr-12 py-3 bg-[#0b1224] rounded-lg ring-1 ring-cyan-400/20 text-cyan-100 placeholder-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400/80 mb-2 uppercase tracking-wider">Starting SoC (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={currentSoc}
                    onChange={(e) => setCurrentSoc(parseInt(e.target.value))}
                    className="flex-1 accent-cyan-400"
                  />
                  <span className="text-xl font-bold text-cyan-100 w-12 text-right">{currentSoc}%</span>
                </div>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </GlassCard>

          {distanceKm !== null && (
            <GlassCard className="p-6 space-y-4 border-l-4 border-cyan-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400/80 uppercase tracking-wider">Distance</p>
                  <p className="text-2xl font-bold text-cyan-100">{distanceKm.toFixed(1)} km</p>
                </div>
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Navigation2 className="w-5 h-5 text-cyan-400" />
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400/80 uppercase tracking-wider">Est. SoC at Arrival</p>
                  <p className={`text-2xl font-bold ${estArrivalSoc && estArrivalSoc < 15 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {estArrivalSoc !== null ? `${estArrivalSoc.toFixed(1)}%` : '--'}
                  </p>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Battery className={`w-5 h-5 ${estArrivalSoc && estArrivalSoc < 15 ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
              </div>

              {estArrivalSoc !== null && estArrivalSoc < 15 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  <strong>Warning:</strong> Battery level at arrival is very low. Consider a charging stop.
                </div>
              )}
            </GlassCard>
          )}
        </div>

        <div className="lg:col-span-2 h-[400px] lg:h-auto min-h-[500px] rounded-xl overflow-hidden ring-1 ring-cyan-400/20 shadow-2xl relative">
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            <Marker position={startPos}>
              <Popup>Current Location</Popup>
            </Marker>

            {endPos && (
              <Marker position={endPos}>
                <Popup>Destination</Popup>
              </Marker>
            )}

            {chargingStations.map((station: any) => (
              <Marker 
                key={station.id} 
                position={[station.lat, station.lon]} 
                icon={chargingIcon}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-cyan-100 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      {station.tags.name || 'Charging Station'}
                    </p>
                    {station.tags.operator && <p className="text-xs text-slate-400/80">{station.tags.operator}</p>}
                    {station.tags.socket && <p className="text-[10px] text-cyan-400/60 mt-1">{station.tags.socket}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {routeData && (
              <Polyline positions={routeData} color="#22d3ee" weight={5} opacity={0.7} />
            )}
          </MapContainer>
          
          <div className="absolute top-4 right-4 z-[1000]">
             <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-lg border border-cyan-500/20 text-[10px] text-cyan-300">
                Efficiency: {rangeStats.avgKmPerPercent.toFixed(2)} km/1%
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
