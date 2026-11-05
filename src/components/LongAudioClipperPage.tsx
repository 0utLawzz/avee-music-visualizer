import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  AudioClipSegment,
  ExportFormatPreset,
  VisualizerConfig,
  AspectRatio,
  TemplateId,
  BatchQueueItem,
  ExportHistoryItem,
  SuggestedHitPoint
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
import { BeatDetector } from '../services/beatDetector';
import { TEMPLATE_CONFIGS } from '../constants/presets';
import { BatchQueue } from './BatchQueue';
import { MiniVisualizerPreview } from './MiniVisualizerPreview';
import { ExportHistoryPanel } from './ExportHistoryPanel';

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
  bgMedia,
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

  // Selected clip for Mini-Visualizer Preview
  const [selectedPreviewClipId, setSelectedPreviewClipId] = useState<string>('clip_demo_1');

  // Current Mark In & Mark Out markers
  const [markIn, setMarkIn] = useState<number>(0);
  const [markOut, setMarkOut] = useState<number>(() => Math.min(30, Math.max(15, duration)));

  // Timeline Zoom & Pan (1x to 30x)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [timelineScrollRatio, setTimelineScrollRatio] = useState<number>(0);

  // Active clip preview / loop state
  const [previewingClipId, setPreviewingClipId] = useState<string | null>(null);

  // Sidebar Tab Switcher: 'preview' | 'queue' | 'history' | 'hits'
  const [activeSidebarTab, setActiveSidebarTab] = useState<'preview' | 'queue' | 'history' | 'hits'>('preview');

  // Batch Queue State
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([
    {
      id: 'task_demo_1',
      clipId: 'clip_demo_1',
      name: 'Part 01: High Energy Drop (Hook)',
      startTime: 0,
      endTime: Math.min(30, Math.max(10, duration)),
      aspectRatio: '9:16',
      template: 'phonk_crown',
      fps: 60,
      bitrateBps: 12000000,
      status: 'pending',
      progressPercent: 0,
      queuedAt: Date.now()
    }
  ]);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [currentExportingTaskId, setCurrentExportingTaskId] = useState<string | null>(null);
  const [batchOverallProgress, setBatchOverallProgress] = useState(0);

  // Export History (Session Storage Vault)
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>(() => {
    try {
      const raw = sessionStorage.getItem('pulsecraft_session_exports_v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Sync export history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('pulsecraft_session_exports_v1', JSON.stringify(exportHistory));
    } catch {}
  }, [exportHistory]);

  // Automatic Beat Detection & Suggested Hit Points
  const beatDetector = useMemo(() => new BeatDetector(), []);
  const [suggestedHits, setSuggestedHits] = useState<SuggestedHitPoint[]>(() =>
    beatDetector.generateSuggestedHits(duration || 60, config.audio.bpm || 128)
  );

  // Re-generate hits when track duration changes
  useEffect(() => {
    if (duration > 0) {
      setSuggestedHits(beatDetector.generateSuggestedHits(duration, config.audio.bpm || 128));
    }
  }, [duration, config.audio.bpm, beatDetector]);

  // Video Preview Modal Data
  const [previewModalVideo, setPreviewModalVideo] = useState<{
    isOpen: boolean;
    name: string;
    blobUrl: string;
    sizeMb: number;
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

  // Active clip object for Mini-Visualizer Preview
  const activePreviewClip = useMemo<AudioClipSegment | null>(() => {
    return clips.find((c) => c.id === selectedPreviewClipId) || clips[0] || null;
  }, [clips, selectedPreviewClipId]);

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
    setSelectedPreviewClipId(newClip.id);
  };

  // Add Clip from current Mark In / Mark Out range
  const handleAddMarkedClip = () => {
    const start = Math.min(markIn, markOut);
    const end = Math.max(markIn, markOut);
    if (end - start < 0.5) return;

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
    setSelectedPreviewClipId(newClip.id);
  };

  // Add individual clip to Batch Queue
  const handleAddToBatchQueue = (clip: AudioClipSegment) => {
    const newTask: BatchQueueItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clipId: clip.id,
      name: clip.name,
      startTime: clip.startTime,
      endTime: clip.endTime,
      aspectRatio: clip.aspectRatio,
      template: clip.template,
      fps: clip.fps,
      bitrateBps: clip.bitrateBps,
      status: 'pending',
      progressPercent: 0,
      queuedAt: Date.now()
    };
    setBatchQueue((prev) => [...prev, newTask]);
    setActiveSidebarTab('queue');
  };

  // Add ALL marked clips to Batch Queue
  const handleAddAllToBatchQueue = () => {
    const newTasks: BatchQueueItem[] = clips.map((c, i) => ({
      id: `task_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      clipId: c.id,
      name: c.name,
      startTime: c.startTime,
      endTime: c.endTime,
      aspectRatio: c.aspectRatio,
      template: c.template,
      fps: c.fps,
      bitrateBps: c.bitrateBps,
      status: 'pending',
      progressPercent: 0,
      queuedAt: Date.now() + i
    }));
    setBatchQueue((prev) => [...prev, ...newTasks]);
    setActiveSidebarTab('queue');
  };

  // Remove task from Batch Queue
  const handleRemoveFromBatchQueue = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear Batch Queue
  const handleClearBatchQueue = () => {
    setBatchQueue([]);
  };

  // Delete Clip
  const handleDeleteClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (previewingClipId === id) setPreviewingClipId(null);
    if (selectedPreviewClipId === id) {
      const remaining = clips.filter((c) => c.id !== id);
      if (remaining.length > 0) setSelectedPreviewClipId(remaining[0].id);
    }
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
    setSelectedPreviewClipId(clip.id);
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
    const visibleWindowDuration = duration / zoomLevel;
    const windowStart = timelineScrollRatio * (duration - visibleWindowDuration);
    const targetTime = windowStart + clickRatio * visibleWindowDuration;
    onSeek(Math.max(0, Math.min(duration, targetTime)));
  };

  // Snap Mark In or Mark Out to nearest suggested hit/drop
  const handleSnapToNearestHit = (type: 'in' | 'out') => {
    if (suggestedHits.length === 0) return;
    const target = type === 'in' ? markIn : markOut;
    let closest = suggestedHits[0];
    let minDiff = Math.abs(closest.time - target);

    for (const hit of suggestedHits) {
      const diff = Math.abs(hit.time - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = hit;
      }
    }

    if (type === 'in') {
      setMarkIn(closest.time);
      onSeek(closest.time);
    } else {
      setMarkOut(closest.time);
      onSeek(closest.time);
    }
  };

  // Create clip starting from a suggested hit drop
  const handleCreateClipFromHit = (hit: SuggestedHitPoint) => {
    const start = hit.time;
    const end = Math.min(duration, start + 30);
    const newClip: AudioClipSegment = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${hit.label} Cut (${formatLongTime(start)} → ${formatLongTime(end)})`,
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
    setSelectedPreviewClipId(newClip.id);
    onSeek(start);
  };

  // Trigger Automatic Beat Transient Scan
  const handleScanBeatsAndDrops = () => {
    const hits = beatDetector.generateSuggestedHits(duration, config.audio.bpm || 128);
    setSuggestedHits(hits);
    setActiveSidebarTab('hits');
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

  // Load User's Dialekt Radio 351 Track
  const handleLoadDialektSample = () => {
    onUpdateConfig((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        trackTitle: 'Dialekt Radio 351 (All What You Need)',
        artistName: 'Sultan + Shepard / Dialekt',
        bpm: 124,
        duration: 237,
        sourceUrl: '/assets/aistudio/DIALEKT_RADIO__351__mp3cut.net__776115a6.mp3'
      }
    }));

    if (audioMediaRef.current) {
      const audio = audioMediaRef.current;
      const target = '/assets/aistudio/DIALEKT_RADIO__351__mp3cut.net__776115a6.mp3';
      if (!audio.src.endsWith(target) && audio.src !== target) {
        audio.src = target;
        audio.load();
      }
      audio.currentTime = 0;
      audioEngine.attachMediaElement(audio);
    }

    setClips([
      {
        id: 'clip_dialekt_1',
        name: 'Part 01: Melodic House Intro (0:00 - 0:30)',
        startTime: 0,
        endTime: 30,
        aspectRatio: '9:16',
        template: 'avee_classic',
        fps: 60,
        bitrateBps: 12000000,
        status: 'idle',
        createdAt: Date.now()
      },
      {
        id: 'clip_dialekt_2',
        name: 'Part 02: Progressive Bass Drop (1:02 - 1:32)',
        startTime: 62,
        endTime: 92,
        aspectRatio: '9:16',
        template: 'phonk_crown',
        fps: 60,
        bitrateBps: 12000000,
        status: 'idle',
        createdAt: Date.now() + 1
      },
      {
        id: 'clip_dialekt_3',
        name: 'Part 03: Peak Energy Climax (2:15 - 2:45)',
        startTime: 135,
        endTime: 165,
        aspectRatio: '16:9',
        template: 'cyber_horizon',
        fps: 60,
        bitrateBps: 14000000,
        status: 'idle',
        createdAt: Date.now() + 2
      }
    ]);

    setMarkIn(0);
    setMarkOut(30);
  };

  // Load 72-Minute DJ Session Demo
  const handleLoadDemoLongAudio = () => {
    onUpdateConfig((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        trackTitle: 'Ibiza Sunset Horizon (72-Minute Live Festival Set)',
        artistName: 'PulseCraft Resident DJ',
        bpm: 128,
        duration: 4320
      }
    }));

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
        startTime: 920,
        endTime: 950,
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
        startTime: 2130,
        endTime: 2190,
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
        startTime: 3600,
        endTime: 3645,
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

  // Internal render executor for a single clip/task
  const renderClipInternal = async (
    clip: { id: string; name: string; startTime: number; endTime: number; template: TemplateId; aspectRatio: AspectRatio; fps: 24 | 30 | 60; bitrateBps: number },
    onProgressUpdate?: (percent: number) => void
  ): Promise<Blob | null> => {
    if (!canvasRef.current) return null;

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

    onSeek(clip.startTime);
    await new Promise((r) => setTimeout(r, 450));

    const audioStream = audioEngine.getStreamDestination()?.stream || null;
    const clipDuration = Math.max(0.5, clip.endTime - clip.startTime);

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
        (percent) => {
          if (onProgressUpdate) onProgressUpdate(percent);
        }
      );

      const media = videoMediaRef.current || audioMediaRef.current;
      if (media && !media.paused) {
        media.pause();
      }

      return blob;
    } catch (err) {
      console.error('Clip rendering failed', err);
      return null;
    }
  };

  // Single Clip Render (from Clip Card)
  const handleRenderSingleClip = async (clip: AudioClipSegment) => {
    if (isBatchExporting) return;

    handleUpdateClip(clip.id, { status: 'rendering' });

    const blob = await renderClipInternal(clip);

    if (blob) {
      const filename = `${clip.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`;
      const blobUrl = URL.createObjectURL(blob);
      const sizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));

      handleUpdateClip(clip.id, {
        status: 'completed',
        blobUrl,
        fileSizeMb: sizeMb
      });

      // Add to Session Export History
      const historyItem: ExportHistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        clipName: clip.name,
        filename,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        aspectRatio: clip.aspectRatio,
        template: clip.template,
        fps: clip.fps,
        blobUrl,
        blobSizeMb: sizeMb,
        exportedAt: Date.now()
      };
      setExportHistory((prev) => [historyItem, ...prev]);

      // Trigger instant auto-download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setPreviewModalVideo({
        isOpen: true,
        name: clip.name,
        blobUrl,
        sizeMb,
        filename
      });
    } else {
      handleUpdateClip(clip.id, { status: 'error' });
    }
  };

  // Sequential Batch Render Engine
  const handleStartBatchExport = async () => {
    const pendingTasks = batchQueue.filter((t) => t.status === 'pending');
    if (isBatchExporting || pendingTasks.length === 0) return;

    setIsBatchExporting(true);
    setBatchOverallProgress(0);

    for (let i = 0; i < batchQueue.length; i++) {
      const task = batchQueue[i];
      if (task.status === 'completed') continue;

      setCurrentExportingTaskId(task.id);
      setBatchQueue((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'rendering', progressPercent: 0 } : t))
      );

      const blob = await renderClipInternal(task, (pct) => {
        setBatchQueue((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, progressPercent: pct } : t))
        );
        const overall = ((i + pct / 100) / batchQueue.length) * 100;
        setBatchOverallProgress(overall);
      });

      if (blob) {
        const filename = `${task.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`;
        const blobUrl = URL.createObjectURL(blob);
        const sizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));

        setBatchQueue((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'completed',
                  blobUrl,
                  blobSizeMb: sizeMb,
                  filename,
                  progressPercent: 100
                }
              : t
          )
        );

        // Add to Export History
        const historyItem: ExportHistoryItem = {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          clipName: task.name,
          filename,
          startTime: task.startTime,
          endTime: task.endTime,
          duration: task.endTime - task.startTime,
          aspectRatio: task.aspectRatio,
          template: task.template,
          fps: task.fps,
          blobUrl,
          blobSizeMb: sizeMb,
          exportedAt: Date.now()
        };
        setExportHistory((prev) => [historyItem, ...prev]);

        // Auto download file
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        setBatchQueue((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'failed' } : t))
        );
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    setIsBatchExporting(false);
    setCurrentExportingTaskId(null);
    setBatchOverallProgress(100);
  };

  const handleCancelBatchExport = () => {
    videoExporter.cancelExport();
    setIsBatchExporting(false);
    setCurrentExportingTaskId(null);
    const media = videoMediaRef.current || audioMediaRef.current;
    if (media && !media.paused) media.pause();
  };

  // Re-download from History Vault
  const handleDownloadHistoryItem = (item: ExportHistoryItem) => {
    const a = document.createElement('a');
    a.href = item.blobUrl;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreviewHistoryItem = (item: ExportHistoryItem) => {
    setPreviewModalVideo({
      isOpen: true,
      name: item.clipName,
      blobUrl: item.blobUrl,
      sizeMb: item.blobSizeMb,
      filename: item.filename
    });
  };

  const handleRemoveHistoryItem = (id: string) => {
    setExportHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleClearHistory = () => {
    setExportHistory([]);
  };

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
              LONG AUDIO CLIPPER & SEQUENTIAL BATCH ENGINE (60M+)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleLoadDialektSample}
            className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] text-black px-3 py-1.5 transition-all flex items-center gap-1.5 shadow-sm"
            title="Load your sample track Dialekt Radio 351"
          >
            <span>▶</span>
            <span>SAMPLE: DIALEKT 351</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-space text-xs font-bold bg-[#141517] hover:bg-white/10 text-white border border-[rgba(240,240,240,0.2)] hover:border-[#ff3e00] px-3 py-1.5 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>IMPORT AUDIO</span>
          </button>

          <button
            onClick={handleLoadDemoLongAudio}
            className="font-space text-xs font-bold bg-[rgba(255,62,0,0.1)] hover:bg-[#ff3e00] hover:text-black text-[#ff3e00] border border-[#ff3e00]/40 px-3 py-1.5 transition-all"
            title="Load a 72-minute live festival set demo to test scrubbing, hits, and clipping"
          >
            <span>72-MIN SET DEMO</span>
          </button>
        </div>
      </header>

      {/* 2. Main Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                CLICK TO JUMP ANYWHERE • ◆ YELLOW DIAMONDS = AUTO-DETECTED DROPS & HITS
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

              {/* Suggested Hit Points (Yellow Diamonds) */}
              {suggestedHits.map((hit) => {
                const pos = Math.min(100, (hit.time / Math.max(1, duration)) * 100);
                return (
                  <div
                    key={hit.id}
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-15 pointer-events-none opacity-85"
                    style={{ left: `${pos}%` }}
                  >
                    <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-amber-400 rotate-45 shadow" />
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
                  Sub-second accuracy for aligning drops and hooks
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

              {/* Suggested Hits inside zoom scrubber */}
              {suggestedHits.map((hit) => {
                const pos = (hit.time / Math.max(1, duration)) * 100;
                return (
                  <div
                    key={hit.id}
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-15 pointer-events-none"
                    style={{ left: `${pos}%` }}
                  >
                    <div className="bg-amber-400 text-black font-space text-[8px] font-black px-1 absolute top-0 -translate-x-1/2">
                      DROP
                    </div>
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

            {/* Marking Actions Row + Beat Detection Snapping */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSetMarkInCurrent}
                  className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] text-black px-3.5 py-1.5 active:scale-95 transition-all shadow"
                >
                  [ MARK IN: {formatLongTime(markIn, true)}
                </button>

                <button
                  onClick={handleSetMarkOutCurrent}
                  className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] text-black px-3.5 py-1.5 active:scale-95 transition-all shadow"
                >
                  ] MARK OUT: {formatLongTime(markOut, true)}
                </button>

                <button
                  onClick={handleAddMarkedClip}
                  className="font-space text-xs font-bold bg-white hover:bg-white/90 text-black px-4 py-1.5 active:scale-95 transition-all shadow"
                >
                  + ADD MARKED PART ({Math.max(0, markOut - markIn).toFixed(1)}s)
                </button>
              </div>

              {/* Automatic Beat Snapping Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={handleScanBeatsAndDrops}
                  className="font-space text-[11px] font-bold bg-amber-400/10 hover:bg-amber-400 hover:text-black text-amber-400 border border-amber-400/40 px-2.5 py-1 transition-colors flex items-center gap-1"
                  title="Scan audio track for transient drops and breakdown hits"
                >
                  <span>⚡</span>
                  <span>AUTO-DETECT DROPS ({suggestedHits.length})</span>
                </button>

                <button
                  onClick={() => handleSnapToNearestHit('in')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 px-2 py-1"
                  title="Snap Mark In to the nearest detected bass drop"
                >
                  SNAP IN ⇥
                </button>

                <button
                  onClick={() => handleSnapToNearestHit('out')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 px-2 py-1"
                  title="Snap Mark Out to the nearest detected transition hit"
                >
                  SNAP OUT ⇤
                </button>
              </div>

              {/* Quick Preset Lengths */}
              <div className="flex items-center gap-1.5">
                <span className="font-space text-[10px] text-[rgba(240,240,240,0.5)] mr-1 uppercase">
                  QUICK:
                </span>
                <button
                  onClick={() => handleAddQuickClip(15, 'Hook Cut')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2 py-1"
                >
                  +15s Hook
                </button>
                <button
                  onClick={() => handleAddQuickClip(30, 'Reel Cut')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2 py-1"
                >
                  +30s Reel
                </button>
                <button
                  onClick={() => handleAddQuickClip(60, 'Full Drop')}
                  className="font-space text-[11px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2 py-1"
                >
                  +60s Drop
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section B & C: 2-Column Technical Edition Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN: Clips List & Formats (7 of 12 columns) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Formats Selector Bar */}
            <section className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[rgba(240,240,240,0.08)]">
                <div>
                  <h3 className="font-syne text-xs font-bold text-white uppercase tracking-wider">
                    TARGET EXPORT FORMAT
                  </h3>
                  <p className="font-space text-[10px] text-[rgba(240,240,240,0.5)]">
                    Default aspect ratios and presets for YouTube, Reels, and TikTok
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex border border-white/15 bg-black p-0.5 font-space text-[10px]">
                    <button
                      onClick={() => setPresetCategory('defaults')}
                      className={`px-2 py-0.5 font-bold transition-colors ${
                        presetCategory === 'defaults'
                          ? 'bg-[#ff3e00] text-black'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      DEFAULTS
                    </button>
                    <button
                      onClick={() => setPresetCategory('saved')}
                      className={`px-2 py-0.5 font-bold transition-colors ${
                        presetCategory === 'saved'
                          ? 'bg-[#ff3e00] text-black'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      SAVED ({savedPresets.length})
                    </button>
                  </div>

                  <button
                    onClick={() => setIsNewPresetOpen(true)}
                    className="font-space text-[10px] font-bold text-[#ff3e00] border border-[#ff3e00]/40 px-2 py-1 hover:bg-[#ff3e00]/10"
                  >
                    + NEW
                  </button>

                  <button
                    onClick={handleApplyFormatToAllClips}
                    className="font-space text-[10px] font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1"
                    title="Apply active preset to all clips"
                  >
                    APPLY ALL
                  </button>
                </div>
              </div>

              {/* Formats Mini Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(presetCategory === 'defaults' ? DEFAULT_FORMAT_PRESETS : savedPresets).map((preset) => {
                  const isSelected = selectedFormatId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedFormatId(preset.id)}
                      className={`p-2.5 bg-[#0b0c0d] border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#ff3e00] bg-[rgba(255,62,0,0.04)]'
                          : 'border-[rgba(240,240,240,0.1)] hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-space text-[9px] bg-white/10 text-white font-bold px-1 py-0.5">
                          {preset.aspectRatio}
                        </span>
                        <span className="font-space text-[9px] text-[#ff3e00] font-bold">
                          {preset.fps} FPS
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-white mt-1 truncate">{preset.name}</h4>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Marked Clips List */}
            <section className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(240,240,240,0.08)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-space text-[10px] uppercase tracking-widest text-[#ff3e00] font-bold">
                      STEP 3
                    </span>
                    <h2 className="font-syne text-sm font-extrabold text-white">
                      MARKED CLIPS ({clips.length})
                    </h2>
                  </div>
                  <p className="font-space text-[10px] text-[rgba(240,240,240,0.5)] mt-0.5">
                    Select a clip to preview its real-time reactivity in the Mini-Visualizer panel
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddAllToBatchQueue}
                    disabled={clips.length === 0}
                    className="font-space text-[11px] font-bold bg-[#ff3e00]/15 hover:bg-[#ff3e00] hover:text-black text-[#ff3e00] border border-[#ff3e00]/40 px-3 py-1.5 transition-colors"
                    title="Send all marked clips to the sequential batch queue"
                  >
                    + QUEUE ALL ({clips.length})
                  </button>
                </div>
              </div>

              {/* Clips List */}
              <div className="space-y-3">
                {clips.map((clip, idx) => {
                  const clipDuration = Math.max(0, clip.endTime - clip.startTime);
                  const estSize = estimateClipFileSize(clipDuration, clip.bitrateBps);
                  const isSelectedForMini = selectedPreviewClipId === clip.id;
                  const isPreviewingSound = previewingClipId === clip.id && isPlaying;

                  return (
                    <div
                      key={clip.id}
                      onClick={() => setSelectedPreviewClipId(clip.id)}
                      className={`p-3.5 bg-[#0b0c0d] border cursor-pointer transition-all ${
                        isSelectedForMini
                          ? 'border-[#ff3e00] ring-1 ring-[#ff3e00]/50'
                          : 'border-[rgba(240,240,240,0.12)] hover:border-white/25'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-space text-[9px] bg-white/10 text-white font-bold px-1.5 py-0.5">
                              PART {idx + 1}
                            </span>
                            <span className="font-space text-[9px] bg-[#00f0ff]/15 text-[#00f0ff] font-bold px-1.5 py-0.5">
                              {clip.aspectRatio}
                            </span>
                            <span className="font-space text-[9px] text-white/50">
                              {clip.fps} FPS • {clip.template}
                            </span>
                            <span className="font-space text-[9px] text-[#ff3e00] font-bold">
                              ~{estSize} MB
                            </span>

                            {isSelectedForMini && (
                              <span className="font-space text-[8px] bg-[#00f0ff] text-black font-extrabold px-1 py-0.2 uppercase">
                                PREVIEWING IN MINI-VIZ
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={clip.name}
                            onChange={(e) => handleUpdateClip(clip.id, { name: e.target.value })}
                            className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#ff3e00] text-xs font-bold text-white focus:outline-none py-0.5"
                          />

                          <div className="font-space text-[10px] text-[rgba(240,240,240,0.5)] mt-1 flex items-center gap-3">
                            <span>
                              Range: <strong className="text-white">{formatLongTime(clip.startTime, true)}</strong> →{' '}
                              <strong className="text-white">{formatLongTime(clip.endTime, true)}</strong>
                            </span>
                            <span className="text-[#ff3e00] font-bold">({clipDuration.toFixed(1)}s)</span>
                          </div>
                        </div>

                        {/* Clip Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {/* Loop / Preview Audio */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePreviewClip(clip);
                            }}
                            className={`font-space text-[10px] font-bold px-2.5 py-1 border transition-all ${
                              isPreviewingSound
                                ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                                : 'bg-white/5 hover:bg-white/10 text-white border-white/15'
                            }`}
                            title="Play audio for this clip"
                          >
                            {isPreviewingSound ? '❚❚ PAUSE' : '▶ LISTEN'}
                          </button>

                          {/* Add to Batch Queue */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToBatchQueue(clip);
                            }}
                            className="font-space text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 px-2.5 py-1"
                            title="Add task to sequential batch queue"
                          >
                            + QUEUE
                          </button>

                          {/* Render Single Clip */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenderSingleClip(clip);
                            }}
                            disabled={isBatchExporting}
                            className="font-space text-[10px] font-bold bg-[#ff3e00] hover:bg-[#ff5722] disabled:opacity-40 text-black px-3 py-1 shadow-sm active:scale-95"
                          >
                            RENDER
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateClip(clip);
                            }}
                            className="text-white/40 hover:text-white p-1 text-xs"
                            title="Duplicate"
                          >
                            ⎘
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClip(clip.id);
                            }}
                            className="text-white/40 hover:text-red-400 p-1 text-xs"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Tabbed Utility Suite (Mini-Visualizer, Batch Queue, Export History, Suggested Hits) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            {/* Utility Tab Switcher */}
            <div className="flex border border-white/15 bg-[#141517] p-1 font-space text-[10px] gap-1">
              <button
                onClick={() => setActiveSidebarTab('preview')}
                className={`flex-1 py-1.5 font-bold transition-colors ${
                  activeSidebarTab === 'preview'
                    ? 'bg-[#ff3e00] text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                ◈ MINI-PREVIEW
              </button>

              <button
                onClick={() => setActiveSidebarTab('queue')}
                className={`flex-1 py-1.5 font-bold transition-colors flex items-center justify-center gap-1 ${
                  activeSidebarTab === 'queue'
                    ? 'bg-[#ff3e00] text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>☷ BATCH QUEUE</span>
                <span className="text-[8px] bg-black/40 px-1 rounded-xs">
                  {batchQueue.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('history')}
                className={`flex-1 py-1.5 font-bold transition-colors flex items-center justify-center gap-1 ${
                  activeSidebarTab === 'history'
                    ? 'bg-[#ff3e00] text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>⏱ VAULT</span>
                <span className="text-[8px] bg-black/40 px-1 rounded-xs">
                  {exportHistory.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('hits')}
                className={`flex-1 py-1.5 font-bold transition-colors flex items-center justify-center gap-1 ${
                  activeSidebarTab === 'hits'
                    ? 'bg-[#ff3e00] text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>◆ HITS</span>
                <span className="text-[8px] bg-black/40 px-1 rounded-xs">
                  {suggestedHits.length}
                </span>
              </button>
            </div>

            {/* Tab 1: Mini-Visualizer Preview Panel */}
            {activeSidebarTab === 'preview' && (
              <div className="flex-1 min-h-[460px]">
                <MiniVisualizerPreview
                  clip={activePreviewClip}
                  baseConfig={config}
                  audioEngine={audioEngine}
                  playbackTime={playbackTime}
                  isPlaying={isPlaying}
                  onTogglePlay={onTogglePlay}
                  bgMedia={bgMedia}
                  logoImage={null}
                />
              </div>
            )}

            {/* Tab 2: Batch Processing Queue */}
            {activeSidebarTab === 'queue' && (
              <div className="flex-1 min-h-[460px]">
                <BatchQueue
                  queue={batchQueue}
                  onRemoveItem={handleRemoveFromBatchQueue}
                  onClearQueue={handleClearBatchQueue}
                  onStartBatchExport={handleStartBatchExport}
                  onCancelBatchExport={handleCancelBatchExport}
                  isBatchExporting={isBatchExporting}
                  currentExportingId={currentExportingTaskId}
                  overallProgress={batchOverallProgress}
                  onDownloadCompletedItem={(item) => {
                    if (item.blobUrl && item.filename) {
                      const a = document.createElement('a');
                      a.href = item.blobUrl;
                      a.download = item.filename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }
                  }}
                  onPreviewItem={(item) => {
                    if (item.blobUrl) {
                      setPreviewModalVideo({
                        isOpen: true,
                        name: item.name,
                        blobUrl: item.blobUrl,
                        sizeMb: item.blobSizeMb || 0,
                        filename: item.filename || 'export.webm'
                      });
                    }
                  }}
                />
              </div>
            )}

            {/* Tab 3: Session Export History Vault */}
            {activeSidebarTab === 'history' && (
              <div className="flex-1 min-h-[460px]">
                <ExportHistoryPanel
                  history={exportHistory}
                  onDownloadItem={handleDownloadHistoryItem}
                  onPreviewItem={handlePreviewHistoryItem}
                  onRemoveItem={handleRemoveHistoryItem}
                  onClearHistory={handleClearHistory}
                />
              </div>
            )}

            {/* Tab 4: Automatic Beat Detection Hits List */}
            {activeSidebarTab === 'hits' && (
              <div className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-4 flex flex-col h-full shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-[rgba(240,240,240,0.08)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-space text-[10px] bg-amber-400 text-black font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
                        AI TRANSIENT
                      </span>
                      <h3 className="font-syne text-sm font-bold text-white tracking-tight">
                        SUGGESTED HIT POINTS & DROPS
                      </h3>
                    </div>
                    <p className="font-space text-[10px] text-[rgba(240,240,240,0.5)] mt-0.5">
                      Sub-bass spikes and rhythm transitions detected in this audio
                    </p>
                  </div>

                  <button
                    onClick={handleScanBeatsAndDrops}
                    className="font-space text-[10px] bg-amber-400/20 text-amber-400 hover:bg-amber-400 hover:text-black font-bold px-2 py-1 transition-colors"
                  >
                    RE-SCAN
                  </button>
                </div>

                <div className="mt-3 flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1">
                  {suggestedHits.map((hit) => (
                    <div
                      key={hit.id}
                      className="p-2.5 bg-[#0b0c0d] border border-amber-400/20 hover:border-amber-400 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-space text-[9px] bg-amber-400/20 text-amber-400 font-bold px-1.5 py-0.5 uppercase">
                            {hit.type}
                          </span>
                          <span className="font-space text-xs font-bold text-white">
                            {formatLongTime(hit.time, true)}
                          </span>
                        </div>
                        <p className="font-space text-[10px] text-white/60 mt-0.5">{hit.label}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSeek(hit.time)}
                          className="font-space text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 border border-white/10"
                        >
                          JUMP
                        </button>
                        <button
                          onClick={() => handleCreateClipFromHit(hit)}
                          className="font-space text-[10px] bg-amber-400 text-black font-bold hover:bg-amber-300 px-2.5 py-1"
                        >
                          + CLIP 30s
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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

      {/* Modal: Video Player Ready / Download Dialog */}
      {previewModalVideo && previewModalVideo.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141517] border border-[#ff3e00] w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-space text-xs bg-[#ff3e00] text-black font-bold px-1.5 py-0.5">
                  SUCCESS
                </span>
                <h3 className="font-syne text-lg font-bold text-white">EXPORT READY</h3>
              </div>
              <button
                onClick={() => setPreviewModalVideo(null)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="font-space text-xs text-[rgba(240,240,240,0.7)]">
                Video clip <strong className="text-white">"{previewModalVideo.name}"</strong> has
                been rendered and saved to your session vault!
              </p>

              {/* Video Preview */}
              <div className="bg-black border border-white/15 aspect-video overflow-hidden flex items-center justify-center">
                <video
                  src={previewModalVideo.blobUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="font-space text-xs text-white/50 flex justify-between">
                <span>FILE: {previewModalVideo.filename}</span>
                <span className="text-[#ff3e00] font-bold">SIZE: {previewModalVideo.sizeMb} MB</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10 font-space text-xs">
              <button
                onClick={() => setPreviewModalVideo(null)}
                className="px-4 py-2 border border-white/20 text-white hover:bg-white/5"
              >
                CLOSE
              </button>
              <a
                href={previewModalVideo.blobUrl}
                download={previewModalVideo.filename}
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
