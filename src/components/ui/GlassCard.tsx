import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl bg-[#0a0f1e] backdrop-blur-md ring-1 ring-cyan-400/20 md:ring-0 md:hover:ring-1 md:hover:ring-cyan-300/45 transition-all ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  trend?: string;
  className?: string;
}

export function StatCard({ title, value, unit, icon, trend, className = '' }: StatCardProps) {
  return (
    <GlassCard className={`p-4 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="p-2 sm:p-3 bg-cyan-500/10 rounded-lg ring-1 ring-cyan-300/30 shadow-[0_0_12px_rgba(0,255,255,0.22)]">
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] sm:text-xs font-medium text-slate-400/80">{trend}</span>
        )}
      </div>
      <h3 className="text-xs sm:text-sm font-semibold text-slate-300/90 mb-1 sm:mb-2">{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl sm:text-[2.15rem] leading-none font-bold text-[#39ff14] [text-shadow:0_0_10px_rgba(57,255,20,0.42)]">{value}</span>
        {unit && <span className="text-sm sm:text-lg font-medium text-cyan-200 [text-shadow:0_0_7px_rgba(0,255,255,0.28)]">{unit}</span>}
      </div>
    </GlassCard>
  );
}
