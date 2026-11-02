import React, { useState, useRef } from 'react';
import { VisualizerConfig, CustomOverlayItem, OverlayAnimation } from '../types/visualizer';
import {
  Film,
  Sparkles,
  Tv,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  Clock,
  Sliders,
  Move,
  Layers,
  Check,
  Eye,
  EyeOff,
  Palette,
  Smartphone
} from 'lucide-react';

interface OverlayControlsProps {
  config: VisualizerConfig;
  onUpdateConfig: (updater: (prev: VisualizerConfig) => VisualizerConfig) => void;
  playbackTime: number;
  duration: number;
}

export const OverlayControls: React.FC<OverlayControlsProps> = ({
  config,
  onUpdateConfig,
  playbackTime,
  duration
}) => {
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    config.customOverlays[0]?.id || null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const customOverlays = config.customOverlays || [];
  const selectedOverlay = customOverlays.find((o) => o.id === selectedOverlayId) || customOverlays[0];

  // Add new text overlay
  const handleAddTextOverlay = () => {
    const newId = `text_${Date.now()}`;
    const newOverlay: CustomOverlayItem = {
      id: newId,
      type: 'text',
      name: `Text Layer ${customOverlays.length + 1}`,
      enabled: true,
      text: 'NEW OVERLAY',
      fontFamily: 'Outfit',
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: 2,
      color: '#ffffff',
      glowColor: config.bars.primaryColor,
      glowBlur: 16,
      opacity: 1.0,
      x: 50,
      y: 50,
      scale: 1.0,
      rotation: 0,
      animation: 'beat_pulse',
      beatReactionStrength: 1.2,
      hasTiming: false,
      startTime: 0,
      endTime: duration,
      fadeDuration: 0.4
    };

    onUpdateConfig((prev) => ({
      ...prev,
      customOverlays: [...(prev.customOverlays || []), newOverlay]
    }));
    setSelectedOverlayId(newId);
  };

  // Add new graphic/logo overlay
  const handleGraphicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      const newId = `graphic_${Date.now()}`;

      const newOverlay: CustomOverlayItem = {
        id: newId,
        type: 'image',
        name: file.name.replace(/\.[^/.]+$/, '').slice(0, 18),
        enabled: true,
        imageUrl: url,
        opacity: 0.9,
        x: 50,
        y: 25,
        scale: 1.0,
        rotation: 0,
        glowColor: config.bars.primaryColor,
        glowBlur: 12,
        animation: 'beat_pulse',
        beatReactionStrength: 1.0,
        hasTiming: false,
        startTime: 0,
        endTime: duration,
        fadeDuration: 0.4
      };

      onUpdateConfig((prev) => ({
        ...prev,
        customOverlays: [...(prev.customOverlays || []), newOverlay]
      }));
      setSelectedOverlayId(newId);
    }
  };

  // Delete overlay
  const handleDeleteOverlay = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUpdateConfig((prev) => ({
      ...prev,
      customOverlays: prev.customOverlays.filter((o) => o.id !== id)
    }));
    if (selectedOverlayId === id) {
      const remaining = customOverlays.filter((o) => o.id !== id);
      setSelectedOverlayId(remaining[0]?.id || null);
    }
  };

  // Toggle enabled
  const handleToggleEnabled = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUpdateConfig((prev) => ({
      ...prev,
      customOverlays: prev.customOverlays.map((o) =>
        o.id === id ? { ...o, enabled: !o.enabled } : o
      )
    }));
  };

  // Update selected overlay properties
  const updateSelected = (updater: (prevItem: CustomOverlayItem) => CustomOverlayItem) => {
    if (!selectedOverlay) return;
    onUpdateConfig((prev) => ({
      ...prev,
      customOverlays: prev.customOverlays.map((o) =>
        o.id === selectedOverlay.id ? updater(o) : o
      )
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-rose-500" />
          Custom Graphic & Text Overlays Studio
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Create, import logos/watermarks, style typography, animate with the beat, and time appearances to the track.
        </p>
      </div>

      {/* Layer Stack / Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Overlay Layers ({customOverlays.length})
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddTextOverlay}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95"
            >
              <Type className="w-3.5 h-3.5" />
              Add Text Layer
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleGraphicUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Import Logo / Graphic
            </button>
          </div>
        </div>

        {/* Horizontal Layer Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {customOverlays.map((item) => {
            const isSelected = selectedOverlay?.id === item.id;
            const isVisibleNow =
              item.enabled && (!item.hasTiming || (playbackTime >= item.startTime && playbackTime <= item.endTime));

            return (
              <div
                key={item.id}
                onClick={() => setSelectedOverlayId(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500 text-white ring-1 ring-rose-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => handleToggleEnabled(item.id, e)}
                  className="text-slate-400 hover:text-white"
                >
                  {item.enabled ? (
                    <Eye className={`w-3.5 h-3.5 ${isVisibleNow ? 'text-emerald-400' : 'text-slate-500'}`} />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  {item.type === 'text' ? <Type className="w-3 h-3 text-rose-400" /> : <ImageIcon className="w-3 h-3 text-sky-400" />}
                  <span className="text-xs font-bold">{item.name}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteOverlay(item.id, e)}
                  className="text-slate-500 hover:text-rose-400 ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Overlay Inspector & Customization Card */}
      {selectedOverlay && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                Editing: {selectedOverlay.name}
              </span>
              <span className="text-xs font-mono text-slate-500">({selectedOverlay.type})</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">
                X: {selectedOverlay.x}% · Y: {selectedOverlay.y}%
              </span>
            </div>
          </div>

          {/* Text Content & Typography (if text) */}
          {selectedOverlay.type === 'text' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Text Content</label>
                <input
                  type="text"
                  value={selectedOverlay.text || ''}
                  onChange={(e) => updateSelected((o) => ({ ...o, text: e.target.value }))}
                  placeholder="e.g. BASS DROP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Font Family */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Font Family</label>
                  <select
                    value={selectedOverlay.fontFamily || 'Outfit'}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...o,
                        fontFamily: e.target.value as any
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Outfit">Outfit (Bold Geometric)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="JetBrains Mono">JetBrains Mono (Coding/HUD)</option>
                    <option value="Cinzel">Cinzel (Cinematic Serif)</option>
                    <option value="Anton">Anton (Heavy Condensed)</option>
                  </select>
                </div>

                {/* Font Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Size</span>
                    <span className="font-mono text-slate-400 font-bold tabular-nums">
                      {selectedOverlay.fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={100}
                    step={2}
                    value={selectedOverlay.fontSize || 36}
                    onChange={(e) =>
                      updateSelected((o) => ({ ...o, fontSize: parseInt(e.target.value) }))
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Tracking / Spacing</span>
                    <span className="font-mono text-slate-400 font-bold tabular-nums">
                      {selectedOverlay.letterSpacing || 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={1}
                    value={selectedOverlay.letterSpacing || 0}
                    onChange={(e) =>
                      updateSelected((o) => ({ ...o, letterSpacing: parseInt(e.target.value) }))
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Colors: Fill, Glow, Stroke */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={selectedOverlay.color || '#ffffff'}
                    onChange={(e) => updateSelected((o) => ({ ...o, color: e.target.value }))}
                    className="w-6 h-6 rounded bg-transparent cursor-pointer border-0"
                  />
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Fill Color</span>
                    <span className="font-mono text-white text-[11px] uppercase font-bold">{selectedOverlay.color}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={selectedOverlay.glowColor || '#ff2a55'}
                    onChange={(e) => updateSelected((o) => ({ ...o, glowColor: e.target.value }))}
                    className="w-6 h-6 rounded bg-transparent cursor-pointer border-0"
                  />
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Glow Color</span>
                    <span className="font-mono text-white text-[11px] uppercase font-bold">{selectedOverlay.glowColor}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={selectedOverlay.strokeColor || '#000000'}
                    onChange={(e) => updateSelected((o) => ({ ...o, strokeColor: e.target.value }))}
                    className="w-6 h-6 rounded bg-transparent cursor-pointer border-0"
                  />
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Outline Color</span>
                    <span className="font-mono text-white text-[11px] uppercase font-bold">{selectedOverlay.strokeColor || '#000000'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scale & Opacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Overall Scale</span>
                <span className="font-mono text-slate-400 font-bold tabular-nums">
                  {(selectedOverlay.scale || 1.0).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.05}
                value={selectedOverlay.scale || 1.0}
                onChange={(e) =>
                  updateSelected((o) => ({ ...o, scale: parseFloat(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Rotation Angle</span>
                <span className="font-mono text-slate-400 font-bold tabular-nums">
                  {selectedOverlay.rotation || 0}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={2}
                value={selectedOverlay.rotation || 0}
                onChange={(e) =>
                  updateSelected((o) => ({ ...o, rotation: parseInt(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Opacity</span>
                <span className="font-mono text-slate-400 font-bold tabular-nums">
                  {((selectedOverlay.opacity ?? 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={selectedOverlay.opacity ?? 1.0}
                onChange={(e) =>
                  updateSelected((o) => ({ ...o, opacity: parseFloat(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Positioning & Alignment Helpers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-rose-400" />
                Position (Draggable on Canvas)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSelected((o) => ({ ...o, x: 50 }))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded"
                >
                  Center X
                </button>
                <button
                  type="button"
                  onClick={() => updateSelected((o) => ({ ...o, y: 50 }))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded"
                >
                  Center Y
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-400">Horizontal X ({selectedOverlay.x}%)</span>
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={1}
                  value={selectedOverlay.x}
                  onChange={(e) =>
                    updateSelected((o) => ({ ...o, x: parseInt(e.target.value) }))
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-400">Vertical Y ({selectedOverlay.y}%)</span>
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={1}
                  value={selectedOverlay.y}
                  onChange={(e) =>
                    updateSelected((o) => ({ ...o, y: parseInt(e.target.value) }))
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Animation Settings */}
          <div className="space-y-3 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Beat Reactive Animation
              </label>

              <span className="text-xs text-slate-400 capitalize">
                Mode: {selectedOverlay.animation.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'beat_pulse', label: 'Beat Pulse' },
                  { id: 'glitch_shake', label: 'Glitch Shake' },
                  { id: 'fade', label: 'Breathing' },
                  { id: 'slide_left', label: 'Slide In' },
                  { id: 'rotate_slow', label: 'Slow Spin' },
                  { id: 'strobe', label: 'EDM Strobe' },
                  { id: 'none', label: 'Static' }
                ] as { id: OverlayAnimation; label: string }[]
              ).map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => updateSelected((o) => ({ ...o, animation: anim.id }))}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedOverlay.animation === anim.id
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400 ring-1 ring-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>

            {selectedOverlay.animation !== 'none' && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Beat Kick Impact Strength</span>
                  <span className="font-mono text-slate-400 font-bold tabular-nums">
                    {(selectedOverlay.beatReactionStrength || 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.1}
                  value={selectedOverlay.beatReactionStrength || 1.0}
                  onChange={(e) =>
                    updateSelected((o) => ({
                      ...o,
                      beatReactionStrength: parseFloat(e.target.value)
                    }))
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Timing (Appear and Disappear with Audio/Video) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Timing (Appear & Disappear with Audio)
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOverlay.hasTiming}
                  onChange={(e) =>
                    updateSelected((o) => ({ ...o, hasTiming: e.target.checked }))
                  }
                  className="rounded text-rose-500 focus:ring-0"
                />
                Enable Time Window
              </label>
            </div>

            {selectedOverlay.hasTiming && (
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Start Time</span>
                      <span className="font-mono text-rose-400 font-bold tabular-nums">
                        {selectedOverlay.startTime.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, duration)}
                      step={0.1}
                      value={selectedOverlay.startTime}
                      onChange={(e) =>
                        updateSelected((o) => ({
                          ...o,
                          startTime: Math.min(o.endTime - 0.5, parseFloat(e.target.value))
                        }))
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSelected((o) => ({
                          ...o,
                          startTime: parseFloat(playbackTime.toFixed(1))
                        }))
                      }
                      className="text-[11px] font-semibold text-sky-400 hover:text-sky-300"
                    >
                      Set to Current Playhead ({playbackTime.toFixed(1)}s)
                    </button>
                  </div>

                  {/* End Time */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">End Time</span>
                      <span className="font-mono text-rose-400 font-bold tabular-nums">
                        {selectedOverlay.endTime.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, duration)}
                      step={0.1}
                      value={selectedOverlay.endTime}
                      onChange={(e) =>
                        updateSelected((o) => ({
                          ...o,
                          endTime: Math.max(o.startTime + 0.5, parseFloat(e.target.value))
                        }))
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSelected((o) => ({
                          ...o,
                          endTime: parseFloat(playbackTime.toFixed(1))
                        }))
                      }
                      className="text-[11px] font-semibold text-sky-400 hover:text-sky-300"
                    >
                      Set to Current Playhead ({playbackTime.toFixed(1)}s)
                    </button>
                  </div>
                </div>

                {/* Fade Transition */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Fade In / Out Duration</span>
                    <span className="font-mono text-slate-400 font-bold tabular-nums">
                      {(selectedOverlay.fadeDuration || 0.4).toFixed(2)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    value={selectedOverlay.fadeDuration || 0.4}
                    onChange={(e) =>
                      updateSelected((o) => ({
                        ...o,
                        fadeDuration: parseFloat(e.target.value)
                      }))
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Built-in Cinematic Overlays (VHS, Particles, Light Leaks, Mobile Guides) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Tv className="w-4 h-4 text-sky-400" />
          Camera HUD, Grain & Social Safe Zones
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex items-center gap-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input
              type="checkbox"
              checked={config.overlays.vhsEffect}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  overlays: { ...prev.overlays, vhsEffect: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-bold text-white">VHS Cam HUD</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input
              type="checkbox"
              checked={config.overlays.filmGrain}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  overlays: { ...prev.overlays, filmGrain: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-bold text-white">Film Grain</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input
              type="checkbox"
              checked={config.overlays.lightLeak}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  overlays: { ...prev.overlays, lightLeak: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-bold text-white">Optical Flare</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <input
              type="checkbox"
              checked={config.overlays.mobileSafeGuides}
              onChange={(e) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  overlays: { ...prev.overlays, mobileSafeGuides: e.target.checked }
                }))
              }
              className="rounded text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-bold text-white">Reels Safe Zone</span>
          </label>
        </div>

        {/* Floating Particles & Shape Presets */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Floating Particles & Avee Shapes
            </span>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.overlays.particles}
                onChange={(e) =>
                  onUpdateConfig((prev) => ({
                    ...prev,
                    overlays: { ...prev.overlays, particles: e.target.checked }
                  }))
                }
                className="rounded text-rose-500 focus:ring-0"
              />
              Enable Particles
            </label>
          </div>

          {config.overlays.particles && (
            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              {/* Particle Shape Selector */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Particle Geometry / Avee Shape
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'circle', label: 'Classic Spark', desc: 'Dots' },
                      { id: 'heart', label: 'Avee Hearts', desc: 'Falling hearts' },
                      { id: 'cube', label: '3D Cubes', desc: 'Warp cubes' },
                      { id: 'star', label: 'Stars', desc: '4-point stars' }
                    ] as const
                  ).map((shape) => {
                    const isSelected = (config.overlays.particleShape || 'circle') === shape.id;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() =>
                          onUpdateConfig((prev) => ({
                            ...prev,
                            overlays: { ...prev.overlays, particleShape: shape.id }
                          }))
                        }
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs block">{shape.label}</span>
                        <span className="text-[10px] text-slate-500 block">{shape.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Count and Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Particle Count</span>
                    <span className="font-mono text-white font-bold">{config.overlays.particleCount}</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={250}
                    step={10}
                    value={config.overlays.particleCount}
                    onChange={(e) =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        overlays: { ...prev.overlays, particleCount: parseInt(e.target.value) }
                      }))
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.overlays.particleBurstOnKick}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          overlays: { ...prev.overlays, particleBurstOnKick: e.target.checked }
                        }))
                      }
                      className="rounded text-rose-500 focus:ring-0"
                    />
                    Kick Drum Burst Shockwave
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.overlays.particleColor}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          overlays: { ...prev.overlays, particleColor: e.target.value }
                        }))
                      }
                      className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
