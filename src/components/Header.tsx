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
  onToggleMobileDrawer?: () => void;
  isMobileDrawerOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExport,
  onCaptureSnapshot,
  onOpenRepoMeta,
  aspectRatio = '16:9',
  resolution = '480P',
  isPlaying = false,
  currentView = 'studio',
  onSwitchView,
  onToggleMobileDrawer,
  isMobileDrawerOpen = false
}) => {
  return (
    <header className="h-14 sm:h-16 border-b border-[rgba(240,240,240,0.12)] bg-[#0b0c0d]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-30 shrink-0 select-none">
      {/* Technical Status / Viewport Tag & View Mode Switcher */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Drawer Toggle (visible on screens < lg in studio mode) */}
        {onToggleMobileDrawer && currentView === 'studio' && (
          <button
            onClick={onToggleMobileDrawer}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ff3e00]/15 text-[#ff3e00] border border-[#ff3e00]/40 font-space text-xs font-bold shrink-0"
            title="Open Controls & Templates"
          >
            <span>{isMobileDrawerOpen ? '✕' : '☰'}</span>
            <span className="hidden xs:inline">{isMobileDrawerOpen ? 'CLOSE' : 'FX'}</span>
          </button>
        )}

        {/* Live Engine Indicator */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#00ff66] animate-pulse' : 'bg-[#ff3e00]'}`} />
          <span className="font-space text-[10px] tracking-wider text-[rgba(240,240,240,0.5)]">
            {isPlaying ? 'LIVE' : 'STANDBY'}
          </span>
          <span className="text-[rgba(240,240,240,0.2)]">|</span>
        </div>

        {/* Resolution Badge (Highlights 480P low-load mode) */}
        <div className="flex items-center gap-1 font-space text-[9px] sm:text-[10px] bg-white/5 border border-white/10 px-1.5 sm:px-2 py-0.5 shrink-0">
          <span className="text-[#ff3e00] font-bold">{resolution.toUpperCase()}</span>
          <span className="text-white/40 hidden sm:inline">LOW-LOAD</span>
        </div>

        {/* View Mode Switcher Tabs */}
        {onSwitchView && (
          <div className="flex items-center bg-black/60 border border-[rgba(240,240,240,0.15)] p-0.5 shrink-0">
            <button
              onClick={() => onSwitchView('studio')}
              className={`font-space text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 transition-all ${
                currentView === 'studio'
                  ? 'bg-[#ff3e00] text-black shadow-sm'
                  : 'text-[rgba(240,240,240,0.6)] hover:text-white'
              }`}
            >
              ◈ STUDIO
            </button>
            <button
              onClick={() => onSwitchView('clipper')}
              className={`font-space text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 transition-all flex items-center gap-1 ${
                currentView === 'clipper'
                  ? 'bg-[#ff3e00] text-black shadow-sm'
                  : 'text-[rgba(240,240,240,0.6)] hover:text-white'
              }`}
            >
              <span>✄ 60M+</span>
              <span className={`text-[7px] sm:text-[8px] px-1 font-mono uppercase hidden xs:inline ${
                currentView === 'clipper' ? 'bg-black text-[#ff3e00]' : 'bg-[#ff3e00]/20 text-[#ff3e00]'
              }`}>
                CLIP
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Technical Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          onClick={onOpenRepoMeta}
          title="Repository Architecture & Metadata"
          className="btn-tech hidden md:inline-flex text-[rgba(240,240,240,0.85)] hover:text-white text-xs px-2.5 py-1.5"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Docs</span>
        </button>

        <button
          onClick={onCaptureSnapshot}
          title="Instant Snapshot Cover Art (PNG)"
          className="btn-tech hidden sm:inline-flex text-[rgba(240,240,240,0.85)] hover:text-white text-xs px-2.5 py-1.5"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Cover Art</span>
        </button>

        <button
          onClick={onOpenExport}
          className="btn-tech btn-tech-primary shadow-sm text-xs px-2.5 sm:px-3 py-1.5 font-bold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
