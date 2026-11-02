import React from 'react';
import { Sparkles, Camera, Film, Layers, Sliders, Radio, Music2, Github, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: 'templates' | 'visuals' | 'sync' | 'overlays' | 'audio';
  setActiveTab: (tab: 'templates' | 'visuals' | 'sync' | 'overlays' | 'audio') => void;
  onOpenExport: () => void;
  onCaptureSnapshot: () => void;
  onOpenRepoMeta: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenExport,
  onCaptureSnapshot,
  onOpenRepoMeta
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between gap-8 z-30 shrink-0">
      {/* Zone 1: Wordmark Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
          PulseCraft <span className="text-rose-500 font-medium">Studio</span>
        </span>
      </div>

      {/* Zone 2: Navigation Links / Studio Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'templates'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Templates
        </button>

        <button
          onClick={() => setActiveTab('visuals')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'visuals'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Visualizer FX
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'sync'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Beat & Sync
        </button>

        <button
          onClick={() => setActiveTab('overlays')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'overlays'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          Overlays & VHS
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'audio'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Music2 className="w-3.5 h-3.5" />
          Audio & Media
        </button>
      </nav>

      {/* Zone 3: Primary Action & Quick Export */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenRepoMeta}
          title="Repository Metadata (Name, Description, Topics, Technologies)"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Github className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Repo Meta</span>
        </button>

        <button
          onClick={onCaptureSnapshot}
          title="Instant 4K/HD Cover Art Snapshot (PNG)"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Camera className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Cover Art</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-lg shadow-lg shadow-rose-500/25 transition-all transform active:scale-95 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
