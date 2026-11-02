import React from 'react';
import { Sparkles, Camera, Github, Radio } from 'lucide-react';

interface HeaderProps {
  onOpenExport: () => void;
  onCaptureSnapshot: () => void;
  onOpenRepoMeta: () => void;
  aspectRatio?: string;
  resolution?: string;
  isPlaying?: boolean;
  currentView?: 'studio' | 'clipper';
  onSwitchView?: (view: 'studio' | 'clipper') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExport,
  onCaptureSnapshot,
  onOpenRepoMeta,
  aspectRatio = '16:9',
  resolution = '720P',
  isPlaying = false,
  currentView = 'studio',
  onSwitchView
}) => {
  return (
    <header className="h-16 border-b border-[rgba(240,240,240,0.12)] bg-[#0b0c0d]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-30 shrink-0">
      {/* Technical Status / Viewport Tag & View Mode Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#00ff66] animate-pulse' : 'bg-[#ff3e00]'}`} />
          <span className="font-space text-[10px] tracking-wider text-[rgba(240,240,240,0.5)]">
            {isPlaying ? 'LIVE_STREAM_OK' : 'ENGINE_STANDBY'}
          </span>
        </div>

        <span className="text-[rgba(240,240,240,0.2)]">|</span>

        {/* View Mode Switcher Tabs */}
        {onSwitchView && (
          <div className="flex items-center bg-black/60 border border-[rgba(240,240,240,0.15)] p-0.5">
            <button
              onClick={() => onSwitchView('studio')}
              className={`font-space text-[11px] font-bold px-3 py-1 transition-all ${
                currentView === 'studio'
                  ? 'bg-[#ff3e00] text-black shadow-sm'
                  : 'text-[rgba(240,240,240,0.6)] hover:text-white'
              }`}
            >
              ◈ LIVE STUDIO
            </button>
            <button
              onClick={() => onSwitchView('clipper')}
              className={`font-space text-[11px] font-bold px-3 py-1 transition-all flex items-center gap-1.5 ${
                currentView === 'clipper'
                  ? 'bg-[#ff3e00] text-black shadow-sm'
                  : 'text-[rgba(240,240,240,0.6)] hover:text-white'
              }`}
            >
              <span>✄ 60M+ CLIPPER</span>
              <span className={`text-[8px] px-1 font-mono uppercase ${
                currentView === 'clipper' ? 'bg-black text-[#ff3e00]' : 'bg-[#ff3e00]/20 text-[#ff3e00]'
              }`}>
                PARTS
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Technical Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenRepoMeta}
          title="Repository Architecture & Metadata (Space Mono Spec)"
          className="btn-tech text-[rgba(240,240,240,0.85)] hover:text-white"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Repo Meta</span>
        </button>

        <button
          onClick={onCaptureSnapshot}
          title="Instant 4K/HD Cover Art Snapshot (PNG)"
          className="btn-tech text-[rgba(240,240,240,0.85)] hover:text-white"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Cover Art</span>
        </button>

        <button
          onClick={onOpenExport}
          className="btn-tech btn-tech-primary shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
