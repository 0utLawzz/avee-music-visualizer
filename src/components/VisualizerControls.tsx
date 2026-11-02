import React, { useRef } from 'react';
import { VisualizerConfig } from '../types/visualizer';
import { Sliders, Palette, Shield, Image, Upload, Trash2 } from 'lucide-react';

interface VisualizerControlsProps {
  config: VisualizerConfig;
  onUpdateConfig: (updater: (prev: VisualizerConfig) => VisualizerConfig) => void;
  onUploadLogo: (file: File) => void;
  onClearLogo: () => void;
  onUploadBackground: (file: File) => void;
  hasCustomLogo: boolean;
  hasCustomBg: boolean;
}

export const VisualizerControls: React.FC<VisualizerControlsProps> = ({
  config,
  onUpdateConfig,
  onUploadLogo,
  onClearLogo,
  onUploadBackground,
  hasCustomLogo,
  hasCustomBg
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const colorPresets = [
    { name: 'Crimson Glow', primary: '#ff2a55', secondary: '#ffffff', accent: '#38bdf8' },
    { name: 'Trap Fire', primary: '#f97316', secondary: '#ef4444', accent: '#fbbf24' },
    { name: 'Cyber Neon', primary: '#06b6d4', secondary: '#d946ef', accent: '#3b82f6' },
    { name: 'Emerald Bass', primary: '#10b981', secondary: '#ffffff', accent: '#34d399' },
    { name: 'Violet Dream', primary: '#a855f7', secondary: '#ec4899', accent: '#60a5fa' },
    { name: 'Monochrome Steel', primary: '#f8fafc', secondary: '#94a3b8', accent: '#38bdf8' }
  ];

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    onUpdateConfig((prev) => ({
      ...prev,
      bars: {
        ...prev.bars,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        accentColor: preset.accent
      },
      centerBadge: {
        ...prev.centerBadge,
        borderColor: preset.primary,
        glowColor: preset.primary
      }
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Visualizer Ring & Bars */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-rose-500" />
          Spectrum Bars & Ring Geometry
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Bar Count</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {config.bars.barCount}
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={200}
              step={4}
              value={config.bars.barCount}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, barCount: parseInt(e.target.value) }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Circle Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Visualizer Base Radius</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {config.bars.circleRadius}px
              </span>
            </div>
            <input
              type="range"
              min={70}
              max={240}
              step={5}
              value={config.bars.circleRadius}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, circleRadius: parseInt(e.target.value) }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Bar Width */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Bar Thickness</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {config.bars.barWidth}px
              </span>
            </div>
            <input
              type="range"
              min={1.5}
              max={10}
              step={0.5}
              value={config.bars.barWidth}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, barWidth: parseFloat(e.target.value) }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Glow Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Neon Glow Bloom</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {config.bars.glowStrength}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={2}
              value={config.bars.glowStrength}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, glowStrength: parseInt(e.target.value) }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <label className="flex items-center gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input
              type="checkbox"
              checked={config.bars.symmetric}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, symmetric: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-semibold text-slate-300">Symmetric Wings</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input
              type="checkbox"
              checked={config.bars.waveLines}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, waveLines: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-semibold text-slate-300">Side Waveforms</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input
              type="checkbox"
              checked={config.bars.innerBars}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, innerBars: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-semibold text-slate-300">Inner Spikes</span>
          </label>

          <div className="flex items-center gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-xs font-semibold text-slate-300">Cap:</span>
            <select
              value={config.bars.barCapStyle}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, barCapStyle: e.target.value as 'rounded' | 'flat' | 'diamond' }
                }))
              }
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-1.5 py-0.5"
            >
              <option value="rounded">Rounded</option>
              <option value="flat">Square</option>
              <option value="diamond">Diamond</option>
            </select>
          </div>
        </div>
      </div>

      {/* Color Palette Presets */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-sky-400" />
          Color Palette & Glow Accents
        </h3>

        {/* Quick presets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {colorPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyColorPreset(preset)}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 flex flex-col items-center gap-2 transition-all hover:scale-105"
            >
              <div className="flex items-center -space-x-1">
                <span
                  className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: preset.primary }}
                />
                <span
                  className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: preset.secondary }}
                />
                <span
                  className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: preset.accent }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 truncate w-full text-center">
                {preset.name}
              </span>
            </button>
          ))}
        </div>

        {/* Custom Color Pickers */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2.5 p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
            <input
              type="color"
              value={config.bars.primaryColor}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, primaryColor: e.target.value }
                }))
              }
              className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border-0"
            />
            <div className="text-xs">
              <p className="text-slate-400">Primary</p>
              <p className="font-mono text-white text-[11px] font-bold uppercase">{config.bars.primaryColor}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
            <input
              type="color"
              value={config.bars.secondaryColor}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, secondaryColor: e.target.value }
                }))
              }
              className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border-0"
            />
            <div className="text-xs">
              <p className="text-slate-400">Secondary</p>
              <p className="font-mono text-white text-[11px] font-bold uppercase">{config.bars.secondaryColor}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
            <input
              type="color"
              value={config.bars.accentColor}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  bars: { ...prev.bars, accentColor: e.target.value }
                }))
              }
              className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border-0"
            />
            <div className="text-xs">
              <p className="text-slate-400">Accent</p>
              <p className="font-mono text-white text-[11px] font-bold uppercase">{config.bars.accentColor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Badge / Logo */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-500" />
            Center Badge & Logo Overlay
          </h3>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.centerBadge.enabled}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  centerBadge: { ...prev.centerBadge, enabled: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            Enable Badge
          </label>
        </div>

        {config.centerBadge.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Badge Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Badge Center Text</label>
                <input
                  type="text"
                  value={config.centerBadge.badgeText}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      centerBadge: { ...prev.centerBadge, badgeText: e.target.value.toUpperCase() }
                    }))
                  }
                  placeholder="e.g. OUTLAWZ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold tracking-wider text-white focus:outline-none focus:border-rose-500 uppercase"
                />
              </div>

              {/* Badge Shape */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Badge Shape</label>
                <select
                  value={config.centerBadge.shape}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      centerBadge: { ...prev.centerBadge, shape: e.target.value as 'circle' | 'hexagon' | 'shield' }
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="circle">Circular Emblem</option>
                  <option value="hexagon">Hexagon Core</option>
                </select>
              </div>

              {/* Badge Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Badge Scale</span>
                  <span className="font-mono text-slate-400 font-bold tabular-nums">
                    {config.centerBadge.size}px
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={160}
                  step={5}
                  value={config.centerBadge.size}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      centerBadge: { ...prev.centerBadge, size: parseInt(e.target.value) }
                    }))
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Custom Logo Upload */}
            <div className="pt-2 flex items-center justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white">Custom Logo / Avatar Image</p>
                <p className="text-[11px] text-slate-400">
                  {hasCustomLogo ? 'Custom logo active in center ring' : 'Upload PNG or JPG to replace badge text'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onUploadLogo(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {hasCustomLogo && (
                  <button
                    onClick={onClearLogo}
                    className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg transition-colors"
                    title="Remove custom logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {hasCustomLogo ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background Media Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Image className="w-4 h-4 text-emerald-400" />
          Background Media & Reactive Zoom
        </h3>

        <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div>
            <p className="text-xs font-bold text-white">Background Visual</p>
            <p className="text-[11px] text-slate-400">
              {hasCustomBg
                ? 'Custom image/video loaded'
                : 'Using reference video background (or procedural atmospheric gradient)'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadBackground(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => bgInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Image or Video
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-1">
          {/* Blur */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Background Blur</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {config.background.blur}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={config.background.blur}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  background: { ...prev.background, blur: parseInt(e.target.value) }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Vignette */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Edge Vignette</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {(config.background.vignette * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.background.vignette}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  background: { ...prev.background, vignette: parseFloat(e.target.value) }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Bass Zoom */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Bass Zoom Impact</span>
              <span className="font-mono text-slate-400 font-bold tabular-nums">
                {config.background.bassZoom.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={1.35}
              step={0.02}
              value={config.background.bassZoom}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  background: { ...prev.background, bassZoom: parseFloat(e.target.value) }
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
