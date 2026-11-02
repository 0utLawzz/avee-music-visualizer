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
      className="relative flex-1 flex flex-col items-center justify-between bg-black overflow-hidden select-none w-full h-full"
    >
      {/* Technical Viewport Header */}
      <div className="w-full px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 font-space text-[10px] text-[rgba(240,240,240,0.6)] z-10 border-b border-[rgba(240,240,240,0.12)] bg-[#141517]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[rgba(240,240,240,0.9)] tracking-widest font-bold">
              RATIO {config.aspectRatio} // RESOLUTION {currentRes.toUpperCase()}
            </span>
          </div>

          <span className="text-[rgba(240,240,240,0.2)]">|</span>

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
            <span className="text-[#00ff66] font-bold tracking-wider">LIVE_STREAM_OK</span>
          </div>

          {/* Social Media Aspect Ratio Presets in Technical Monospace */}
          <div className="flex items-center bg-[#0b0c0d] border border-[rgba(240,240,240,0.12)] p-0.5 ml-2">
            {(['16:9', '9:16', '1:1', '4:5'] as AspectRatio[]).map((aspect) => (
              <button
                key={aspect}
                onClick={() => handleSelectAspect(aspect)}
                className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  config.aspectRatio === aspect
                    ? 'bg-[#ff3e00] text-black font-extrabold'
                    : 'text-[rgba(240,240,240,0.5)] hover:text-white'
                }`}
              >
                {aspect}
              </button>
            ))}
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

          {/* Quick Running Edge Glow Chaser Toggle */}
          <button
            onClick={() =>
              onUpdateConfig((p) => ({
                ...p,
                runningEdgeLight: {
                  ...(p.runningEdgeLight || {
                    enabled: true,
                    color: p.bars.primaryColor || '#ff2a55',
                    secondaryColor: '#ffffff',
                    speed: 0.85,
                    thickness: 4.5,
                    length: 0.18,
                    glowBlur: 24,
                    margin: 24,
                    cornerRadius: 22,
                    beamCount: 2,
                    beatBoost: true,
                    cornerBrackets: true
                  }),
                  enabled: !(p.runningEdgeLight?.enabled ?? true)
                }
              }))
            }
            title="Toggle Running Edge Glow Light over corner frame edges"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all ${
              (config.runningEdgeLight?.enabled ?? true)
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Edge Chaser</span>
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
        className="canvas-area relative flex-1 w-full flex items-center justify-center p-6 lg:p-10 min-h-0 overflow-hidden"
      >
        <div
          className={`preview-box relative overflow-hidden transition-all duration-200 bg-[#050505] ${
            isDragOver ? 'ring-2 ring-[#ff3e00]' : ''
          } ${getWindowConstraint()}`}
          style={{
            aspectRatio: cssAspect,
            outline: '1px solid var(--accent)',
            outlineOffset: '8px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
          }}
        >
          {/* Variation 5 RAW_VIEW Badge */}
          <div className="absolute top-3 left-3 font-space text-[9px] text-[#ff3e00] border border-[#ff3e00] px-1.5 py-0.5 bg-black/85 backdrop-blur-sm pointer-events-none z-20 tracking-wider">
            RAW_VIEW
          </div>

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
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white z-30">
              <Upload className="w-12 h-12 text-[#ff3e00] animate-bounce" />
              <p className="font-space text-sm font-bold text-[#f0f0f0]">
                DROP AUDIO / MEDIA TO LOAD
              </p>
            </div>
          )}

          {/* Low-res performance tag if active */}
          {currentRes === '480p' && (
            <div className="absolute bottom-3 left-3 bg-black/85 border border-amber-500/40 text-amber-300 text-[9px] font-space font-bold px-2 py-0.5 backdrop-blur-md pointer-events-none z-20">
              480P_ANTI_LAG_MODE
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
