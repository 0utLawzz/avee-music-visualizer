import React, { useState } from 'react';
import { VisualizerConfig, AspectRatio } from '../types/visualizer';
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
  AlertCircle
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VisualizerConfig;
  onUpdateConfig: (updater: (prev: VisualizerConfig) => VisualizerConfig) => void;
  onStartExport: (durationSeconds: number, fps: 30 | 60, bitrateBps: number) => void;
  onCancelExport: () => void;
  isExporting: boolean;
  exportProgress: number; // 0 to 100
  exportElapsed: number;
  exportTotalDuration: number;
  completedBlob: Blob | null;
  onDownloadCompleted: () => void;
  onCaptureSnapshot: () => void;
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
  onCaptureSnapshot
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(15);
  const [selectedFps, setSelectedFps] = useState<30 | 60>(60);
  const [selectedBitrate, setSelectedBitrate] = useState<number>(12000000); // 12 Mbps

  if (!isOpen) return null;

  const handleStart = () => {
    onStartExport(selectedDuration, selectedFps, selectedBitrate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Export Video</h3>
              <p className="text-xs text-slate-400">High-fidelity social media video render</p>
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
                Recording canvas and mixing audio stream at {selectedFps} FPS.
              </p>
              <p className="font-mono text-xs text-rose-400 mt-2 font-semibold tabular-nums">
                {exportElapsed.toFixed(1)}s / {exportTotalDuration}s
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
                Rendered at {config.aspectRatio} in full HD. Your download should start automatically.
              </p>
              <p className="font-mono text-xs text-slate-500 mt-1">
                Size: {(completedBlob.size / (1024 * 1024)).toFixed(2)} MB
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
          <div className="py-5 space-y-5">
            {/* Aspect Ratio Preset */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Target Social Media Platform & Aspect Ratio
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateConfig((p) => ({ ...p, aspectRatio: '9:16' }))}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
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
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    config.aspectRatio === '16:9'
                      ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold">16:9 Landscape</span>
                  <span className="text-[10px] text-slate-500">YouTube / X</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateConfig((p) => ({ ...p, aspectRatio: '1:1' }))}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    config.aspectRatio === '1:1'
                      ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold">1:1 Square</span>
                  <span className="text-[10px] text-slate-500">Instagram Feed</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateConfig((p) => ({ ...p, aspectRatio: '4:5' }))}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
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

              {/* Automatic Template Framing Mode */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs mt-2">
                <span className="text-slate-300 font-semibold">Framing Adaptation:</span>
                <select
                  value={config.framingMode || 'fit_blur'}
                  onChange={(e) => onUpdateConfig((p) => ({ ...p, framingMode: e.target.value as any }))}
                  className="bg-slate-900 border border-slate-700 text-xs font-bold text-white rounded px-2 py-1"
                >
                  <option value="fit_blur">Fit & Blur Wings (No Black Bars)</option>
                  <option value="fill_crop">Fill & Zoom Crop</option>
                  <option value="contain_letterbox">Contain Center</option>
                </select>
              </div>
            </div>

            {/* Clip Duration */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Clip Length
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSelectedDuration(dur)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      selectedDuration === dur
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {dur}s {dur === 15 ? '(Hook)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality & Framerate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Frame Rate</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedFps(60)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      selectedFps === 60 ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    60 FPS (Ultra)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFps(30)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      selectedFps === 30 ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    30 FPS
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Bitrate</label>
                <select
                  value={selectedBitrate}
                  onChange={(e) => setSelectedBitrate(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                >
                  <option value={14000000}>14 Mbps (Studio Master)</option>
                  <option value={10000000}>10 Mbps (High Quality)</option>
                  <option value={6000000}>6 Mbps (Social Standard)</option>
                </select>
              </div>
            </div>

            {/* Cover art snapshot shortcut */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300 font-medium">Need thumbnail art?</span>
              </div>
              <button
                type="button"
                onClick={onCaptureSnapshot}
                className="text-xs font-bold text-amber-400 hover:text-amber-300"
              >
                Save Current Frame (PNG)
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-rose-500/25 transition-all transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Start Video Render ({selectedDuration}s)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
