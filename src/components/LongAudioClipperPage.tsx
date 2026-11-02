import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  AudioClipSegment,
  ExportFormatPreset,
  VisualizerConfig,
  AspectRatio,
  TemplateId
} from '../types/visualizer';
import {
  DEFAULT_FORMAT_PRESETS,
  loadSavedCustomFormats,
  saveCustomFormat,
  deleteSavedCustomFormat,
  formatLongTime,
  parseTimeStringToSeconds,
  estimateClipFileSize
} from '../constants/exportFormats';
import { AudioEngine } from '../services/audioEngine';
import { VideoExporter } from '../services/videoExporter';
import { TEMPLATE_CONFIGS } from '../constants/presets';

interface LongAudioClipperPageProps {
  config: VisualizerConfig;
  onUpdateConfig: React.Dispatch<React.SetStateAction<VisualizerConfig>>;
  audioEngine: AudioEngine;
  videoExporter: VideoExporter;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  bgMedia: HTMLImageElement | HTMLVideoElement | null;
  onSwitchToStudio: () => void;
  playbackTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => Promise<void>;
  onSeek: (timeSec: number) => void;
  onUploadAudioFile: (file: File) => void;
  audioMediaRef: React.RefObject<HTMLAudioElement | null>;
  videoMediaRef: React.RefObject<HTMLVideoElement | null>;
}

export const LongAudioClipperPage: React.FC<LongAudioClipperPageProps> = ({
  config,
  onUpdateConfig,
  audioEngine,
  videoExporter,
  canvasRef,
  onSwitchToStudio,
  playbackTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onUploadAudioFile,
  audioMediaRef,
  videoMediaRef
}) => {
  // Format Presets State (Default + Saved custom)
  const [savedPresets, setSavedPresets] = useState<ExportFormatPreset[]>(() => loadSavedCustomFormats());
  const [selectedFormatId, setSelectedFormatId] = useState<string>('tiktok_reels_60');
  const [presetCategory, setPresetCategory] = useState<'defaults' | 'saved'>('defaults');

  // Custom Preset Modal
  const [isNewPresetOpen, setIsNewPresetOpen] = useState(false);
  const [customPresetName, setCustomPresetName] = useState('');
  const [customPresetRatio, setCustomPresetRatio] = useState<AspectRatio>('9:16');
  const [customPresetFps, setCustomPresetFps] = useState<24 | 30 | 60>(60);
  const [customPresetBitrate, setCustomPresetBitrate] = useState<number>(12000000);
  const [customPresetTemplate, setCustomPresetTemplate] = useState<TemplateId>('phonk_crown');

  // Marked Clips List
  const [clips, setClips] = useState<AudioClipSegment[]>([
    {
      id: 'clip_demo_1',
      name: 'Part 01: High Energy Drop (Hook)',
      startTime: 0,
      endTime: Math.min(30, Math.max(10, duration)),
      aspectRatio: '9:16',
      template: 'phonk_crown',
      fps: 60,
      bitrateBps: 12000000,
      status: 'idle',
      createdAt: Date.now()
    }
  ]);

  // Current Mark In & Mark Out markers
  const [markIn, setMarkIn] = useState<number>(0);
  const [markOut, setMarkOut] = useState<number>(() => Math.min(30, Math.max(15, duration)));

  // Timeline Zoom & Pan (1x to 30x)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [timelineScrollRatio, setTimelineScrollRatio] = useState<number>(0);

  // Active clip preview / loop state
  const [previewingClipId, setPreviewingClipId] = useState<string | null>(null);

  // Batch or Single Clip Render State
  const [renderingQueue, setRenderingQueue] = useState<{
    isActive: boolean;
    queue: string[]; // clip IDs
    currentClipId: string | null;
    currentClipIndex: number;
    totalInQueue: number;
    progressPercent: number;
    elapsedSeconds: number;
    clipDuration: number;
  }>({
    isActive: false,
    queue: [],
    currentClipId: null,
    currentClipIndex: 0,
    totalInQueue: 0,
    progressPercent: 0,
    elapsedSeconds: 0,
    clipDuration: 0
  });

  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    clipName: string;
    blobUrl: string;
    blobSizeMb: number;
    filename: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const macroTimelineRef = useRef<HTMLDivElement | null>(null);
  const zoomTimelineRef = useRef<HTMLDivElement | null>(null);

  // Active format preset resolution
  const activePreset = useMemo(() => {
    const all = [...DEFAULT_FORMAT_PRESETS, ...savedPresets];
    return all.find((p) => p.id === selectedFormatId) || DEFAULT_FORMAT_PRESETS[0];
  }, [selectedFormatId, savedPresets]);

  // Keep markIn / markOut bounded
  useEffect(() => {
    if (duration > 0 && markOut > duration) {
      setMarkOut(duration);
    }
  }, [duration, markOut]);

  // Handle preview clip loop boundary
  useEffect(() => {
    if (!previewingClipId || !isPlaying) return;
    const clip = clips.find((c) => c.id === previewingClipId);
    if (!clip) return;

    if (playbackTime >= clip.endTime || playbackTime < clip.startTime - 0.2) {
      onSeek(clip.startTime);
    }
  }, [playbackTime, previewingClipId, isPlaying, clips, onSeek]);

  // Handle Mark In at current playhead
  const handleSetMarkInCurrent = () => {
    const newIn = Math.max(0, parseFloat(playbackTime.toFixed(1)));
    setMarkIn(newIn);
    if (newIn >= markOut) {
      setMarkOut(Math.min(duration, newIn + 30));
    }
  };

  // Handle Mark Out at current playhead
  const handleSetMarkOutCurrent = () => {
    const newOut = Math.min(duration, parseFloat(playbackTime.toFixed(1)));
    if (newOut > markIn) {
      setMarkOut(newOut);
    } else {
      setMarkOut(Math.min(duration, markIn + 15));
    }
  };

  // Quick preset clip add (+15s, +30s, +60s, +3m)
  const handleAddQuickClip = (lengthSec: number, label: string) => {
    const start = Math.max(0, parseFloat(playbackTime.toFixed(1)));
    const end = Math.min(duration, start + lengthSec);
    const newClip: AudioClipSegment = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `Part ${clips.length + 1}: ${label} (${Math.round(end - start)}s)`,
      startTime: start,
      endTime: end,
      aspectRatio: activePreset.aspectRatio,
      template: activePreset.template,
      fps: activePreset.fps,
      bitrateBps: activePreset.bitrateBps,
      status: 'idle',
      createdAt: Date.now()
    };
    setClips((prev) => [...prev, newClip]);
  };

  // Add Clip from current Mark In / Mark Out range
  const handleAddMarkedClip = () => {
    const start = Math.min(markIn, markOut);
    const end = Math.max(markIn, markOut);
    if (end - start < 1) return;

    const newClip: AudioClipSegment = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `Part ${clips.length + 1}: Cut (${formatLongTime(start)} → ${formatLongTime(end)})`,
      startTime: parseFloat(start.toFixed(1)),
      endTime: parseFloat(end.toFixed(1)),
      aspectRatio: activePreset.aspectRatio,
      template: activePreset.template,
      fps: activePreset.fps,
      bitrateBps: activePreset.bitrateBps,
      status: 'idle',
      createdAt: Date.now()
    };

    setClips((prev) => [...prev, newClip]);
  };

  // Delete Clip
  const handleDeleteClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (previewingClipId === id) setPreviewingClipId(null);
  };

  // Duplicate Clip
  const handleDuplicateClip = (clip: AudioClipSegment) => {
    const newClip: AudioClipSegment = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${clip.name} (Copy)`,
      status: 'idle',
      blobUrl: undefined,
      createdAt: Date.now()
    };
    setClips((prev) => [...prev, newClip]);
  };

  // Update specific clip field
  const handleUpdateClip = (id: string, updates: Partial<AudioClipSegment>) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      })
    );
  };

  // Preview / Loop Clip
  const handleTogglePreviewClip = (clip: AudioClipSegment) => {
    if (previewingClipId === clip.id && isPlaying) {
      onTogglePlay();
      setPreviewingClipId(null);
    } else {
      setPreviewingClipId(clip.id);
      onSeek(clip.startTime);
      if (!isPlaying) {
        onTogglePlay();
      }
    }
  };

  // Macro Timeline Click to seek anywhere in 60+ min file
  const handleMacroTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!macroTimelineRef.current || duration <= 0) return;
    const rect = macroTimelineRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    onSeek(targetTime);
  };

  // Zoom scrubber click
  const handleZoomTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomTimelineRef.current || duration <= 0) return;
    const rect = zoomTimelineRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    // Calculate visible time window
    const visibleWindowDuration = duration / zoomLevel;
    const windowStart = timelineScrollRatio * (duration - visibleWindowDuration);
    const targetTime = windowStart + clickRatio * visibleWindowDuration;
    onSeek(Math.max(0, Math.min(duration, targetTime)));
  };

  // Save new custom format preset
  const handleSaveCustomPreset = () => {
    if (!customPresetName.trim()) return;
    const newPreset = saveCustomFormat({
      name: customPresetName.trim(),
      description: `${customPresetRatio} • ${customPresetFps} FPS • ${(customPresetBitrate / 1000000).toFixed(0)} Mbps • ${customPresetTemplate}`,
      platform: 'custom',
      aspectRatio: customPresetRatio,
      fps: customPresetFps,
      bitrateBps: customPresetBitrate,
      template: customPresetTemplate
    });
    setSavedPresets(loadSavedCustomFormats());
    setSelectedFormatId(newPreset.id);
    setIsNewPresetOpen(false);
    setCustomPresetName('');
  };

  // Delete custom format preset
  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedCustomFormat(id);
    const remaining = loadSavedCustomFormats();
    setSavedPresets(remaining);
    if (selectedFormatId === id) {
      setSelectedFormatId(DEFAULT_FORMAT_PRESETS[0].id);
    }
  };

  // Apply selected format to a clip
  const handleApplyFormatToClip = (clipId: string, preset: ExportFormatPreset) => {
    handleUpdateClip(clipId, {
      aspectRatio: preset.aspectRatio,
      fps: preset.fps,
      bitrateBps: preset.bitrateBps,
      template: preset.template
    });
  };

  // Apply selected format to ALL clips
  const handleApplyFormatToAllClips = () => {
    setClips((prev) =>
      prev.map((c) => ({
        ...c,
        aspectRatio: activePreset.aspectRatio,
        fps: activePreset.fps,
        bitrateBps: activePreset.bitrateBps,
        template: activePreset.template
      }))
    );
  };

  // Load a 70-Minute DJ Session Demo audio track
  const handleLoadDemoLongAudio = () => {
    // Uses the bundled reference file and populates realistic long-form chapters
    onUpdateConfig((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        trackTitle: 'Ibiza Sunset Horizon (72-Minute Live Festival Set)',
        artistName: 'PulseCraft Resident DJ',
        bpm: 128,
        duration: 4320 // 72 minutes (4320 seconds)
      }
    }));

    // Pre-populate 4 marked clips across the 72 minutes
    setClips([
      {
        id: 'clip_mix_1',
        name: 'Part 01: Sunset Intro & Melodic Chords',
        startTime: 15,
        endTime: 45,
        aspectRatio: '9:16',
        template: 'avee_classic',
        fps: 60,
        bitrateBps: 12000000,
        status: 'idle',
        createdAt: Date.now()
      },
      {
        id: 'clip_mix_2',
        name: 'Part 02: 15-Minute Peak Drop (TikTok Viral)',
        startTime: 920, // 15:20
        endTime: 950, // 15:50
        aspectRatio: '9:16',
        template: 'phonk_crown',
        fps: 60,
        bitrateBps: 12000000,
        status: 'idle',
        createdAt: Date.now() + 1
      },
      {
        id: 'clip_mix_3',
        name: 'Part 03: 35-Minute Synthwave Breakdown',
        startTime: 2130, // 35:30
        endTime: 2190, // 36:30
        aspectRatio: '16:9',
        template: 'cyber_horizon',
        fps: 60,
        bitrateBps: 14000000,
        status: 'idle',
        createdAt: Date.now() + 2
      },
      {
        id: 'clip_mix_4',
        name: 'Part 04: Hour-Mark Climax & Outro',
        startTime: 3600, // 60:00
        endTime: 3645, // 60:45
        aspectRatio: '1:1',
        template: 'twin_woofers',
        fps: 30,
        bitrateBps: 8000000,
        status: 'idle',
        createdAt: Date.now() + 3
      }
    ]);

    setMarkIn(920);
    setMarkOut(950);
  };

  // Send a specific clip to the Live Studio Canvas
  const handleSendClipToStudio = (clip: AudioClipSegment) => {
    // Apply template and aspect ratio to config
    const templatePreset = TEMPLATE_CONFIGS[clip.template];
    onUpdateConfig((prev) => ({
      ...prev,
      template: clip.template,
      aspectRatio: clip.aspectRatio,
      bars: templatePreset?.bars ? { ...prev.bars, ...(templatePreset.bars as any) } : prev.bars,
      centerBadge: templatePreset?.centerBadge ? { ...prev.centerBadge, ...(templatePreset.centerBadge as any) } : prev.centerBadge,
      background: templatePreset?.background ? { ...prev.background, ...(templatePreset.background as any) } : prev.background,
      overlays: templatePreset?.overlays ? { ...prev.overlays, ...(templatePreset.overlays as any) } : prev.overlays,
      beatDetection: templatePreset?.beatDetection ? { ...prev.beatDetection, ...(templatePreset.beatDetection as any) } : prev.beatDetection
    }));
    onSeek(clip.startTime);
    onSwitchToStudio();
  };

  // Execution: Render a Single Clip
  const renderClipInternal = async (clip: AudioClipSegment): Promise<Blob | null> => {
    if (!canvasRef.current) return null;

    handleUpdateClip(clip.id, { status: 'rendering' });

    // 1. Temporarily configure canvas with clip's format
    const templateConfig = TEMPLATE_CONFIGS[clip.template];
    onUpdateConfig((prev) => ({
      ...prev,
      template: clip.template,
      aspectRatio: clip.aspectRatio,
      bars: templateConfig?.bars ? { ...prev.bars, ...(templateConfig.bars as any) } : prev.bars,
      centerBadge: templateConfig?.centerBadge ? { ...prev.centerBadge, ...(templateConfig.centerBadge as any) } : prev.centerBadge,
      background: templateConfig?.background ? { ...prev.background, ...(templateConfig.background as any) } : prev.background,
      overlays: templateConfig?.overlays ? { ...prev.overlays, ...(templateConfig.overlays as any) } : prev.overlays,
      beatDetection: templateConfig?.beatDetection ? { ...prev.beatDetection, ...(templateConfig.beatDetection as any) } : prev.beatDetection
    }));

    // 2. Seek audio to clip start
    onSeek(clip.startTime);
    await new Promise((r) => setTimeout(r, 400)); // allow seek buffer to settle

    // 3. Audio stream capture
    const audioStream = audioEngine.getStreamDestination()?.stream || null;
    const clipDuration = Math.max(1, clip.endTime - clip.startTime);

    // 4. Start Playback
    if (!isPlaying) {
      await onTogglePlay();
    }

    try {
      const blob = await videoExporter.startExport(
        canvasRef.current,
        audioStream,
        {
          durationSeconds: clipDuration,
          fps: clip.fps,
          bitrateBps: clip.bitrateBps,
          filename: `${clip.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`
        },
        (percent, elapsed, total) => {
          setRenderingQueue((prev) => ({
            ...prev,
            progressPercent: percent,
            elapsedSeconds: elapsed,
            clipDuration: total
          }));
        }
      );

      // Stop audio playback after clip finishes
      const media = videoMediaRef.current || audioMediaRef.current;
      if (media && !media.paused) {
        media.pause();
      }

      const blobUrl = URL.createObjectURL(blob);
      const sizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));

      handleUpdateClip(clip.id, {
        status: 'completed',
        blobUrl,
        fileSizeMb: sizeMb
      });

      return blob;
    } catch (err) {
      console.error('Clip rendering failed', err);
      handleUpdateClip(clip.id, { status: 'error' });
      return null;
    }
  };

  // Render a specific clip (Triggered from Clip Card)
  const handleRenderSingleClip = async (clip: AudioClipSegment) => {
    if (renderingQueue.isActive) return;

    setRenderingQueue({
      isActive: true,
      queue: [clip.id],
      currentClipId: clip.id,
      currentClipIndex: 1,
      totalInQueue: 1,
      progressPercent: 0,
      elapsedSeconds: 0,
      clipDuration: clip.endTime - clip.startTime
    });

    const blob = await renderClipInternal(clip);

    setRenderingQueue((prev) => ({ ...prev, isActive: false, currentClipId: null }));

    if (blob) {
      const filename = `${clip.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`;
      const blobUrl = URL.createObjectURL(blob);
      const sizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));

      // Trigger auto-download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadModalData({
        isOpen: true,
        clipName: clip.name,
        blobUrl,
        blobSizeMb: sizeMb,
        filename
      });
    }
  };

  // Batch Render: Render all marked clips sequentially
  const handleRenderAllClips = async () => {
    if (renderingQueue.isActive || clips.length === 0) return;

    const clipIds = clips.map((c) => c.id);

    setRenderingQueue({
      isActive: true,
      queue: clipIds,
      currentClipId: clipIds[0],
      currentClipIndex: 1,
      totalInQueue: clipIds.length,
      progressPercent: 0,
      elapsedSeconds: 0,
      clipDuration: 0
    });

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      setRenderingQueue((prev) => ({
        ...prev,
        currentClipId: clip.id,
        currentClipIndex: i + 1,
        progressPercent: 0,
        elapsedSeconds: 0,
        clipDuration: clip.endTime - clip.startTime
      }));

      const blob = await renderClipInternal(clip);

      if (blob) {
        // Auto-download each rendered clip
        const filename = `${clip.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Small pause between queue items
      await new Promise((r) => setTimeout(r, 600));
    }

    setRenderingQueue((prev) => ({
      ...prev,
      isActive: false,
      currentClipId: null
    }));
  };

  // Cancel ongoing render
  const handleCancelRender = () => {
    videoExporter.cancelExport();
    setRenderingQueue((prev) => ({
      ...prev,
      isActive: false,
      currentClipId: null
    }));
    const media = videoMediaRef.current || audioMediaRef.current;
    if (media && !media.paused) {
      media.pause();
    }
  };

  // Calculate total duration and estimated size of all clips
  const totalClipsDuration = useMemo(() => {
    return clips.reduce((acc, c) => acc + Math.max(0, c.endTime - c.startTime), 0);
  }, [clips]);

  const totalClipsEstimatedSizeMb = useMemo(() => {
    return clips.reduce(
      (acc, c) => acc + estimateClipFileSize(Math.max(0, c.endTime - c.startTime), c.bitrateBps),
      0
    );
  }, [clips]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c0d] text-[#f0f0f0] overflow-hidden">
      {/* 1. Header Toolbar */}
      <header className="h-14 border-b border-[rgba(240,240,240,0.12)] bg-[#141517] px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onSwitchToStudio}
            className="flex items-center gap-2 text-xs font-space text-[rgba(240,240,240,0.6)] hover:text-white px-2.5 py-1.5 border border-[rgba(240,240,240,0.15)] hover:border-[#ff3e00] transition-colors"
          >
            <span>←</span>
            <span>BACK TO LIVE STUDIO</span>
          </button>

          <div className="h-4 w-px bg-[rgba(240,240,240,0.12)]" />

          <div className="flex items-center gap-2">
            <span className="font-space text-[10px] uppercase tracking-widest text-[#ff3e00] font-bold">
              MODULE.02
            </span>
            <span className="text-xs font-bold text-white tracking-tight">
              LONG AUDIO CLIPPER & BATCH RENDERER (60M+)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUploadAudioFile(e.target.files[0]);
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-space text-xs font-bold bg-[#141517] hover:bg-white/10 text-white border border-[rgba(240,240,240,0.2)] hover:border-[#ff3e00] px-3.5 py-1.5 transition-all flex items-center gap-2 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>IMPORT AUDIO (UP TO 120M+)</span>
          </button>

          <button
            onClick={handleLoadDemoLongAudio}
            className="font-space text-xs font-bold bg-[rgba(255,62,0,0.1)] hover:bg-[#ff3e00] hover:text-black text-[#ff3e00] border border-[#ff3e00]/40 px-3.5 py-1.5 transition-all"
            title="Load a 72-minute live festival set demo to test scrubbing and clipping"
          >
            <span>LOAD 72-MIN DEMO SET</span>
          </button>
        </div>
      </header>

      {/* 2. Main Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Section A: Audio Overview Banner & High-Precision Scrubber */}
        <section className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-5 relative overflow-hidden shadow-xl">
          {/* Top Info Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[rgba(240,240,240,0.08)]">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-space text-[10px] bg-[#ff3e00] text-black font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
                  MASTER AUDIO
                </span>
                <span className="font-space text-xs text-[rgba(240,240,240,0.5)]">
                  {duration > 3600 ? 'LONG-FORM AUDIO (60+ MIN)' : 'STANDARD AUDIO'}
                </span>
              </div>
              <h1 className="font-syne text-xl font-extrabold text-white mt-1 truncate">
                {config.audio.trackTitle || 'Audio Track'}
              </h1>
              <div className="font-space text-xs text-[rgba(240,240,240,0.6)] mt-0.5">
                ARTIST: <span className="text-white font-bold">{config.audio.artistName || 'Unknown Artist'}</span> • TOTAL LENGTH:{' '}
                <span className="text-[#ff3e00] font-bold">{formatLongTime(duration, false)}</span> ({Math.round(duration)}s)
              </div>
            </div>

            {/* Playhead Time Counter & Transport Controls */}
            <div className="flex items-center gap-4 bg-[#0b0c0d] p-3 border border-[rgba(240,240,240,0.12)]">
              <div className="text-right">
                <div className="font-space text-[10px] text-[rgba(240,240,240,0.4)] uppercase">
                  PLAYHEAD TIME
                </div>
                <div className="font-space text-2xl font-bold text-white tracking-wider tabular-nums">
                  {formatLongTime(playbackTime, true)}
                </div>
              </div>

              <div className="h-8 w-px bg-[rgba(240,240,240,0.15)]" />

              <button
                onClick={onTogglePlay}
                className="w-12 h-12 bg-[#ff3e00] hover:bg-[#ff5722] text-black font-extrabold flex items-center justify-center shadow-lg shadow-[#ff3e00]/25 active:scale-95 transition-all shrink-0"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <span className="text-base font-black">❚❚</span>
                ) : (
                  <span className="text-lg font-black ml-0.5">▶</span>
                )}
              </button>

              {/* Quick Seek Buttons */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => onSeek(Math.max(0, playbackTime - 30))}
                  className="font-space text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
                  title="Jump back 30 seconds"
                >
                  -30s
                </button>
                <button
                  onClick={() => onSeek(Math.max(0, playbackTime - 5))}
                  className="font-space text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
                  title="Jump back 5 seconds"
                >
                  -5s
                </button>
                <button
                  onClick={() => onSeek(Math.min(duration, playbackTime + 5))}
                  className="font-space text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
                  title="Jump forward 5 seconds"
                >
                  +5s
                </button>
                <button
                  onClick={() => onSeek(Math.min(duration, playbackTime + 30))}
                  className="font-space text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
                  title="Jump forward 30 seconds"
                >
                  +30s
                </button>
              </div>
            </div>
          </div>

          {/* LAYER 1: Full-Length Macro Overview Timeline (0:00 to 60:00+) */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between font-space text-[11px] text-[rgba(240,240,240,0.5)]">
              <span>00:00:00 (FULL OVERVIEW)</span>
              <span className="text-white/60">
                CLICK TO INSTANTLY JUMP ANYWHERE ACROSS {formatLongTime(duration, false)}
              </span>
              <span>{formatLongTime(duration, false)}</span>
            </div>

            <div
              ref={macroTimelineRef}
              onClick={handleMacroTimelineClick}
              className="relative h-10 bg-[#0b0c0d] border border-[rgba(240,240,240,0.18)] cursor-pointer select-none overflow-hidden group"
            >
              {/* Background Waveform Grid Ticks */}
              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20 px-2">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="h-full w-px bg-white" />
                ))}
              </div>

              {/* Highlighted Marked Clips as colored blocks */}
              {clips.map((clip, idx) => {
                const left = Math.min(100, Math.max(0, (clip.startTime / Math.max(1, duration)) * 100));
                const width = Math.min(
                  100 - left,
                  Math.max(0.6, ((clip.endTime - clip.startTime) / Math.max(1, duration)) * 100)
                );
                return (
                  <div
                    key={clip.id}
                    className="absolute top-0 bottom-0 bg-[#00f0ff]/30 border-l border-r border-[#00f0ff] hover:bg-[#00f0ff]/50 transition-colors flex items-center px-1 z-10"
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${clip.name} (${formatLongTime(clip.startTime)} → ${formatLongTime(clip.endTime)})`}
                  >
                    <span className="font-space text-[9px] font-bold text-white truncate drop-shadow">
                      P{idx + 1}
                    </span>
                  </div>
                );
              })}

              {/* Current Mark In / Mark Out Active Range */}
              {markOut > markIn && (
                <div
                  className="absolute top-0 bottom-0 bg-[#ff3e00]/25 border-l-2 border-r-2 border-[#ff3e00] pointer-events-none z-15"
                  style={{
                    left: `${Math.min(100, (markIn / Math.max(1, duration)) * 100)}%`,
                    width: `${Math.min(
                      100,
                      ((markOut - markIn) / Math.max(1, duration)) * 100
                    )}%`
                  }}
                />
              )}

              {/* Playhead Cursor */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
                style={{
                  left: `${Math.min(100, (playbackTime / Math.max(1, duration)) * 100)}%`
                }}
              >
                <div className="absolute -top-1 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 shadow" />
              </div>
            </div>
          </div>

          {/* LAYER 2: Zoomed Precision Scrubber */}
          <div className="mt-4 pt-4 border-t border-[rgba(240,240,240,0.08)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-space text-[10px] uppercase tracking-wider text-[#ff3e00] font-bold">
                  PRECISION TIMELINE
                </span>
                <span className="font-space text-xs text-[rgba(240,240,240,0.6)]">
                  Zoom for sub-second drop and hook alignment
                </span>
              </div>

              {/* Zoom Buttons */}
              <div className="flex items-center gap-1.5 font-space text-xs">
                <span className="text-[10px] text-[rgba(240,240,240,0.5)] mr-1">ZOOM:</span>
                {[1, 5, 15, 30].map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoomLevel(z)}
                    className={`px-2 py-0.5 border text-[10px] font-bold ${
                      zoomLevel === z
                        ? 'bg-[#ff3e00] text-black border-[#ff3e00]'
                        : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Scrubber Bar */}
            <div
              ref={zoomTimelineRef}
              onClick={handleZoomTimelineClick}
              className="relative h-14 bg-[#0b0c0d] border border-[rgba(240,240,240,0.2)] cursor-pointer select-none overflow-hidden"
            >
              {/* Tick Marks */}
              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-25 px-1 items-end pb-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-px bg-white ${i % 5 === 0 ? 'h-6 bg-white/70' : 'h-3'}`}
                  />
                ))}
              </div>

              {/* Clips within zoom viewport */}
              {clips.map((clip, idx) => {
                const left = (clip.startTime / Math.max(1, duration)) * 100;
                const width = ((clip.endTime - clip.startTime) / Math.max(1, duration)) * 100;
                return (
                  <div
                    key={clip.id}
                    className="absolute top-2 bottom-2 bg-[#00f0ff]/20 border border-[#00f0ff] flex items-center px-2 z-10"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className="font-space text-[10px] text-[#00f0ff] font-bold truncate">
                      Part {idx + 1}: {clip.name}
                    </span>
                  </div>
                );
              })}

              {/* In Marker Flag */}
              <div
                className="absolute top-0 bottom-0 border-l-2 border-[#ff3e00] z-25 pointer-events-none"
                style={{
                  left: `${(markIn / Math.max(1, duration)) * 100}%`
                }}
              >
                <div className="bg-[#ff3e00] text-black font-space text-[9px] font-black px-1 absolute -top-0.5 left-0">
                  IN: {formatLongTime(markIn, true)}
                </div>
              </div>

              {/* Out Marker Flag */}
              <div
                className="absolute top-0 bottom-0 border-r-2 border-[#ff3e00] z-25 pointer-events-none"
                style={{
                  left: `${(markOut / Math.max(1, duration)) * 100}%`
                }}
              >
                <div className="bg-[#ff3e00] text-black font-space text-[9px] font-black px-1 absolute -top-0.5 right-0">
                  OUT: {formatLongTime(markOut, true)}
                </div>
              </div>

              {/* Zoom playhead line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white z-30 pointer-events-none shadow-lg"
                style={{
                  left: `${(playbackTime / Math.max(1, duration)) * 100}%`
                }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-4 h-4 bg-white rounded-full border-2 border-black" />
              </div>
            </div>

            {/* Layer 2 Marking Actions Row */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSetMarkInCurrent}
                  className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] text-black px-3.5 py-1.5 active:scale-95 transition-all shadow"
                >
                  [ MARK IN (START): {formatLongTime(markIn, true)}
                </button>

                <button
                  onClick={handleSetMarkOutCurrent}
                  className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] text-black px-3.5 py-1.5 active:scale-95 transition-all shadow"
                >
                  ] MARK OUT (END): {formatLongTime(markOut, true)}
                </button>

                <button
                  onClick={handleAddMarkedClip}
                  className="font-space text-xs font-bold bg-white hover:bg-white/90 text-black px-4 py-1.5 active:scale-95 transition-all shadow"
                >
                  + ADD MARKED PART ({Math.max(0, markOut - markIn).toFixed(1)}s)
                </button>
              </div>

              {/* Quick Preset Lengths */}
              <div className="flex items-center gap-1.5">
                <span className="font-space text-[10px] text-[rgba(240,240,240,0.5)] mr-1 uppercase">
                  QUICK CUTS:
                </span>
                <button
                  onClick={() => handleAddQuickClip(15, 'Hook Cut')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2.5 py-1"
                >
                  +15s Hook
                </button>
                <button
                  onClick={() => handleAddQuickClip(30, 'Reels / Shorts')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2.5 py-1"
                >
                  +30s Reel
                </button>
                <button
                  onClick={() => handleAddQuickClip(60, 'Full Drop')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2.5 py-1"
                >
                  +60s Drop
                </button>
                <button
                  onClick={() => handleAddQuickClip(180, 'Full Song Cut')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2.5 py-1"
                >
                  +3m Track
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section B: Export Formats & Templates Selector (Saved & Default) */}
        <section className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[rgba(240,240,240,0.08)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-space text-[10px] uppercase tracking-widest text-[#ff3e00] font-bold">
                  STEP 2
                </span>
                <h2 className="font-syne text-base font-extrabold text-white">
                  SELECT EXPORT FORMAT & TEMPLATE
                </h2>
              </div>
              <p className="font-space text-xs text-[rgba(240,240,240,0.5)] mt-0.5">
                Apply default aspect ratios (9:16 Shorts, 16:9 HD, 1:1 Square) or your saved custom formats.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex border border-white/15 bg-black p-0.5 font-space text-[11px]">
                <button
                  onClick={() => setPresetCategory('defaults')}
                  className={`px-3 py-1 font-bold transition-colors ${
                    presetCategory === 'defaults'
                      ? 'bg-[#ff3e00] text-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  DEFAULT PRESETS ({DEFAULT_FORMAT_PRESETS.length})
                </button>
                <button
                  onClick={() => setPresetCategory('saved')}
                  className={`px-3 py-1 font-bold transition-colors ${
                    presetCategory === 'saved'
                      ? 'bg-[#ff3e00] text-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  SAVED FORMATS ({savedPresets.length})
                </button>
              </div>

              <button
                onClick={() => setIsNewPresetOpen(true)}
                className="font-space text-[11px] font-bold bg-white/5 hover:bg-white/10 text-[#ff3e00] border border-[#ff3e00]/40 px-3 py-1.5 transition-colors"
              >
                + SAVE NEW FORMAT
              </button>

              <button
                onClick={handleApplyFormatToAllClips}
                className="font-space text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 transition-colors"
                title="Apply active format preset to all existing marked clips below"
              >
                APPLY TO ALL CLIPS
              </button>
            </div>
          </div>

          {/* Formats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(presetCategory === 'defaults' ? DEFAULT_FORMAT_PRESETS : savedPresets).map((preset) => {
              const isSelected = selectedFormatId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedFormatId(preset.id)}
                  className={`relative p-3.5 bg-[#0b0c0d] border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#ff3e00] shadow-md shadow-[#ff3e00]/10 bg-[rgba(255,62,0,0.03)]'
                      : 'border-[rgba(240,240,240,0.12)] hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-space text-[9px] bg-white/10 text-white font-bold px-1.5 py-0.5">
                          {preset.aspectRatio}
                        </span>
                        <span className="font-space text-[9px] text-[#ff3e00] font-bold">
                          {preset.fps} FPS
                        </span>
                        <span className="font-space text-[9px] text-white/50">
                          {(preset.bitrateBps / 1000000).toFixed(0)} Mbps
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white mt-1.5">{preset.name}</h3>
                      <p className="text-[11px] text-[rgba(240,240,240,0.5)] line-clamp-2 mt-1 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="font-space text-[9px] bg-[#ff3e00] text-black font-extrabold px-1.5 py-0.5 shrink-0">
                        ACTIVE
                      </span>
                    )}

                    {preset.isSavedCustom && (
                      <button
                        onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                        className="text-white/40 hover:text-red-400 p-1 text-xs shrink-0"
                        title="Delete custom preset"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {presetCategory === 'saved' && savedPresets.length === 0 && (
              <div className="col-span-full py-8 text-center border border-dashed border-white/10 bg-[#0b0c0d]">
                <p className="font-space text-xs text-[rgba(240,240,240,0.4)]">
                  No custom saved presets yet. Click "+ SAVE NEW FORMAT" to customize and save your own!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Section C: Marked Clips / Parts Manager & Batch Exporter */}
        <section className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[rgba(240,240,240,0.08)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-space text-[10px] uppercase tracking-widest text-[#ff3e00] font-bold">
                  STEP 3
                </span>
                <h2 className="font-syne text-lg font-extrabold text-white">
                  MARKED CLIPS & SEQUENCED PARTS ({clips.length})
                </h2>
              </div>
              <p className="font-space text-xs text-[rgba(240,240,240,0.5)] mt-0.5">
                Total Queue Duration: <span className="text-white font-bold">{Math.round(totalClipsDuration)}s</span> • Estimated Export Size:{' '}
                <span className="text-[#ff3e00] font-bold">~{totalClipsEstimatedSizeMb.toFixed(1)} MB</span>
              </p>
            </div>

            {/* Master Batch Render Button */}
            <div className="flex items-center gap-3">
              {renderingQueue.isActive ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-space text-[10px] text-[#ff3e00] font-bold">
                      RENDERING CLIP {renderingQueue.currentClipIndex} OF {renderingQueue.totalInQueue}
                    </div>
                    <div className="font-space text-xs text-white">
                      {renderingQueue.progressPercent.toFixed(0)}% • {renderingQueue.elapsedSeconds.toFixed(1)}s /{' '}
                      {renderingQueue.clipDuration.toFixed(1)}s
                    </div>
                  </div>
                  <button
                    onClick={handleCancelRender}
                    className="font-space text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-4 py-2 transition-colors"
                  >
                    CANCEL RENDER
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRenderAllClips}
                  disabled={clips.length === 0}
                  className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] disabled:opacity-50 text-black px-5 py-2.5 shadow-lg shadow-[#ff3e00]/25 active:scale-95 transition-all flex items-center gap-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>RENDER ALL MARKED CLIPS ({clips.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Render Progress Bar if active */}
          {renderingQueue.isActive && (
            <div className="mb-5 p-4 bg-[#0b0c0d] border border-[#ff3e00] space-y-2">
              <div className="flex justify-between font-space text-xs">
                <span className="text-[#ff3e00] font-bold">
                  Exporting Video Frame Buffer (Direct Canvas + Audio Stream)
                </span>
                <span className="text-white font-bold">
                  {renderingQueue.progressPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#ff3e00] transition-all duration-200"
                  style={{ width: `${renderingQueue.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Clips List */}
          <div className="space-y-3">
            {clips.map((clip, idx) => {
              const clipDuration = Math.max(0, clip.endTime - clip.startTime);
              const estSize = estimateClipFileSize(clipDuration, clip.bitrateBps);
              const isCurrentlyPreviewing = previewingClipId === clip.id && isPlaying;
              const isCurrentlyRendering = renderingQueue.currentClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  className={`p-4 bg-[#0b0c0d] border transition-all ${
                    isCurrentlyRendering
                      ? 'border-[#ff3e00] ring-1 ring-[#ff3e00]'
                      : isCurrentlyPreviewing
                      ? 'border-[#00f0ff]'
                      : 'border-[rgba(240,240,240,0.12)] hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Part Name & Editable Input */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-space text-[10px] bg-white/10 text-white font-bold px-2 py-0.5">
                          PART {idx + 1}
                        </span>
                        <span className="font-space text-[10px] bg-[#00f0ff]/15 text-[#00f0ff] font-bold px-2 py-0.5">
                          {clip.aspectRatio}
                        </span>
                        <span className="font-space text-[10px] text-white/50">
                          {clip.fps} FPS • {(clip.bitrateBps / 1000000).toFixed(0)} Mbps
                        </span>
                        <span className="font-space text-[10px] text-[#ff3e00] font-bold">
                          EST. ~{estSize} MB
                        </span>

                        {clip.status === 'completed' && (
                          <span className="font-space text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5">
                            RENDERED ({clip.fileSizeMb || estSize} MB)
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={clip.name}
                        onChange={(e) => handleUpdateClip(clip.id, { name: e.target.value })}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#ff3e00] text-sm font-bold text-white focus:outline-none py-1"
                        placeholder="Clip Title / Chapter Name"
                      />
                    </div>

                    {/* Timestamp Range & Precision Nudge */}
                    <div className="flex items-center gap-3 bg-[#141517] p-2.5 border border-white/10 shrink-0">
                      <div>
                        <div className="font-space text-[9px] text-[rgba(240,240,240,0.4)]">
                          START TIME
                        </div>
                        <div className="font-space text-xs font-bold text-white tabular-nums">
                          {formatLongTime(clip.startTime, true)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() =>
                              handleUpdateClip(clip.id, {
                                startTime: Math.max(0, clip.startTime - 1)
                              })
                            }
                            className="font-space text-[9px] px-1 bg-white/5 hover:bg-white/10 border border-white/10"
                            title="Nudge start -1s"
                          >
                            -1s
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateClip(clip.id, {
                                startTime: Math.min(clip.endTime - 0.5, clip.startTime + 1)
                              })
                            }
                            className="font-space text-[9px] px-1 bg-white/5 hover:bg-white/10 border border-white/10"
                            title="Nudge start +1s"
                          >
                            +1s
                          </button>
                        </div>
                      </div>

                      <div className="font-space text-white/30 text-xs">→</div>

                      <div>
                        <div className="font-space text-[9px] text-[rgba(240,240,240,0.4)]">
                          END TIME
                        </div>
                        <div className="font-space text-xs font-bold text-white tabular-nums">
                          {formatLongTime(clip.endTime, true)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() =>
                              handleUpdateClip(clip.id, {
                                endTime: Math.max(clip.startTime + 0.5, clip.endTime - 1)
                              })
                            }
                            className="font-space text-[9px] px-1 bg-white/5 hover:bg-white/10 border border-white/10"
                            title="Nudge end -1s"
                          >
                            -1s
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateClip(clip.id, {
                                endTime: Math.min(duration, clip.endTime + 1)
                              })
                            }
                            className="font-space text-[9px] px-1 bg-white/5 hover:bg-white/10 border border-white/10"
                            title="Nudge end +1s"
                          >
                            +1s
                          </button>
                        </div>
                      </div>

                      <div className="h-7 w-px bg-white/10" />

                      <div className="text-right">
                        <div className="font-space text-[9px] text-[rgba(240,240,240,0.4)]">
                          DURATION
                        </div>
                        <div className="font-space text-xs font-bold text-[#ff3e00] tabular-nums">
                          {clipDuration.toFixed(1)}s
                        </div>
                      </div>
                    </div>

                    {/* Format Selector per Clip */}
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={clip.aspectRatio}
                        onChange={(e) =>
                          handleUpdateClip(clip.id, { aspectRatio: e.target.value as AspectRatio })
                        }
                        className="bg-[#141517] border border-white/15 text-white font-space text-xs px-2 py-1.5 focus:outline-none focus:border-[#ff3e00]"
                      >
                        <option value="9:16">9:16 (Shorts/Reels)</option>
                        <option value="16:9">16:9 (YouTube)</option>
                        <option value="1:1">1:1 (Instagram)</option>
                        <option value="4:5">4:5 (Portrait)</option>
                      </select>

                      <select
                        value={clip.template}
                        onChange={(e) =>
                          handleUpdateClip(clip.id, { template: e.target.value as TemplateId })
                        }
                        className="bg-[#141517] border border-white/15 text-white font-space text-xs px-2 py-1.5 focus:outline-none focus:border-[#ff3e00]"
                      >
                        <option value="phonk_crown">Phonk Crown</option>
                        <option value="avee_classic">Avee Classic</option>
                        <option value="trap_nation">Trap Nation</option>
                        <option value="cyber_horizon">Cyber Horizon</option>
                        <option value="neon_box_frame">Neon Frame</option>
                        <option value="tunnel_portal">Tunnel Portal</option>
                        <option value="twin_woofers">Twin Woofers</option>
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Preview / Loop Button */}
                      <button
                        onClick={() => handleTogglePreviewClip(clip)}
                        className={`font-space text-xs font-bold px-3 py-1.5 border transition-all ${
                          isCurrentlyPreviewing
                            ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                            : 'bg-white/5 hover:bg-white/10 text-white border-white/15'
                        }`}
                        title="Loop & listen to this clip"
                      >
                        {isCurrentlyPreviewing ? '❚❚ PAUSE' : '▶ PREVIEW'}
                      </button>

                      {/* Send to Live Studio Canvas */}
                      <button
                        onClick={() => handleSendClipToStudio(clip)}
                        className="font-space text-xs font-bold bg-white/5 hover:bg-white/10 text-[rgba(240,240,240,0.8)] border border-white/15 px-3 py-1.5 transition-colors"
                        title="Open this clip segment in the interactive Studio Canvas"
                      >
                        OPEN STUDIO
                      </button>

                      {/* Render Specific Video Clip */}
                      <button
                        onClick={() => handleRenderSingleClip(clip)}
                        disabled={renderingQueue.isActive}
                        className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] disabled:opacity-50 text-black px-3.5 py-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        {isCurrentlyRendering ? 'RENDERING...' : 'RENDER VIDEO'}
                      </button>

                      {/* Download completed blob if available */}
                      {clip.blobUrl && (
                        <a
                          href={clip.blobUrl}
                          download={`${clip.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`}
                          className="font-space text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black px-2.5 py-1.5"
                          title="Download exported video file"
                        >
                          SAVE ⤓
                        </a>
                      )}

                      {/* Duplicate & Delete */}
                      <button
                        onClick={() => handleDuplicateClip(clip)}
                        className="text-white/40 hover:text-white p-1 text-xs"
                        title="Duplicate part"
                      >
                        ⎘
                      </button>
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        className="text-white/40 hover:text-red-400 p-1 text-xs"
                        title="Delete part"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {clips.length === 0 && (
              <div className="py-12 text-center border border-dashed border-white/10 bg-[#0b0c0d]">
                <p className="font-space text-sm text-[rgba(240,240,240,0.5)]">
                  No parts marked yet. Use the timeline above to mark IN and OUT points and add clips!
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal: Save Custom Export Format */}
      {isNewPresetOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141517] border border-[#ff3e00] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-syne text-lg font-bold text-white">SAVE CUSTOM EXPORT FORMAT</h3>
              <button
                onClick={() => setIsNewPresetOpen(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-space text-xs">
              <div>
                <label className="text-white/60 block mb-1">PRESET NAME:</label>
                <input
                  type="text"
                  value={customPresetName}
                  onChange={(e) => setCustomPresetName(e.target.value)}
                  placeholder="e.g. My DJ Set Vertical 60fps"
                  className="w-full bg-[#0b0c0d] border border-white/20 text-white p-2 focus:border-[#ff3e00] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">ASPECT RATIO:</label>
                  <select
                    value={customPresetRatio}
                    onChange={(e) => setCustomPresetRatio(e.target.value as AspectRatio)}
                    className="w-full bg-[#0b0c0d] border border-white/20 text-white p-2 focus:border-[#ff3e00] focus:outline-none"
                  >
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:5">4:5 (Portrait)</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/60 block mb-1">FRAME RATE:</label>
                  <select
                    value={customPresetFps}
                    onChange={(e) => setCustomPresetFps(Number(e.target.value) as 24 | 30 | 60)}
                    className="w-full bg-[#0b0c0d] border border-white/20 text-white p-2 focus:border-[#ff3e00] focus:outline-none"
                  >
                    <option value={60}>60 FPS (Ultra Smooth)</option>
                    <option value={30}>30 FPS (Standard)</option>
                    <option value={24}>24 FPS (Cinematic)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">TARGET BITRATE:</label>
                  <select
                    value={customPresetBitrate}
                    onChange={(e) => setCustomPresetBitrate(Number(e.target.value))}
                    className="w-full bg-[#0b0c0d] border border-white/20 text-white p-2 focus:border-[#ff3e00] focus:outline-none"
                  >
                    <option value={16000000}>16 Mbps (Master High)</option>
                    <option value={12000000}>12 Mbps (High)</option>
                    <option value={8000000}>8 Mbps (Balanced)</option>
                    <option value={5000000}>5 Mbps (Compact)</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/60 block mb-1">TEMPLATE STYLE:</label>
                  <select
                    value={customPresetTemplate}
                    onChange={(e) => setCustomPresetTemplate(e.target.value as TemplateId)}
                    className="w-full bg-[#0b0c0d] border border-white/20 text-white p-2 focus:border-[#ff3e00] focus:outline-none"
                  >
                    <option value="phonk_crown">Phonk Crown</option>
                    <option value="avee_classic">Avee Classic</option>
                    <option value="trap_nation">Trap Nation</option>
                    <option value="cyber_horizon">Cyber Horizon</option>
                    <option value="neon_box_frame">Neon Frame</option>
                    <option value="twin_woofers">Twin Woofers</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10 font-space text-xs">
              <button
                onClick={() => setIsNewPresetOpen(false)}
                className="px-4 py-2 border border-white/20 text-white hover:bg-white/5"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveCustomPreset}
                disabled={!customPresetName.trim()}
                className="px-4 py-2 bg-[#ff3e00] disabled:opacity-40 text-black font-bold hover:bg-[#ff5722]"
              >
                SAVE FORMAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Download & Video Ready Notification */}
      {downloadModalData && downloadModalData.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141517] border border-[#ff3e00] w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-space text-xs bg-[#ff3e00] text-black font-bold px-1.5 py-0.5">
                  SUCCESS
                </span>
                <h3 className="font-syne text-lg font-bold text-white">VIDEO CLIP EXPORT READY</h3>
              </div>
              <button
                onClick={() => setDownloadModalData(null)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="font-space text-xs text-[rgba(240,240,240,0.7)]">
                Your video clip <strong className="text-white">"{downloadModalData.clipName}"</strong> has
                been rendered at pristine full framerate and beat synchronization!
              </p>

              {/* Video Preview */}
              <div className="bg-black border border-white/15 aspect-video overflow-hidden flex items-center justify-center">
                <video
                  src={downloadModalData.blobUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="font-space text-xs text-white/50 flex justify-between">
                <span>FILE: {downloadModalData.filename}</span>
                <span className="text-[#ff3e00] font-bold">SIZE: {downloadModalData.blobSizeMb} MB</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10 font-space text-xs">
              <button
                onClick={() => setDownloadModalData(null)}
                className="px-4 py-2 border border-white/20 text-white hover:bg-white/5"
              >
                CLOSE
              </button>
              <a
                href={downloadModalData.blobUrl}
                download={downloadModalData.filename}
                className="px-5 py-2 bg-[#ff3e00] text-black font-extrabold hover:bg-[#ff5722] flex items-center gap-1.5"
              >
                DOWNLOAD NOW ⤓
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
