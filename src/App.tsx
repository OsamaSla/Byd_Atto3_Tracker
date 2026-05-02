import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Car, History as HistoryIcon, TrendingUp, LogOut, Download, Settings, Navigation2, Battery } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { DriveLogger } from './components/DriveLogger';
import { ChargingLogger } from './components/ChargingLogger';
import { History } from './components/History';
import { Analytics } from './components/Analytics';
import { RangeFinder } from './components/RangeFinder';
import { useDriveLogs, useChargingSessions, useSettings } from './hooks/useData';
import { exportToExcel } from './lib/exportToExcel';
import { isSupabaseConfigured } from './lib/supabase';

type View = 'dashboard' | 'log-drive' | 'log-charge' | 'history' | 'analytics' | 'range-finder';

function MainApp() {
  const { user, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const { driveLogs } = useDriveLogs();
  const { chargingSessions } = useChargingSessions();
  const { settings } = useSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-300 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (!isSupabaseConfigured) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl bg-[#0a0f1e] backdrop-blur-xl p-6 ring-1 ring-cyan-400/20">
            <h2 className="text-cyan-100 text-2xl font-bold mb-3">Supabase Setup Required</h2>
            <p className="text-cyan-300/80 mb-4">
              Add these variables to your local <code>.env</code> file and restart Vite:
            </p>
            <div className="rounded-lg bg-slate-950/70 border border-cyan-500/20 p-4 font-mono text-sm text-cyan-300 space-y-1">
              <p>VITE_SUPABASE_URL=your-project-url</p>
              <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
            </div>
          </div>
        </div>
      );
    }

    return <Auth />;
  }

  const handleExport = () => {
    if (!settings) {
      alert('Settings not loaded yet');
      return;
    }

    exportToExcel({
      driveLogs,
      chargingSessions,
      settings,
    });
  };

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'range-finder' as View, label: 'Find Range', icon: Navigation2 },
    { id: 'log-drive' as View, label: 'Log Drive', icon: Car },
    { id: 'log-charge' as View, label: 'Log Charge', icon: Battery },
    { id: 'history' as View, label: 'History', icon: HistoryIcon },
    { id: 'analytics' as View, label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-black pb-28">
      <nav className="bg-black/90 backdrop-blur-md border-b border-cyan-400/10 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/12 ring-1 ring-cyan-300/30 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-cyan-100">
                  BYD Atto 3
                </h1>
                <p className="text-xs text-cyan-400/60">Blade Battery Pro</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="p-2 text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                title="Export to Excel"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => signOut()}
                className="p-2 text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            {activeView === 'dashboard' && <Dashboard />}
            {activeView === 'range-finder' && <RangeFinder />}
            {activeView === 'log-drive' && <DriveLogger />}
            {activeView === 'log-charge' && <ChargingLogger />}
            {activeView === 'history' && <History />}
            {activeView === 'analytics' && <Analytics />}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="py-6 text-center text-cyan-400/40 text-sm border-t border-cyan-500/10 mt-12">
        <p>BYD Atto 3 Blade Battery Pro © 2024</p>
        <p className="text-xs mt-1">Professional EV Battery Management System</p>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-cyan-400/12 safe-bottom">
        <div className="container mx-auto px-2">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative flex min-w-[82px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${activeView === item.id
                    ? 'bg-cyan-500/15 text-[#00ffff] ring-1 ring-cyan-300/45 shadow-[0_0_14px_rgba(0,255,255,0.2)] before:absolute before:-top-1 before:left-1/2 before:h-1 before:w-10 before:-translate-x-1/2 before:rounded-full before:bg-cyan-300/80 before:blur-sm'
                    : 'text-cyan-300 hover:bg-slate-800/70'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;

