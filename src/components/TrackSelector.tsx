import React, { useRef } from 'react';
import { VisualizerConfig, PresetTrack } from '../types/visualizer';
import { PRESET_TRACKS } from '../constants/presets';
import { Music2, Upload, Play, Check, Sparkles } from 'lucide-react';

interface TrackSelectorProps {
  config: VisualizerConfig;
  onSelectPreset: (track: PresetTrack) => void;
  onUploadAudio: (file: File) => void;
  currentTrackId: string;
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({
  config,
  onSelectPreset,
  onUploadAudio,
  currentTrackId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadAudio(e.target.files[0]);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Music2 className="w-5 h-5 text-rose-500" />
          Audio Track & Song Selection
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Add any song from your computer or test with curated studio beats and phonk drops.
        </p>
      </div>

      {/* Upload Any Song Hero Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative rounded-2xl border-2 border-dashed border-rose-500/40 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group shadow-sm"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 group-hover:bg-rose-500 text-rose-400 group-hover:text-white flex items-center justify-center shadow-lg transition-all group-hover:scale-110 mb-3">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
          Click or Drag & Drop Any Song Here
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Supports MP3, WAV, AAC, M4A, FLAC, OGG or MP4 audio. Real-time beat detection analyzes your track instantly.
        </p>

        <span className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
          Browse Audio Files
        </span>
      </div>

      {/* Curated Preloaded Tracks List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Preloaded Soundtracks & Reference Beats
        </h3>

        <div className="divide-y divide-slate-800/80">
          {PRESET_TRACKS.map((track) => {
            const isSelected = currentTrackId === track.id;
            return (
              <div
                key={track.id}
                onClick={() => onSelectPreset(track)}
                className={`py-3.5 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-rose-500/10 text-white border border-rose-500/30'
                    : 'hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isSelected ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white">{track.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {track.artist} · <span className="text-rose-400 font-semibold">{track.genre}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span className="tabular-nums">{track.bpm} BPM</span>
                  <span className="hidden sm:inline tabular-nums">{track.duration}s</span>
                  {isSelected && (
                    <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                      Playing
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
