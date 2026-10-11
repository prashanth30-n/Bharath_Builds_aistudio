import React from 'react';
import { HeatBand } from '../types';

interface GaugeProps {
  dose: number;
  maxDose?: number;
  currentBand: HeatBand;
  redMin: number;
  yellowMin?: number;
  ambientTempC: number;
  wbgtC: number;
  speedKmh: number;
  isStationary: boolean;
  onUnwellClick: () => void;
}

export const Gauge: React.FC<GaugeProps> = ({
  dose,
  maxDose = 140,
  currentBand,
  redMin,
  ambientTempC,
  wbgtC,
  speedKmh,
  isStationary,
  onUnwellClick,
}) => {
  const clampedDose = Math.min(Math.max(dose, 0), maxDose);
  const percentage = Math.round((clampedDose / maxDose) * 100);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedDose / maxDose) * circumference;

  let ringGradientStart = '#10B981'; // emerald
  let ringGradientEnd = '#06B6D4';   // cyan
  let statusText = 'Safe Exposure';
  let statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (currentBand === 'yellow' || dose >= 40) {
    ringGradientStart = '#F59E0B'; // amber
    ringGradientEnd = '#EA580C';   // orange
    statusText = 'Moderate Heat Strain';
    statusBg = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  if (currentBand === 'red' || dose >= 100) {
    ringGradientStart = '#F43F5E'; // rose
    ringGradientEnd = '#E11D48';   // crimson
    statusText = dose >= 120 ? 'CRITICAL LIMIT · STOP NOW' : 'High Heat Danger';
    statusBg = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
  }

  return (
    <div className="bg-white/95 rounded-[32px] p-5 shadow-xl shadow-slate-200/60 border border-slate-200/80 transition-all text-slate-800">
      {/* Top status bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block animate-ping"
            style={{ backgroundColor: ringGradientStart }}
          />
          <span className="text-xs font-bold text-slate-600 tracking-wide">
            {isStationary ? 'Stationary (Rest / Waiting)' : `Cruising · ${speedKmh} km/h`}
          </span>
        </div>

        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${statusBg}`}>
          {statusText}
        </span>
      </div>

      {/* Modern Circular Halo Activity Ring */}
      <div className="flex items-center justify-center gap-5 my-2">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            <defs>
              <linearGradient id="lightRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={ringGradientStart} />
                <stop offset="100%" stopColor={ringGradientEnd} />
              </linearGradient>
            </defs>

            {/* Background track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Glowing active progress ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="url(#lightRingGradient)"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center dose readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {Math.round(dose)}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {percentage}% dose
            </span>
          </div>
        </div>

        {/* Vital stats in soft flowing cards */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-2xl bg-amber-50/80 border border-amber-100">
            <span className="text-amber-800 font-medium">WBGT Felt Heat</span>
            <span className="font-bold font-mono text-amber-900 text-sm">{wbgtC}°C</span>
          </div>

          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-2xl bg-rose-50/80 border border-rose-100">
            <span className="text-rose-800 font-medium">Red Zone Time</span>
            <span className="font-bold font-mono text-rose-900 text-sm">{redMin} min</span>
          </div>

          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-2xl bg-sky-50/80 border border-sky-100">
            <span className="text-sky-800 font-medium">Air Temp</span>
            <span className="font-bold font-mono text-sky-900 text-sm">{ambientTempC}°C</span>
          </div>
        </div>
      </div>

      {/* Ergonomic SOS Button - Soft Rose Coral */}
      <button
        onClick={onUnwellClick}
        className="w-full mt-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide transition shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2"
      >
        <span className="text-base animate-bounce">🚨</span>
        <span>I Feel Unwell · तुरंत शेल्टर व मदद (SOS)</span>
      </button>
    </div>
  );
};
