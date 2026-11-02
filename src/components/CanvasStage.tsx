import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Move,
  Upload,
  Volume2,
  VolumeX,
  Smartphone,
  Tv,
  Square,
  Sparkles,
  Crop,
  Gauge,
  Monitor,
  Zap,
  Minimize,
  SlidersHorizontal
} from 'lucide-react';
import {
  VisualizerConfig,
  AspectRatio,
  BeatDetectionState,
  FramingMode,
  TransitionEffect
} from '../types/visualizer';
import { VisualizerRenderer } from '../services/visualizerRenderer';

interface CanvasStageProps {
  config: VisualizerConfig;
  onUpdateConfig: (updater: (prev: VisualizerConfig) => VisualizerConfig) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackTime: number;
  duration: number;
  onSeek: (time: number) => void;
  beatState: BeatDetectionState;
  renderer: VisualizerRenderer;
  freqData: Uint8Array;
  timeData: Uint8Array;
  bgMedia: HTMLImageElement | HTMLVideoElement | null;
  logoImage: HTMLImageElement | null;
  onFileDrop: (file: File) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onTriggerTransition?: () => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  config,
  onUpdateConfig,
  isPlaying,
  onTogglePlay,
  playbackTime,
  duration,
  onSeek,
  beatState,
  renderer,
  freqData,
  timeData,
  bgMedia,
  logoImage,
  onFileDrop,
  canvasRef,
  onTriggerTransition
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPerfMenu, setShowPerfMenu] = useState(false);

  // Aspect ratio pixel dimensions scaled by preview resolution
  // 480p mode renders ~5x fewer pixels, eliminating CPU/GPU freeze on weaker laptops!
  const getCanvasDimensions = (
    aspect: AspectRatio,
    res: '1080p' | '720p' | '480p' = '720p'
  ) => {
    let scale = 0.6667; // 720p default
    if (res === '1080p') scale = 1.0;
    else if (res === '480p') scale = 0.4444; // 853x480 for 16:9

    switch (aspect) {
      case '9:16':
        return {
          w: Math.round(1080 * scale),
          h: Math.round(1920 * scale),
          cssAspect: '9/16'
        };
      case '1:1':
        return {
          w: Math.round(1080 * scale),
          h: Math.round(1080 * scale),
          cssAspect: '1/1'
        };
      case '4:5':
        return {
          w: Math.round(1080 * scale),
          h: Math.round(1350 * scale),
          cssAspect: '4/5'
        };
      case '16:9':
      default:
        return {
          w: Math.round(1920 * scale),
          h: Math.round(1080 * scale),
          cssAspect: '16/9'
        };
    }
  };

  const currentRes = config.preview?.resolution || '720p';
  const { w: canvasW, h: canvasH, cssAspect } = getCanvasDimensions(
    config.aspectRatio,
    currentRes
  );

  // Switch aspect ratio with intelligent framing
  const handleSelectAspect = (newAspect: AspectRatio) => {
    // Trigger transition if enabled
    if (canvasRef.current && config.transitions?.enabled) {
      renderer.triggerTransition(
        canvasRef.current,
        config.transitions.effect,
        config.transitions.duration
      );
    }

    onUpdateConfig((prev) => {
      let newVizPos = prev.layout.visualizerPos;
      let newScale = prev.layout.scale;
      let newTitlePos = prev.layout.titlePos;

      if (newAspect === '9:16') {
        newVizPos = { x: 50, y: 46 };
        newTitlePos = { x: 50, y: 84 };
      } else if (newAspect === '1:1') {
        newVizPos = { x: 50, y: 50 };
        newTitlePos = { x: 50, y: 86 };
      } else if (newAspect === '16:9') {
        newVizPos = { x: 50, y: 50 };
        newTitlePos = { x: 12, y: 88 };
      }

      return {
        ...prev,
        aspectRatio: newAspect,
        layout: {
          ...prev.layout,
          visualizerPos: newVizPos,
          titlePos: newTitlePos,
          scale: newScale
        }
      };
    });
  };

  // Render animation frame loop with optional 30 FPS throttle
  useEffect(() => {
    let animId: number;
    let lastRenderTime = performance.now();
    const fpsCap = config.preview?.fpsCap || 60;
    const frameInterval = fpsCap === 30 ? 1000 / 30 : 1000 / 60;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (now: number) => {
      const elapsed = now - lastRenderTime;
      if (elapsed >= frameInterval - 3) {
        lastRenderTime = now;
        renderer.render(
          ctx,
          canvasW,
          canvasH,
          config,
          freqData,
          timeData,
          beatState,
          bgMedia,
          logoImage,
          playbackTime,
          draggedElement
        );
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    canvasRef,
    canvasW,
    canvasH,
    config,
    freqData,
    timeData,
    beatState,
    bgMedia,
    logoImage,
    playbackTime,
    draggedElement,
    renderer
  ]);

  // Handle Drag & Drop of local audio/image/video files onto stage
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
    }
  };

  // On-canvas interactive layout dragging for visualizer, title, and ANY custom overlay
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isLayoutMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    // Check custom overlays first
    for (const item of config.customOverlays) {
      if (!item.enabled) continue;
      const d = Math.hypot(clickXPercent - item.x, clickYPercent - item.y);
      if (d < 14) {
        setDraggedElement(item.id);
        return;
      }
    }

    // Check distance to title
    const dTitle = Math.hypot(
      clickXPercent - config.layout.titlePos.x,
      clickYPercent - config.layout.titlePos.y
    );
    if (dTitle < 12) {
      setDraggedElement('title');
      return;
    }

    // Check distance to visualizer
    const dViz = Math.hypot(
      clickXPercent - config.layout.visualizerPos.x,
      clickYPercent - config.layout.visualizerPos.y
    );
    if (dViz < 24) {
      setDraggedElement('visualizer');
      return;
    }
  };

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isLayoutMode || !draggedElement) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const xPercent = Math.max(
        5,
        Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)
      );
      const yPercent = Math.max(
        5,
        Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)
      );

      onUpdateConfig((prev) => {
        if (draggedElement === 'visualizer') {
          return {
            ...prev,
            layout: {
              ...prev.layout,
              visualizerPos: {
                x: Math.round(xPercent),
                y: Math.round(yPercent)
              }
            }
          };
        } else if (draggedElement === 'title') {
          return {
            ...prev,
            layout: {
              ...prev.layout,
              titlePos: { x: Math.round(xPercent), y: Math.round(yPercent) }
            }
          };
        } else {
          return {
            ...prev,
            customOverlays: prev.customOverlays.map((o) =>
              o.id === draggedElement
                ? { ...o, x: Math.round(xPercent), y: Math.round(yPercent) }
                : o
            )
          };
        }
      });
    },
    [isLayoutMode, draggedElement, canvasRef, onUpdateConfig]
  );

  const handleCanvasMouseUp = () => {
    setDraggedElement(null);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Test transition effect manually
  const handleTestTransition = () => {
    if (canvasRef.current) {
      renderer.triggerTransition(
        canvasRef.current,
        config.transitions?.effect || 'blur_dissolve',
        config.transitions?.duration || 0.6
      );
    }
  };

  // Window size CSS class
  const windowSize = config.preview?.windowSize || 'full';
  const getWindowConstraint = () => {
    switch (windowSize) {
      case 'compact':
        return 'max-w-[420px] max-h-[290px]';
      case 'medium':
        return 'max-w-[680px] max-h-[460px]';
      case 'full':
      default:
        return 'max-w-full max-h-full';
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col items-center justify-between bg-slate-950 overflow-hidden select-none"
    >
      {/* Top Floating Controls Bar */}
      <div className="w-full px-5 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-400 z-10 border-b border-slate-900/60 bg-slate-950/70 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Social Media Aspect Ratio Presets */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 shadow-sm">
            <button
              onClick={() => handleSelectAspect('16:9')}
              title="YouTube / Landscape (16:9)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                config.aspectRatio === '16:9'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              16:9
            </button>

            <button
              onClick={() => handleSelectAspect('9:16')}
              title="TikTok / Reels / Shorts (9:16)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                config.aspectRatio === '9:16'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              9:16
            </button>

            <button
              onClick={() => handleSelectAspect('1:1')}
              title="Instagram Feed Square (1:1)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                config.aspectRatio === '1:1'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              1:1
            </button>
          </div>

          {/* Social Framing Mode */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 text-xs">
            <Crop className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={config.framingMode || 'fit_blur'}
              onChange={(e) =>
                onUpdateConfig((p) => ({
                  ...p,
                  framingMode: e.target.value as FramingMode
                }))
              }
              className="bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-200 rounded px-1.5 py-0.5"
            >
              <option value="fit_blur">Fit & Blur Wings</option>
              <option value="fill_crop">Fill & Zoom</option>
              <option value="contain_letterbox">Contain</option>
            </select>
          </div>

          {/* Drag Mode Toggle */}
          <button
            onClick={() => setIsLayoutMode(!isLayoutMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all ${
              isLayoutMode
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Move className="w-3 h-3" />
            <span>{isLayoutMode ? 'Drag: ON' : 'Drag Layout'}</span>
          </button>
        </div>

        {/* Right Controls: Low-Res Preview & Transition Engine */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Performance / Low-Res Preview Controls Button */}
          <div className="relative">
            <button
              onClick={() => setShowPerfMenu(!showPerfMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-colors ${
                currentRes === '480p' || windowSize !== 'full'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Preview resolution and window size (prevents PC freezing)"
            >
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentRes}</span>
              <span className="text-slate-500">·</span>
              <span className="capitalize">{windowSize}</span>
            </button>

            {/* Performance Menu Dropdown */}
            {showPerfMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-amber-400" />
                    Preview Performance (Anti-Lag)
                  </span>
                  <button
                    onClick={() => setShowPerfMenu(false)}
                    className="text-slate-500 hover:text-white text-xs"
                  >
                    ×
                  </button>
                </div>

                {/* Resolution Selector */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Preview Resolution (Lower = Smoother):
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['480p', '720p', '1080p'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() =>
                          onUpdateConfig((p) => ({
                            ...p,
                            preview: { ...p.preview, resolution: r }
                          }))
                        }
                        className={`py-1 rounded-lg text-xs font-bold border transition-colors ${
                          currentRes === r
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {r} {r === '480p' ? '⚡' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    480p reduces GPU load by 75% so your PC runs cool without
                    hanging.
                  </p>
                </div>

                {/* Window Size Selector */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Preview Window Scale:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['full', 'medium', 'compact'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          onUpdateConfig((p) => ({
                            ...p,
                            preview: { ...p.preview, windowSize: s }
                          }))
                        }
                        className={`py-1 rounded-lg text-xs font-bold border capitalize transition-colors ${
                          windowSize === s
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 30 FPS Cap Toggle */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Cap Preview to 30 FPS:
                  </span>
                  <button
                    onClick={() =>
                      onUpdateConfig((p) => ({
                        ...p,
                        preview: {
                          ...p.preview,
                          fpsCap: p.preview.fpsCap === 30 ? 60 : 30
                        }
                      }))
                    }
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                      config.preview.fpsCap === 30
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {config.preview.fpsCap === 30 ? '30 FPS (Eco)' : '60 FPS'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Transition Trigger & Style */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <select
              value={config.transitions?.effect || 'blur_dissolve'}
              onChange={(e) =>
                onUpdateConfig((p) => ({
                  ...p,
                  transitions: {
                    ...p.transitions,
                    effect: e.target.value as TransitionEffect
                  }
                }))
              }
              className="bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-200 rounded px-1.5 py-0.5"
            >
              <option value="blur_dissolve">Blur Dissolve</option>
              <option value="crossfade">Crossfade</option>
              <option value="wipe_left">Wipe Left</option>
              <option value="wipe_right">Wipe Right</option>
              <option value="radial_iris">Radial Iris</option>
              <option value="glitch_cut">Glitch Cut</option>
              <option value="none">No Transition</option>
            </select>

            <button
              onClick={handleTestTransition}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 ml-1"
              title="Test transition effect"
            >
              Test
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Center Canvas Viewport */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative flex-1 w-full flex items-center justify-center p-3 min-h-0 overflow-hidden"
      >
        <div
          className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 border ${
            isDragOver
              ? 'ring-4 ring-rose-500 ring-offset-4 ring-offset-slate-950'
              : 'border-slate-800/80'
          } ${getWindowConstraint()}`}
          style={{ aspectRatio: cssAspect }}
        >
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`w-full h-full block object-contain ${
              isLayoutMode
                ? 'cursor-grab active:cursor-grabbing'
                : 'cursor-default'
            }`}
          />

          {/* Drag Overlay Helper */}
          {isDragOver && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
              <Upload className="w-12 h-12 text-rose-500 animate-bounce" />
              <p className="text-base font-bold">
                Drop Any Song, Video, Image or Logo Here
              </p>
            </div>
          )}

          {/* Low-res performance tag if active */}
          {currentRes === '480p' && (
            <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded backdrop-blur-md pointer-events-none">
              480p Anti-Lag Mode
            </div>
          )}
        </div>
      </div>

      {/* Bottom Timeline & Transport Controls */}
      <div className="w-full max-w-4xl px-5 pb-3 pt-1 z-10">
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-md flex flex-col gap-1.5">
          {/* Scrubber Progress Bar */}
          <div className="flex items-center gap-3 w-full">
            <span className="font-mono text-xs text-slate-400 tabular-nums w-12 text-right">
              {formatTime(playbackTime)}
            </span>

            <div className="relative flex-1 h-2.5 bg-slate-800 rounded-full cursor-pointer group flex items-center">
              {(config.beatDetection.manualBeats || []).map((b) => {
                const pct = (b.time / Math.max(1, duration)) * 100;
                return (
                  <div
                    key={b.id}
                    className="absolute top-0 bottom-0 w-1 bg-amber-400/80 rounded-full z-0 pointer-events-none"
                    style={{ left: `${pct}%` }}
                  />
                );
              })}

              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                step={0.05}
                value={playbackTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full relative"
                style={{
                  width: `${Math.min(
                    100,
                    (playbackTime / Math.max(1, duration)) * 100
                  )}%`
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </div>

            <span className="font-mono text-xs text-slate-400 tabular-nums w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Transport Row */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlay}
                className="w-8 h-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 active:scale-90 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                )}
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <div className="hidden sm:flex flex-col ml-1">
                <span className="text-xs font-bold text-white truncate max-w-[190px]">
                  {config.audio.trackTitle}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[190px]">
                  {config.audio.artistName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 hidden md:inline">Aspect:</span>
              <span className="px-2 py-0.5 bg-slate-800 text-rose-400 font-bold rounded text-xs uppercase">
                {config.aspectRatio}
              </span>

              <span className="text-slate-400 ml-1 hidden md:inline">
                Preset:
              </span>
              <span className="px-2 py-0.5 bg-slate-800 text-sky-400 font-bold rounded text-xs uppercase">
                {config.template.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
