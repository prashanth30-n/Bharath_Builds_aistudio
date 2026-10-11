import React from 'react';

interface TracePlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  currentIndex: number;
  totalPoints: number;
  onJumpToMilestone: (index: number) => void;
  onReset: () => void;
}

export const TracePlayerControls: React.FC<TracePlayerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  currentIndex,
  totalPoints,
  onJumpToMilestone,
  onReset,
}) => {
  const progressPercent = Math.round((currentIndex / Math.max(1, totalPoints - 1)) * 100);

  return (
    <div className="bg-white/95 rounded-[32px] p-4 shadow-xl shadow-slate-200/60 border border-slate-200/80 text-slate-800 space-y-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="py-2 px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold text-xs transition shadow-md shadow-orange-500/20 flex items-center gap-1.5"
          >
            <span>{isPlaying ? '⏸️ Pause' : '▶️ Play Shift'}</span>
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition"
            title="Reset trail"
          >
            ↺
          </button>

          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            {progressPercent}% done
          </span>
        </div>

        {/* Speed chips */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200 text-xs">
          {[1, 5, 10].map(speed => (
            <button
              key={speed}
              onClick={() => onChangeSpeed(speed)}
              className={`px-2.5 py-0.5 rounded-full font-mono font-bold transition text-[11px] ${
                playbackSpeed === speed
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal-500 via-amber-500 to-rose-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Fast milestone scenario test pills */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Demo Test Milestones for Judges:
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onJumpToMilestone(2)}
            className="py-1 px-3 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-[11px] font-semibold transition"
          >
            💧 On-Route Water (0 Detour)
          </button>
          <button
            onClick={() => onJumpToMilestone(5)}
            className="py-1 px-3 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold transition"
          >
            ⛱️ Free Idle Shade Nudge
          </button>
          <button
            onClick={() => onJumpToMilestone(8)}
            className="py-1 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold transition"
          >
            ✅ Auto Break Logged
          </button>
          <button
            onClick={() => onJumpToMilestone(10)}
            className="py-1 px-3 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-semibold transition"
          >
            🛑 Critical Stop Nudge
          </button>
        </div>
      </div>
    </div>
  );
};
