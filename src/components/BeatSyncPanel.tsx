import React, { useState, useEffect } from 'react';
import { VisualizerConfig, BeatDetectionState, BeatPoint, BeatSyncMode, BeatSensitivityPreset } from '../types/visualizer';
import {
  Radio,
  Zap,
  Gauge,
  Sliders,
  RefreshCw,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  Wand2,
  Clock
} from 'lucide-react';

interface BeatSyncPanelProps {
  config: VisualizerConfig;
  onUpdateConfig: (updater: (prev: VisualizerConfig) => VisualizerConfig) => void;
  beatState: BeatDetectionState;
  playbackTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const BeatSyncPanel: React.FC<BeatSyncPanelProps> = ({
  config,
  onUpdateConfig,
  beatState,
  playbackTime,
  duration,
  onSeek
}) => {
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  // Tap tempo handler to calibrate BPM manually
  const handleTapTempo = () => {
    const now = performance.now();
    const newTaps = [...tapTimes, now].filter((t) => now - t < 3000);
    setTapTimes(newTaps);

    if (newTaps.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 50 && bpm <= 220) {
        onUpdateConfig((prev) => ({
          ...prev,
          audio: { ...prev.audio, bpm }
        }));
      }
    }
  };

  // Keyboard shortcut: Press 'B' to drop beat point at current playback time
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          handleAddBeatAtPlayhead();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackTime]);

  // Add beat point at current playhead
  const handleAddBeatAtPlayhead = () => {
    const time = parseFloat(playbackTime.toFixed(2));
    const newPoint: BeatPoint = {
      id: `beat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time,
      intensity: 1.0,
      type: 'manual'
    };

    onUpdateConfig((prev) => {
      const existing = prev.beatDetection.manualBeats || [];
      // avoid duplicates within 50ms
      if (existing.some((b) => Math.abs(b.time - time) < 0.05)) return prev;
      const updated = [...existing, newPoint].sort((a, b) => a.time - b.time);
      return {
        ...prev,
        beatDetection: {
          ...prev.beatDetection,
          manualBeats: updated
        }
      };
    });
  };

  // Delete a beat point
  const handleDeleteBeat = (id: string) => {
    onUpdateConfig((prev) => ({
      ...prev,
      beatDetection: {
        ...prev.beatDetection,
        manualBeats: (prev.beatDetection.manualBeats || []).filter((b) => b.id !== id)
      }
    }));
  };

  // Generate regular beat grid from BPM
  const handleGenerateGrid = () => {
    const bpm = config.audio.bpm || 130;
    const interval = 60 / bpm;
    const totalBeats = Math.floor(duration / interval);
    const newBeats: BeatPoint[] = [];

    for (let i = 0; i <= totalBeats; i++) {
      const t = parseFloat((i * interval).toFixed(2));
      if (t <= duration) {
        newBeats.push({
          id: `grid_${i}`,
          time: t,
          intensity: i % 4 === 0 ? 1.0 : 0.75,
          type: 'manual'
        });
      }
    }

    onUpdateConfig((prev) => ({
      ...prev,
      beatDetection: {
        ...prev.beatDetection,
        manualBeats: newBeats
      }
    }));
  };

  // Clear all manual beats
  const handleClearBeats = () => {
    onUpdateConfig((prev) => ({
      ...prev,
      beatDetection: {
        ...prev.beatDetection,
        manualBeats: []
      }
    }));
  };

  // Nudge visual timing forward or backward
  const handleNudge = (deltaMs: number) => {
    onUpdateConfig((prev) => ({
      ...prev,
      beatDetection: {
        ...prev.beatDetection,
        nudgeMs: Math.max(-300, Math.min(300, (prev.beatDetection.nudgeMs || 0) + deltaMs))
      }
    }));
  };

  // Sensitivity level presets
  const handleSetSensitivityPreset = (preset: BeatSensitivityPreset) => {
    let sensitivity = 1.35;
    let subBassThreshold = 0.15;
    let decaySpeed = 0.88;

    switch (preset) {
      case 'low':
        sensitivity = 1.65;
        subBassThreshold = 0.28;
        decaySpeed = 0.84;
        break;
      case 'medium':
        sensitivity = 1.35;
        subBassThreshold = 0.15;
        decaySpeed = 0.88;
        break;
      case 'high':
        sensitivity = 1.15;
        subBassThreshold = 0.10;
        decaySpeed = 0.92;
        break;
      case 'hyper':
        sensitivity = 1.02;
        subBassThreshold = 0.05;
        decaySpeed = 0.94;
        break;
      case 'custom':
        break;
    }

    onUpdateConfig((prev) => ({
      ...prev,
      beatDetection: {
        ...prev.beatDetection,
        sensitivityPreset: preset,
        sensitivity,
        subBassThreshold,
        decaySpeed
      }
    }));
  };

  const manualBeats = config.beatDetection.manualBeats || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Radio className="w-5 h-5 text-rose-500" />
          Advanced Beat Synchronization & Hot Cues
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Adjust manual beat points, nudge visual hit timing, and set multi-tier detection sensitivity.
        </p>
      </div>

      {/* Live Audio Energy & Beat Monitor Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-rose-400" />
            Live Beat Engine Telemetry
          </span>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase transition-all duration-75 flex items-center gap-1.5 ${
                beatState.isBeat
                  ? beatState.isManualHit
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50 scale-105'
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/50 scale-105'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {beatState.isBeat
                ? beatState.isManualHit
                  ? 'MANUAL CUE HIT'
                  : 'AUTO BEAT KICK'
                : 'LISTENING'}
            </span>
          </div>
        </div>

        {/* Meters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Sub-Bass Power</span>
              <span className="font-mono text-white font-bold tabular-nums">
                {(beatState.bassEnergy * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, beatState.bassEnergy * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Mid/Treble Energy</span>
              <span className="font-mono text-white font-bold tabular-nums">
                {(beatState.midEnergy * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, beatState.midEnergy * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Pulse Envelope</span>
              <span className="font-mono text-white font-bold tabular-nums">
                {(beatState.pulseDecay * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, beatState.pulseDecay * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Visual Nudge & Timing Offset */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Nudge Visuals in Time (Latency & Anticipation)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Shift the visual hit timing forward or backward to hit exactly when the bass explodes.
            </p>
          </div>

          <span className="font-mono text-sm font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2.5 py-1 rounded-lg tabular-nums">
            {(config.beatDetection.nudgeMs || 0) > 0 ? `+${config.beatDetection.nudgeMs}` : config.beatDetection.nudgeMs || 0} ms
          </span>
        </div>

        <input
          type="range"
          min={-250}
          max={250}
          step={5}
          value={config.beatDetection.nudgeMs || 0}
          onChange={(e) =>
            onUpdateConfig((prev) => ({
              ...prev,
              beatDetection: {
                ...prev.beatDetection,
                nudgeMs: parseInt(e.target.value)
              }
            }))
          }
          className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleNudge(-50)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              -50ms (Earlier)
            </button>
            <button
              onClick={() => handleNudge(-10)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              -10ms
            </button>
          </div>

          <button
            onClick={() =>
              onUpdateConfig((prev) => ({
                ...prev,
                beatDetection: { ...prev.beatDetection, nudgeMs: 0 }
              }))
            }
            className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Reset 0ms
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleNudge(10)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              +10ms
            </button>
            <button
              onClick={() => handleNudge(50)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              +50ms (Later)
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Beat Detection Sensitivity Levels & Sync Mode */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Beat Detection Sensitivity & Trigger Mode
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an algorithm profile or configure precise frequency thresholds.
            </p>
          </div>

          {/* Sync Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['hybrid', 'auto_only', 'manual_only'] as BeatSyncMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() =>
                  onUpdateConfig((prev) => ({
                    ...prev,
                    beatDetection: { ...prev.beatDetection, syncMode: mode }
                  }))
                }
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors capitalize ${
                  config.beatDetection.syncMode === mode
                    ? 'bg-rose-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivity Presets Bar */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Sensitivity Level Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['low', 'medium', 'high', 'hyper', 'custom'] as BeatSensitivityPreset[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleSetSensitivityPreset(lvl)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                  config.beatDetection.sensitivityPreset === lvl
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 ring-1 ring-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Fine-Tuning Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Sub-Bass Threshold */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Sub-Bass Gate</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {((config.beatDetection.subBassThreshold ?? 0.15) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.02}
              value={config.beatDetection.subBassThreshold ?? 0.15}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  beatDetection: {
                    ...prev.beatDetection,
                    sensitivityPreset: 'custom',
                    subBassThreshold: parseFloat(e.target.value)
                  }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Dynamic Sensitivity Multiplier */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Threshold Multiplier</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {config.beatDetection.sensitivity.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={2.4}
              step={0.05}
              value={config.beatDetection.sensitivity}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  beatDetection: {
                    ...prev.beatDetection,
                    sensitivityPreset: 'custom',
                    sensitivity: parseFloat(e.target.value)
                  }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Decay Speed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Envelope Decay</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {(config.beatDetection.decaySpeed ?? 0.88).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.78}
              max={0.96}
              step={0.02}
              value={config.beatDetection.decaySpeed ?? 0.88}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  beatDetection: {
                    ...prev.beatDetection,
                    sensitivityPreset: 'custom',
                    decaySpeed: parseFloat(e.target.value)
                  }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Beat Movement Smoothness (Fluidity) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Motion Fluidity</span>
              <span className="font-mono text-sky-400 font-bold tabular-nums">
                {((config.beatDetection.movementSmoothing ?? 0.78) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.96}
              step={0.02}
              value={config.beatDetection.movementSmoothing ?? 0.78}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  beatDetection: {
                    ...prev.beatDetection,
                    movementSmoothing: parseFloat(e.target.value)
                  }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Snappy Punch</span>
              <span>Liquid Smooth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Manual Beat Points Timeline & Hot Cues */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-500" />
              Manual Beat Points & Hot Cues ({manualBeats.length} Points)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add custom cue points at exact bass drops. Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-rose-400 font-mono rounded text-[11px] font-bold">B</kbd> while listening to drop a point!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateGrid}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Generate a regular beat grid from current BPM"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Snap Grid ({config.audio.bpm} BPM)
            </button>

            <button
              onClick={handleClearBeats}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/80 rounded-xl transition-colors"
              title="Clear all manual beat points"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Mini Beat Grid Timeline */}
        <div className="relative h-12 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center px-2">
          {/* Playhead position */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-md"
            style={{ left: `${Math.min(100, (playbackTime / Math.max(1, duration)) * 100)}%` }}
          />

          {/* Render markers */}
          {manualBeats.map((b) => {
            const pct = (b.time / Math.max(1, duration)) * 100;
            return (
              <div
                key={b.id}
                onClick={() => onSeek(b.time)}
                title={`Beat at ${b.time.toFixed(2)}s - Click to jump`}
                className="absolute top-1 bottom-1 w-1 bg-amber-400 hover:bg-white rounded-full cursor-pointer z-10 transition-transform hover:scale-125"
                style={{ left: `${pct}%` }}
              />
            );
          })}
        </div>

        {/* Add Cue Button & Tap Tempo */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleAddBeatAtPlayhead}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Beat Point at Playhead ({playbackTime.toFixed(2)}s)
          </button>

          <button
            onClick={handleTapTempo}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors whitespace-nowrap"
          >
            Tap Tempo ({config.audio.bpm} BPM)
          </button>
        </div>

        {/* Recent Beat Markers Scrollable Chips */}
        {manualBeats.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Recent Beat Markers (Click to jump / delete):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {manualBeats.slice(0, 30).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                >
                  <span
                    onClick={() => onSeek(b.time)}
                    className="cursor-pointer hover:text-amber-400"
                  >
                    {b.time.toFixed(2)}s
                  </span>
                  <button
                    onClick={() => handleDeleteBeat(b.id)}
                    className="text-slate-500 hover:text-rose-400 ml-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
