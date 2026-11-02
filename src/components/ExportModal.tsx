import React, { useState, useMemo, useEffect } from 'react';
import { VisualizerConfig } from '../types/visualizer';
import {
  X,
  Sparkles,
  Download,
  Film,
  Camera,
  Check,
  Smartphone,
  Tv,
  Square,
  Clock,
  Scissors,
  HardDrive,
  Zap,
  RotateCcw
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VisualizerConfig;
  onUpdateConfig: (updater: (prev: VisualizerConfig) => VisualizerConfig) => void;
  onStartExport: (startTime: number, endTime: number, fps: 24 | 30 | 60, bitrateBps: number) => void;
  onCancelExport: () => void;
  isExporting: boolean;
  exportProgress: number; // 0 to 100
  exportElapsed: number;
  exportTotalDuration: number;
  completedBlob: Blob | null;
  onDownloadCompleted: () => void;
  onCaptureSnapshot: () => void;
  trackDuration?: number;
  currentPlaybackTime?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onStartExport,
  onCancelExport,
  isExporting,
  exportProgress,
  exportElapsed,
  exportTotalDuration,
  completedBlob,
  onDownloadCompleted,
  onCaptureSnapshot,
  trackDuration = 30,
  currentPlaybackTime = 0
}) => {
  // Safe track duration
  const maxDuration = Math.max(5, trackDuration || config.audio.duration || 30);

  // Range mode: 'full' (0 to maxDuration) or 'selected' (startTime to endTime)
  const [rangeMode, setRangeMode] = useState<'full' | 'selected'>('selected');
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(() => Math.min(15, maxDuration));
  const [selectedFps, setSelectedFps] = useState<24 | 30 | 60>(60);
  const [selectedBitrate, setSelectedBitrate] = useState<number>(12000000); // 12 Mbps default

  // Synchronize initial endTime if maxDuration becomes available
  useEffect(() => {
    if (rangeMode === 'full') {
      setStartTime(0);
      setEndTime(maxDuration);
    } else {
      if (endTime > maxDuration) {
        setEndTime(maxDuration);
      }
    }
  }, [maxDuration, rangeMode]);

  // Calculated effective render duration in seconds
  const effectiveDuration = useMemo(() => {
    if (rangeMode === 'full') {
      return maxDuration;
    }
    const dur = Math.max(0.5, endTime - startTime);
    return Math.min(maxDuration, dur);
  }, [rangeMode, startTime, endTime, maxDuration]);

  // Dynamic live estimated file size calculation
  // Total bits = (Video bitrate + ~192kbps stereo audio) * duration
  const estimatedSize = useMemo(() => {
    const audioBitrateBps = 192000; // 192 kbps
    const totalBitrateBps = selectedBitrate + audioBitrateBps;
    const totalBytes = (totalBitrateBps * effectiveDuration) / 8;
    const totalMB = totalBytes / (1024 * 1024);
    const totalFrames = Math.round(effectiveDuration * selectedFps);

    let formatted = '';
    if (totalMB >= 1024) {
      formatted = `${(totalMB / 1024).toFixed(2)} GB`;
    } else {
      formatted = `${totalMB.toFixed(1)} MB`;
    }

    return {
      totalBytes,
      totalMB,
      formatted,
      totalFrames
    };
  }, [selectedBitrate, effectiveDuration, selectedFps]);

  if (!isOpen) return null;

  // Format seconds to mm:ss.s
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const dec = Math.floor((secs % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${dec}`;
  };

  const handleStart = () => {
    const start = rangeMode === 'full' ? 0 : Math.max(0, startTime);
    const end = rangeMode === 'full' ? maxDuration : Math.min(maxDuration, Math.max(start + 0.5, endTime));
    onStartExport(start, end, selectedFps, selectedBitrate);
  };

  const setClipLength = (seconds: number) => {
    setRangeMode('selected');
    const newEnd = Math.min(maxDuration, startTime + seconds);
    setEndTime(newEnd);
  };

  const setStartToCurrent = () => {
    setRangeMode('selected');
    const safeNow = Math.min(maxDuration - 1, Math.max(0, currentPlaybackTime));
    setStartTime(safeNow);
    if (endTime <= safeNow) {
      setEndTime(Math.min(maxDuration, safeNow + 15));
    }
  };

  const setEndToCurrent = () => {
    setRangeMode('selected');
    const safeNow = Math.min(maxDuration, Math.max(0.5, currentPlaybackTime));
    setEndTime(safeNow);
    if (startTime >= safeNow) {
      setStartTime(Math.max(0, safeNow - 15));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Export Video</h3>
              <p className="text-xs text-slate-400">High-fidelity social media render with beat sync</p>
            </div>
          </div>

          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Export In-Progress State */}
        {isExporting ? (
          <div className="py-8 space-y-6 text-center">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#1e293b"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#f43f5e"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * exportProgress) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-200"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-extrabold text-white tabular-nums">
                  {exportProgress}%
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Rendering Beat-Synced Video...</h4>
              <p className="text-xs text-slate-400 mt-1">
                Recording canvas and mixing master audio at {selectedFps} FPS.
              </p>
              <p className="font-mono text-xs text-rose-400 mt-2 font-semibold tabular-nums">
                {exportElapsed.toFixed(1)}s / {exportTotalDuration.toFixed(1)}s rendered
              </p>
            </div>

            <button
              onClick={onCancelExport}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel Render
            </button>
          </div>
        ) : completedBlob ? (
          /* Export Completed State */
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Video Ready for Sharing!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Rendered at {config.aspectRatio} in high resolution.
              </p>
              <p className="font-mono text-xs text-slate-400 mt-1">
                Actual Size: {(completedBlob.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onDownloadCompleted}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/30 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Again
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Export Configuration Form */
          <div className="py-4 space-y-5">
            {/* 1. Range Selection: Full vs Selected Range */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-rose-400" />
                  1. Export Range (Full Song or Selected Window)
                </label>
                <span className="text-[11px] font-mono font-semibold text-rose-400">
                  Duration: {effectiveDuration.toFixed(1)}s
                </span>
              </div>

              {/* Mode Toggle Pills */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRangeMode('full')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    rangeMode === 'full'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Full Track (0:00 - {formatTime(maxDuration)})
                </button>

                <button
                  type="button"
                  onClick={() => setRangeMode('selected')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    rangeMode === 'selected'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Selected Range (Custom Clip)
                </button>
              </div>

              {/* Range Details & Fine-grained Controls */}
              {rangeMode === 'selected' && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  {/* Visual Range Timeline Bar */}
                  <div className="space-y-1">
                    <div className="relative h-4 bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                      {/* Selected region highlight */}
                      <div
                        className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 to-amber-500 opacity-80"
                        style={{
                          left: `${(startTime / maxDuration) * 100}%`,
                          width: `${(effectiveDuration / maxDuration) * 100}%`
                        }}
                      />
                      {/* Current playhead marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
                        style={{ left: `${(Math.min(maxDuration, currentPlaybackTime) / maxDuration) * 100}%` }}
                        title={`Current Playhead: ${formatTime(currentPlaybackTime)}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>0:00.0</span>
                      <span className="text-cyan-400">Playhead: {formatTime(currentPlaybackTime)}</span>
                      <span>{formatTime(maxDuration)}</span>
                    </div>
                  </div>

                  {/* Start and End Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                        <span>Start Time</span>
                        <span className="font-mono text-rose-400">{formatTime(startTime)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, endTime - 0.5)}
                        step={0.1}
                        value={startTime}
                        onChange={(e) => setStartTime(parseFloat(e.target.value))}
                        className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={setStartToCurrent}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        Set Start to Now ({formatTime(currentPlaybackTime)})
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                        <span>End Time</span>
                        <span className="font-mono text-amber-400">{formatTime(endTime)}</span>
                      </div>
                      <input
                        type="range"
                        min={startTime + 0.5}
                        max={maxDuration}
                        step={0.1}
                        value={endTime}
                        onChange={(e) => setEndTime(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={setEndToCurrent}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        Set End to Now ({formatTime(currentPlaybackTime)})
                      </button>
                    </div>
                  </div>

                  {/* Quick Clip Length Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Quick Clips:
                    </span>
                    {[
                      { label: '15s (Reels / TikTok)', sec: 15 },
                      { label: '30s (Shorts)', sec: 30 },
                      { label: '45s (Story)', sec: 45 },
                      { label: '60s (Full Drop)', sec: 60 }
                    ].map((preset) => (
                      <button
                        key={preset.sec}
                        type="button"
                        onClick={() => setClipLength(preset.sec)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          Math.abs(effectiveDuration - preset.sec) < 0.2
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime(0);
                        setEndTime(maxDuration);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800 hover:text-white flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Platform & Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Target Social Media Platform & Aspect Ratio
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateConfig((p) => ({ ...p, aspectRatio: '9:16' }))}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    config.aspectRatio === '9:16'
                      ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold">9:16 Vertical</span>
                  <span className="text-[10px] text-slate-500">TikTok / Reels</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateConfig((p) => ({ ...p, aspectRatio: '16:9' }))}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    config.aspectRatio === '16:9'
                      ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold">16:9 Wide</span>
                  <span className="text-[10px] text-slate-500">YouTube / X</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateConfig((p) => ({ ...p, aspectRatio: '1:1' }))}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    config.aspectRatio === '1:1'
                      ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold">1:1 Square</span>
                  <span className="text-[10px] text-slate-500">IG Feed</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateConfig((p) => ({ ...p, aspectRatio: '4:5' }))}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    config.aspectRatio === '4:5'
                      ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold">4:5 Portrait</span>
                  <span className="text-[10px] text-slate-500">IG Portrait</span>
                </button>
              </div>
            </div>

            {/* 3. Frame Rate (FPS) & Bitrate with Live Auto-Size Calculation */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                3. Frame Rate & Quality Bitrate
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Frame Rate (FPS) */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">Frame Rate (FPS)</span>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedFps(60)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        selectedFps === 60 ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      60 FPS
                      <span className="block text-[9px] font-normal opacity-85">Fluid Pro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFps(30)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        selectedFps === 30 ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      30 FPS
                      <span className="block text-[9px] font-normal opacity-85">Standard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFps(24)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        selectedFps === 24 ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      24 FPS
                      <span className="block text-[9px] font-normal opacity-85">Cinema</span>
                    </button>
                  </div>
                </div>

                {/* Video Bitrate */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">Bitrate & Encoding</span>
                  <select
                    value={selectedBitrate}
                    onChange={(e) => setSelectedBitrate(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value={16000000}>16 Mbps (Master Ultra Quality)</option>
                    <option value={12000000}>12 Mbps (Studio 1080p - Recommended)</option>
                    <option value={8000000}>8 Mbps (High Quality Social)</option>
                    <option value={4000000}>4 Mbps (Compact / Discord / Mobile)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Dynamic Estimated File Size Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-rose-500/30 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Auto-Calculated Estimated File Size
                    </span>
                    <span className="font-mono text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400">
                      ~{estimatedSize.formatted}
                    </span>
                  </div>
                </div>

                {/* Social limits badge */}
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      estimatedSize.totalMB < 50
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : estimatedSize.totalMB < 100
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {estimatedSize.totalMB < 25
                      ? '⚡ Discord & WhatsApp Friendly'
                      : estimatedSize.totalMB < 50
                      ? '✅ TikTok & Reels Ready'
                      : estimatedSize.totalMB < 100
                      ? '🎬 High-Res Social'
                      : '📦 Studio Archive'}
                  </span>
                </div>
              </div>

              {/* Technical specs breakdown bar */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400">
                <div>
                  <span className="text-slate-500 block">Render Length</span>
                  <span className="text-slate-200 font-bold">{effectiveDuration.toFixed(1)}s</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Frames</span>
                  <span className="text-slate-200 font-bold">~{estimatedSize.totalFrames.toLocaleString()} frames</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bitrate</span>
                  <span className="text-slate-200 font-bold">{(selectedBitrate / 1000000).toFixed(1)}M + 192k</span>
                </div>
              </div>
            </div>

            {/* Cover art snapshot shortcut */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300 font-medium">Need thumbnail / cover art?</span>
              </div>
              <button
                type="button"
                onClick={onCaptureSnapshot}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Save Current Frame (PNG)
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 font-space">
              <button
                type="button"
                onClick={onClose}
                className="btn-tech text-[rgba(240,240,240,0.6)] hover:text-white"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleStart}
                className="btn-tech btn-tech-accent shadow-lg shadow-[#ff3e00]/25 text-xs font-bold"
              >
                <Sparkles className="w-4 h-4" />
                START EXPORT ({effectiveDuration.toFixed(1)}s • ~{estimatedSize.formatted})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
