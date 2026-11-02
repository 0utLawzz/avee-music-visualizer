import React from 'react';
import { VisualizerConfig, TemplateId, TransitionEffect } from '../types/visualizer';
import {
  Check,
  Flame,
  Disc,
  Radio,
  Activity,
  Sparkles,
  Zap,
  SlidersHorizontal,
  Play,
  Crown,
  Heart,
  Box,
  Volume2,
  Tv
} from 'lucide-react';

interface TemplatePickerProps {
  config: VisualizerConfig;
  onSelectTemplate: (templateId: TemplateId) => void;
  onUpdateConfig: (updater: (prev: VisualizerConfig) => VisualizerConfig) => void;
  onTestTransition?: () => void;
}

interface TemplateMeta {
  id: TemplateId;
  name: string;
  tagline: string;
  genre: string;
  accent: string;
  icon: React.ReactNode;
  tags: string[];
  badge?: string;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  config,
  onSelectTemplate,
  onUpdateConfig,
  onTestTransition
}) => {
  const templates: TemplateMeta[] = [
    // Avee Player Gallery Featured Templates (From User References)
    {
      id: 'cyber_horizon',
      name: 'Cyber Horizon HUD',
      tagline: 'Inverted ceiling & floor spectrum with realtime center waveform HUD and geometric skip controls.',
      genre: 'Avee Gallery / Synthwave',
      accent: 'from-teal-500 to-cyan-500',
      icon: <Tv className="w-5 h-5 text-teal-400" />,
      tags: ['Ceiling & Floor Bars', 'Center HUD Wave', 'Geometric Triangle HUD'],
      badge: 'Avee #Gallery'
    },
    {
      id: 'phonk_crown',
      name: 'Phonk Reaper Crown',
      tagline: 'Spiky crowned waveform contour ring with pulsing center reaper crest and drifting embers.',
      genre: 'Phonk / Drift / 808',
      accent: 'from-blue-600 to-indigo-600',
      icon: <Crown className="w-5 h-5 text-blue-400" />,
      tags: ['Crowned Peaks', 'Drift 808 Bass Shake', 'Phonk Tag'],
      badge: 'Avee #Gallery'
    },
    {
      id: 'neon_box_frame',
      name: 'Neon Box Frame & Hearts',
      tagline: '4-sided inward and outward box equalizer with floating glowing hearts, script typography, and seeker.',
      genre: 'Lofi / Romantic / Chill',
      accent: 'from-sky-500 to-cyan-400',
      icon: <Heart className="w-5 h-5 text-sky-400" />,
      tags: ['4-Edge Spectrum', 'Floating Hearts', 'Top Script & Seeker'],
      badge: 'Avee #Gallery'
    },
    {
      id: 'tunnel_portal',
      name: '3D Cube Warp Portal',
      tagline: 'Cyber wave portal frame with 3D perspective cubes streaming into screen, accelerated by kick drops.',
      genre: 'EDM / Cyber / Future',
      accent: 'from-sky-500 to-indigo-500',
      icon: <Box className="w-5 h-5 text-sky-400" />,
      tags: ['3D Warp Cubes', 'Portal Wave Border', 'Kick Acceleration'],
      badge: 'Avee #Gallery'
    },
    {
      id: 'twin_woofers',
      name: 'Twin Bass Woofers',
      tagline: 'Dual subwoofers pumping with bass, surrounded by fiery solar flares and triple oscilloscope sinewaves.',
      genre: 'Bass Boosted / Car Audio',
      accent: 'from-red-600 to-orange-500',
      icon: <Volume2 className="w-5 h-5 text-red-400" />,
      tags: ['Dual Subwoofers', 'Sunburst Flares', 'Triple Sine Waves'],
      badge: 'Avee #Gallery'
    },

    // Classic Signature Presets
    {
      id: 'avee_classic',
      name: 'Avee Classic Dual-Wing',
      tagline: 'Signature Avee Player dual-winged spectrum with side waveforms and central badge kick.',
      genre: 'Trap / Phonk / Wave',
      accent: 'from-rose-500 to-red-600',
      icon: <Radio className="w-5 h-5 text-rose-400" />,
      tags: ['Symmetric Wings', 'Side Waveforms', 'VHS Overlay']
    },
    {
      id: 'trap_nation',
      name: 'Trap Nation Monolith',
      tagline: 'High-energy 360° radial spikes with explosive particle shockwaves and heavy bass bounce.',
      genre: 'Trap / Bass / EDM',
      accent: 'from-red-600 to-amber-500',
      icon: <Flame className="w-5 h-5 text-amber-400" />,
      tags: ['Heavy Bass Zoom', 'Particle Blasts', 'Diamond Spikes']
    },
    {
      id: 'neon_grid',
      name: 'Cyberpunk Synth Grid',
      tagline: '3D perspective neon floor, hexagonal audio core, and CRT scanlines.',
      genre: 'Synthwave / Cyberpunk',
      accent: 'from-cyan-500 to-fuchsia-500',
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      tags: ['3D Grid Floor', 'Hexagon Core', 'Scanlines']
    },
    {
      id: 'monstercat_bars',
      name: 'Monstercat Equalizer Arena',
      tagline: 'Mirrored bottom spectrum bars with floating peak caps and glossy reflective floor.',
      genre: 'Dubstep / Electro',
      accent: 'from-emerald-500 to-teal-500',
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      tags: ['Floating Peak Caps', 'Floor Reflection', 'Equalizer']
    },
    {
      id: 'vinyl_record',
      name: 'Vinyl Spin & Lo-Fi Chill',
      tagline: 'Spinning vinyl record disc with grooved center label and circular oscilloscope wave.',
      genre: 'Lo-Fi / Hip-Hop',
      accent: 'from-amber-500 to-orange-500',
      icon: <Disc className="w-5 h-5 text-amber-400" />,
      tags: ['Spinning Vinyl', 'Oscilloscope Wave', 'Warm Film Grain']
    },
    {
      id: 'starburst',
      name: 'Starburst Supernova',
      tagline: 'Dense 360° multi-color frequency rays with dynamic spin and starry nebula fireworks.',
      genre: 'Future Bass / Melodic',
      accent: 'from-purple-500 to-pink-500',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      tags: ['Dense Rays', 'Cosmic Aura', 'Color Shift']
    }
  ];

  const transitionEffects: { id: TransitionEffect; label: string; desc: string }[] = [
    { id: 'blur_dissolve', label: 'Blur Dissolve', desc: 'Spikes dynamic Gaussian blur during crossfade' },
    { id: 'crossfade', label: 'Smooth Crossfade', desc: 'Linear opacity blend between scenes' },
    { id: 'wipe_left', label: 'Laser Wipe Left', desc: 'Glowing neon divider wipe to left' },
    { id: 'wipe_right', label: 'Laser Wipe Right', desc: 'Glowing sweep to right' },
    { id: 'radial_iris', label: 'Radial Iris', desc: 'Circular expanding camera iris from center' },
    { id: 'glitch_cut', label: 'Glitch Cut', desc: 'Horizontal slice displacement jitter' },
    { id: 'none', label: 'Instant Cut', desc: 'No transition effect' }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Visualizer Templates</h2>
        <p className="text-sm text-slate-400 mt-1">
          Select a dashing audio-reactive template inspired by legendary music channels and Avee Player.
        </p>
      </div>

      {/* Transition Engine Customization Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Template Transition Engine
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.transitions?.enabled ?? true}
                onChange={(e) =>
                  onUpdateConfig((p) => ({
                    ...p,
                    transitions: { ...p.transitions, enabled: e.target.checked }
                  }))
                }
                className="rounded text-rose-500 focus:ring-0"
              />
              Enable Transitions
            </label>

            {onTestTransition && (
              <button
                onClick={onTestTransition}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-400 rounded-lg border border-slate-700 transition-colors"
              >
                <Play className="w-3 h-3 fill-rose-400" />
                Test Transition
              </button>
            )}
          </div>
        </div>

        {/* Transition Style Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {transitionEffects.map((t) => {
            const isSelected = (config.transitions?.effect || 'blur_dissolve') === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  onUpdateConfig((p) => ({
                    ...p,
                    transitions: { ...p.transitions, effect: t.id }
                  }))
                }
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span className="text-xs font-bold block">{t.label}</span>
                <span className="text-[10px] text-slate-500 line-clamp-1">{t.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Duration Slider */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Transition Duration</span>
            <span className="font-mono text-slate-400 font-bold tabular-nums">
              {(config.transitions?.duration || 0.6).toFixed(2)}s
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={1.5}
            step={0.05}
            value={config.transitions?.duration || 0.6}
            onChange={(e) =>
              onUpdateConfig((p) => ({
                ...p,
                transitions: { ...p.transitions, duration: parseFloat(e.target.value) }
              }))
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => {
          const isSelected = config.template === tpl.id;
          return (
            <div
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl.id)}
              className={`relative rounded-2xl p-5 border cursor-pointer transition-all flex flex-col justify-between group ${
                isSelected
                  ? 'bg-slate-900 border-rose-500/80 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
                      {tpl.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {tpl.genre}
                    </span>
                    {tpl.badge && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider">
                        {tpl.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
                  {tpl.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                  {tpl.tagline}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {tpl.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  {isSelected ? 'Loaded in Stage' : 'Click to Apply Transition'}
                </span>
                <button
                  type="button"
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isSelected ? 'Current' : 'Select'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
