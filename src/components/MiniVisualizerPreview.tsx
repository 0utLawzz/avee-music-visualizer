import React, { useRef, useEffect, useState, useMemo } from 'react';
import { AudioClipSegment, VisualizerConfig, BeatDetectionState } from '../types/visualizer';
import { VisualizerRenderer } from '../services/visualizerRenderer';
import { AudioEngine } from '../services/audioEngine';
import { TEMPLATE_CONFIGS } from '../constants/presets';
import { formatLongTime } from '../constants/exportFormats';

interface MiniVisualizerPreviewProps {
  clip: AudioClipSegment | null;
  baseConfig: VisualizerConfig;
  audioEngine: AudioEngine;
  playbackTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  bgMedia: HTMLImageElement | HTMLVideoElement | null;
  logoImage: HTMLImageElement | null;
}

export const MiniVisualizerPreview: React.FC<MiniVisualizerPreviewProps> = ({
  clip,
  baseConfig,
  audioEngine,
  playbackTime,
  isPlaying,
  onTogglePlay,
  bgMedia,
  logoImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderer = useMemo(() => new VisualizerRenderer(), []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [beatState, setBeatState] = useState<BeatDetectionState>({
    isBeat: false,
    beatIntensity: 0,
    bassEnergy: 0,
    midEnergy: 0,
    highEnergy: 0,
    pulseDecay: 0,
    bpmEstimate: 128,
    isManualHit: false
  });

  // Effective visualizer config adapted to the previewed clip's template and aspect ratio
  const previewConfig = useMemo<VisualizerConfig>(() => {
    if (!clip) return baseConfig;
    const tplConfig = TEMPLATE_CONFIGS[clip.template];
    return {
      ...baseConfig,
      template: clip.template,
      aspectRatio: clip.aspectRatio,
      fps: (clip.fps === 24 ? 30 : clip.fps) as 30 | 60,
      bars: tplConfig?.bars ? { ...baseConfig.bars, ...(tplConfig.bars as any) } : baseConfig.bars,
      centerBadge: tplConfig?.centerBadge ? { ...baseConfig.centerBadge, ...(tplConfig.centerBadge as any) } : baseConfig.centerBadge,
      background: tplConfig?.background ? { ...baseConfig.background, ...(tplConfig.background as any) } : baseConfig.background,
      overlays: tplConfig?.overlays ? { ...baseConfig.overlays, ...(tplConfig.overlays as any) } : baseConfig.overlays,
      beatDetection: tplConfig?.beatDetection ? { ...baseConfig.beatDetection, ...(tplConfig.beatDetection as any) } : baseConfig.beatDetection
    };
  }, [clip, baseConfig]);

  // Dimension aspect ratio calculation
  const canvasDimensions = useMemo(() => {
    const ratio = previewConfig.aspectRatio;
    switch (ratio) {
      case '9:16':
        return { width: 720, height: 1280, displayRatio: 'aspect-[9/16]' };
      case '1:1':
        return { width: 960, height: 960, displayRatio: 'aspect-square' };
      case '4:5':
        return { width: 864, height: 1080, displayRatio: 'aspect-[4/5]' };
      case '16:9':
      default:
        return { width: 1280, height: 720, displayRatio: 'aspect-video' };
    }
  }, [previewConfig.aspectRatio]);

  // Render loop for mini visualizer
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Extract frequency and time data
      const { freqData, timeData, beatState: newBeat } = audioEngine.analyze(
        previewConfig.beatDetection.sensitivity,
        previewConfig.beatDetection.bassBoost,
        previewConfig.beatDetection.smoothing,
        playbackTime,
        previewConfig.beatDetection.manualBeats || [],
        previewConfig.beatDetection.syncMode || 'hybrid',
        previewConfig.beatDetection.nudgeMs || 0,
        previewConfig.beatDetection.subBassThreshold || 0.15,
        previewConfig.beatDetection.decaySpeed || 0.88
      );

      setBeatState(newBeat);

      // Render onto mini canvas
      renderer.render(
        ctx,
        canvas.width,
        canvas.height,
        previewConfig,
        freqData,
        timeData,
        newBeat,
        bgMedia,
        logoImage,
        playbackTime
      );

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [renderer, audioEngine, previewConfig, playbackTime, bgMedia, logoImage]);

  return (
    <div className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(240,240,240,0.08)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-space text-[10px] bg-[#00f0ff] text-black font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
              MINI-PREVIEW
            </span>
            <h3 className="font-syne text-sm font-bold text-white tracking-tight">
              LIVE TEMPLATE REACTION
            </h3>
          </div>
          <p className="font-space text-[11px] text-[rgba(240,240,240,0.5)] mt-0.5 truncate">
            {clip ? clip.name : 'Current Playhead Audio'} • {previewConfig.template} ({previewConfig.aspectRatio})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Beat Pulse Dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full transition-transform duration-75 ${
              beatState.isBeat
                ? 'bg-[#ff3e00] scale-125 shadow-md shadow-[#ff3e00]'
                : 'bg-white/20 scale-100'
            }`}
            title="Real-time Beat Kick Pulse"
          />

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-space text-[10px] text-white/50 hover:text-white px-2 py-1 border border-white/10 hover:border-white/30 transition-colors"
            title={isExpanded ? 'Shrink preview' : 'Expand preview'}
          >
            {isExpanded ? 'COMPACT' : 'EXPAND'}
          </button>
        </div>
      </div>

      {/* Canvas Viewport Frame */}
      <div className="mt-3 flex-1 flex items-center justify-center bg-black border border-[rgba(240,240,240,0.15)] relative overflow-hidden group select-none min-h-[200px]">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none" />

        {/* Mini Canvas */}
        <div className={`relative max-h-full max-w-full ${canvasDimensions.displayRatio} flex items-center justify-center`}>
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            className="w-full h-full object-contain shadow-2xl block"
          />

          {/* Hover Play/Pause Overlay */}
          <div
            onClick={onTogglePlay}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#ff3e00] text-black font-extrabold flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
              {isPlaying ? (
                <span className="text-sm font-black">❚❚</span>
              ) : (
                <span className="text-base font-black ml-0.5">▶</span>
              )}
            </div>
          </div>
        </div>

        {/* Live HUD Badges on bottom corners */}
        <div className="absolute bottom-2 left-2 pointer-events-none flex items-center gap-1.5 font-space text-[9px] bg-black/75 backdrop-blur-sm px-2 py-1 border border-white/10 text-white/80">
          <span className="text-[#00f0ff] font-bold">{previewConfig.aspectRatio}</span>
          <span>•</span>
          <span className="text-white font-bold">{previewConfig.template}</span>
          <span>•</span>
          <span>{clip?.fps || 60} FPS</span>
        </div>

        <div className="absolute bottom-2 right-2 pointer-events-none font-space text-[9px] bg-black/75 backdrop-blur-sm px-2 py-1 border border-white/10 text-white/80 tabular-nums">
          {formatLongTime(playbackTime, true)}
        </div>
      </div>

      {/* Info Tagline */}
      <div className="mt-2.5 flex items-center justify-between font-space text-[10px] text-[rgba(240,240,240,0.4)]">
        <span>Audio-reactive preview rendered at full 60 FPS</span>
        <span className="text-[#ff3e00] font-bold">
          {beatState.isBeat ? '● BEAT PULSE ACTIVE' : 'STANDBY'}
        </span>
      </div>

      {/* Expanded Modal View if toggled */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#141517] border border-[#ff3e00] max-w-4xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-space text-xs bg-[#ff3e00] text-black font-bold px-2 py-0.5">
                  FULL PREVIEW
                </span>
                <h3 className="font-syne text-base font-bold text-white">
                  {clip ? clip.name : 'Visualizer Clip Reaction'}
                </h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/60 hover:text-white font-space text-sm"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="bg-black border border-white/10 aspect-video flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between font-space text-xs text-white/60">
              <span>Template: <strong className="text-white">{previewConfig.template}</strong></span>
              <span>Aspect Ratio: <strong className="text-[#00f0ff]">{previewConfig.aspectRatio}</strong></span>
              <span>Bitrate: <strong className="text-white">{(clip?.bitrateBps || 12000000) / 1000000} Mbps</strong></span>
              <button
                onClick={onTogglePlay}
                className="px-4 py-1.5 bg-[#ff3e00] text-black font-bold hover:bg-[#ff5722]"
              >
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
