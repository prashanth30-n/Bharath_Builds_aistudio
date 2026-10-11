import React, { useState, useEffect } from 'react';
import { VoiceNudge } from '../types';

interface NudgeBannerProps {
  nudge: VoiceNudge;
  lang: 'en' | 'hi' | 'te';
  onNavigateToPoint?: (pointId: string) => void;
  onDismiss: () => void;
  onReplayAudio: () => void;
}

export const NudgeBanner: React.FC<NudgeBannerProps> = ({
  nudge,
  lang,
  onNavigateToPoint,
  onDismiss,
  onReplayAudio,
}) => {
  const [isPlayingWave, setIsPlayingWave] = useState(true);
  const isHindi = lang === 'hi';
  const displayTitle = isHindi ? nudge.titleHi : nudge.title;
  const displayMessage = isHindi ? nudge.messageHi : nudge.messageEn;

  useEffect(() => {
    setIsPlayingWave(true);
    const timer = setTimeout(() => setIsPlayingWave(false), 4500);
    return () => clearTimeout(timer);
  }, [nudge]);

  let accentBg = 'bg-amber-50 text-amber-800 border-amber-200';
  let badgeText = 'ZERO-COST BREAK';
  let icon = '⛱️';
  let bannerBorder = 'border-amber-300';

  if (nudge.severity === 'critical') {
    accentBg = 'bg-rose-50 text-rose-800 border-rose-200';
    badgeText = 'URGENT SAFETY STOP';
    icon = '🛑';
    bannerBorder = 'border-rose-400';
  } else if (nudge.severity === 'success') {
    accentBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    badgeText = 'BREAK LOGGED · RECOVERY';
    icon = '✅';
    bannerBorder = 'border-emerald-400';
  } else if (nudge.type === 'on-route') {
    accentBg = 'bg-sky-50 text-sky-800 border-sky-200';
    badgeText = 'ON-ROUTE WATER · 0 DETOUR';
    icon = '💧';
    bannerBorder = 'border-sky-300';
  }

  return (
    <aside
      aria-label="Voice nudge notification"
      className={`fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[2500] bg-white/95 backdrop-blur-2xl border-2 ${bannerBorder} rounded-3xl p-4 shadow-2xl shadow-slate-900/10 text-slate-900 transition-all animate-in slide-in-from-top duration-300`}
    >
      {/* Top micro bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${accentBg}`}>
            {badgeText}
          </span>
        </div>

        {/* Polly Waveform Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3, 4].map(bar => (
              <span
                key={bar}
                className={`w-0.5 rounded-full bg-amber-500 transition-all ${
                  isPlayingWave ? 'animate-bounce' : 'h-1 opacity-40'
                }`}
                style={{
                  height: isPlayingWave ? `${4 + bar * 2}px` : '4px',
                  animationDelay: `${bar * 120}ms`,
                }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              setIsPlayingWave(true);
              onReplayAudio();
              setTimeout(() => setIsPlayingWave(false), 4500);
            }}
            className="text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <span>Polly</span>
            <span>🔊</span>
          </button>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
          {displayTitle}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {displayMessage}
        </p>

        {nudge.pointName && (
          <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex items-center justify-between text-xs mt-2">
            <div className="truncate pr-2">
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Relief Spot</span>
              <span className="font-bold text-slate-800 text-xs truncate block">{nudge.pointName}</span>
            </div>
            {nudge.distanceM && (
              <div className="text-right whitespace-nowrap pl-2 border-l border-slate-200">
                <span className="text-xs font-mono font-bold text-amber-700 block">{nudge.distanceM}m</span>
                <span className="text-[9px] text-slate-400 font-sans block">no detour</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
        {nudge.pointId && (
          <button
            onClick={() => onNavigateToPoint && onNavigateToPoint(nudge.pointId!)}
            className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-2xl text-xs transition shadow flex items-center justify-center gap-1.5"
          >
            <span>🧭</span>
            <span>{isHindi ? 'नेविगेट करें' : 'Navigate On Route'}</span>
          </button>
        )}

        <button
          onClick={onDismiss}
          className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-2xl text-xs font-bold transition"
        >
          {isHindi ? 'ठीक है' : 'Dismiss'}
        </button>
      </div>
    </aside>
  );
};
