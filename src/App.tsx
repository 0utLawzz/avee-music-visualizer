/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { CanvasStage } from './components/CanvasStage';
import { TemplatePicker } from './components/TemplatePicker';
import { VisualizerControls } from './components/VisualizerControls';
import { BeatSyncPanel } from './components/BeatSyncPanel';
import { OverlayControls } from './components/OverlayControls';
import { TrackSelector } from './components/TrackSelector';
import { ExportModal } from './components/ExportModal';
import { RepoMetaModal } from './components/RepoMetaModal';
import { LongAudioClipperPage } from './components/LongAudioClipperPage';

import { VisualizerConfig, BeatDetectionState, PresetTrack, TemplateId } from './types/visualizer';
import { DEFAULT_CONFIG, TEMPLATE_CONFIGS, PRESET_TRACKS } from './constants/presets';
import { AudioEngine } from './services/audioEngine';
import { VisualizerRenderer } from './services/visualizerRenderer';
import { VideoExporter } from './services/videoExporter';

export default function App() {
  // Top-level view mode: Live Canvas Studio vs 60M+ Long Audio Clipper
  const [currentView, setCurrentView] = useState<'studio' | 'clipper'>('studio');

  // Studio navigation tab
  const [activeTab, setActiveTab] = useState<'templates' | 'visuals' | 'sync' | 'overlays' | 'audio'>('templates');

  // Main visualizer state
  const [config, setConfig] = useState<VisualizerConfig>(DEFAULT_CONFIG);

  // Metadata / Documentation modal state
  const [isRepoMetaOpen, setIsRepoMetaOpen] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15);
  const [currentTrackId, setCurrentTrackId] = useState<string>('user_uploaded_ref');

  // Beat & Audio analysis buffers
  const [beatState, setBeatState] = useState<BeatDetectionState>({
    isBeat: false,
    beatIntensity: 0,
    bassEnergy: 0,
    midEnergy: 0,
    highEnergy: 0,
    pulseDecay: 0,
    bpmEstimate: 130,
    isManualHit: false
  });

  const [freqData, setFreqData] = useState<Uint8Array>(() => new Uint8Array(512));
  const [timeData, setTimeData] = useState<Uint8Array>(() => new Uint8Array(512).fill(128));

  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportElapsed, setExportElapsed] = useState(0);
  const [exportTotalDuration, setExportTotalDuration] = useState(15);
  const [completedBlob, setCompletedBlob] = useState<Blob | null>(null);

  // Media elements and references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoMediaRef = useRef<HTMLVideoElement | null>(null);
  const audioMediaRef = useRef<HTMLAudioElement | null>(null);

  const [bgMedia, setBgMedia] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  // Singletons
  const audioEngine = useMemo(() => new AudioEngine(), []);
  const renderer = useMemo(() => new VisualizerRenderer(), []);
  const videoExporter = useMemo(() => new VideoExporter(), []);

  // Initialize reference video background
  useEffect(() => {
    const video = document.createElement('video');
    video.src = '/assets/aistudio/My_Feet_Are_on_the_Ground_exported_0_cadb4f90.mp4';
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = false;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      setDuration(video.duration || 15);
      setBgMedia(video);
      videoMediaRef.current = video;
      audioEngine.attachMediaElement(video);
    };

    return () => {
      video.pause();
      video.src = '';
    };
  }, [audioEngine]);

  // Audio analysis & playback timer tick
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const { freqData: newFreq, timeData: newTime, beatState: newBeat } = audioEngine.analyze(
        config.beatDetection.sensitivity,
        config.beatDetection.bassBoost,
        config.beatDetection.smoothing,
        playbackTime,
        config.beatDetection.manualBeats || [],
        config.beatDetection.syncMode || 'hybrid',
        config.beatDetection.nudgeMs || 0,
        config.beatDetection.subBassThreshold || 0.15,
        config.beatDetection.decaySpeed || 0.88
      );

      setFreqData(newFreq);
      setTimeData(newTime);
      setBeatState(newBeat);

      // Track playback time
      if (videoMediaRef.current && !videoMediaRef.current.paused) {
        setPlaybackTime(videoMediaRef.current.currentTime);
      } else if (audioMediaRef.current && !audioMediaRef.current.paused) {
        setPlaybackTime(audioMediaRef.current.currentTime);
      } else if (currentTrackId.startsWith('procedural_') && isPlaying) {
        setPlaybackTime(audioEngine.getProceduralCurrentTime());
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [audioEngine, config.beatDetection, currentTrackId, isPlaying]);

  // Transport toggle play/pause
  const handleTogglePlay = useCallback(async () => {
    await audioEngine.init();

    if (currentTrackId.startsWith('procedural_')) {
      if (isPlaying) {
        audioEngine.pauseProcedural();
        setIsPlaying(false);
      } else {
        await audioEngine.playProcedural(currentTrackId, true);
        setIsPlaying(true);
      }
      return;
    }

    const media = videoMediaRef.current || audioMediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      audioEngine.attachMediaElement(media);
      try {
        await media.play();
        setIsPlaying(true);
      } catch {
        // Fallback or user gesture
      }
    }
  }, [audioEngine, currentTrackId, isPlaying]);

  // Seek
  const handleSeek = (time: number) => {
    setPlaybackTime(time);
    if (videoMediaRef.current) {
      videoMediaRef.current.currentTime = time;
    }
    if (audioMediaRef.current) {
      audioMediaRef.current.currentTime = time;
    }
  };

  // Transition Engine Trigger
  const handleTriggerTransition = useCallback(() => {
    if (canvasRef.current && (config.transitions?.enabled ?? true)) {
      renderer.triggerTransition(
        canvasRef.current,
        config.transitions?.effect || 'blur_dissolve',
        config.transitions?.duration || 0.6
      );
    }
  }, [config.transitions, renderer]);

  // Select Template Preset
  const handleSelectTemplate = (templateId: TemplateId) => {
    handleTriggerTransition();
    const tplConfig = TEMPLATE_CONFIGS[templateId];
    if (tplConfig) {
      setConfig((prev) => ({
        ...prev,
        template: tplConfig.template || templateId,
        bars: { ...prev.bars, ...(tplConfig.bars as any) },
        centerBadge: { ...prev.centerBadge, ...(tplConfig.centerBadge as any) },
        background: { ...prev.background, ...(tplConfig.background as any) },
        overlays: { ...prev.overlays, ...(tplConfig.overlays as any) },
        beatDetection: { ...prev.beatDetection, ...(tplConfig.beatDetection as any) },
        audio: prev.audio,
        layout: prev.layout,
        customOverlays: prev.customOverlays
      }));
    }
  };

  // Select Track Preset
  const handleSelectPresetTrack = async (track: PresetTrack) => {
    handleTriggerTransition();
    setCurrentTrackId(track.id);
    setPlaybackTime(0);

    // Stop existing playback
    if (videoMediaRef.current) videoMediaRef.current.pause();
    if (audioMediaRef.current) audioMediaRef.current.pause();
    audioEngine.stopProcedural();

    setConfig((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        trackTitle: track.name,
        artistName: track.artist,
        bpm: track.bpm,
        duration: track.duration,
        sourceUrl: track.url
      }
    }));
    setDuration(track.duration);

    await audioEngine.init();

    if (track.url.startsWith('procedural_')) {
      await audioEngine.playProcedural(track.url, true);
      setIsPlaying(true);
    } else if (track.id === 'user_uploaded_ref' && videoMediaRef.current) {
      audioEngine.attachMediaElement(videoMediaRef.current);
      videoMediaRef.current.currentTime = 0;
      await videoMediaRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle Upload of custom song / audio file
  const handleUploadAudio = async (file: File) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = 'anonymous';

    audio.onloadedmetadata = async () => {
      setDuration(audio.duration || 30);
      audioMediaRef.current = audio;
      setCurrentTrackId(`custom_${Date.now()}`);

      // Strip file extension for title
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(' - ');
      const artist = parts.length > 1 ? parts[0] : 'Artist';
      const title = parts.length > 1 ? parts.slice(1).join(' - ') : cleanName;

      setConfig((prev) => ({
        ...prev,
        audio: {
          ...prev.audio,
          trackTitle: title,
          artistName: artist,
          duration: audio.duration || 30,
          sourceUrl: url
        }
      }));

      await audioEngine.init();
      audioEngine.attachMediaElement(audio);
      await audio.play();
      setIsPlaying(true);
    };
  };

  // Handle Drag-and-drop file onto stage (audio, image, or video)
  const handleFileDrop = (file: File) => {
    if (file.type.startsWith('audio/')) {
      handleUploadAudio(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.onloadedmetadata = async () => {
        setDuration(video.duration || 30);
        setBgMedia(video);
        videoMediaRef.current = video;
        setConfig((prev) => ({
          ...prev,
          background: { ...prev.background, type: 'video', mediaUrl: url }
        }));
        await audioEngine.init();
        audioEngine.attachMediaElement(video);
        await video.play();
        setIsPlaying(true);
      };
    } else if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setBgMedia(img);
        setConfig((prev) => ({
          ...prev,
          background: { ...prev.background, type: 'image', mediaUrl: url }
        }));
      };
    }
  };

  // Upload Custom Logo Image
  const handleUploadLogo = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setLogoImage(img);
      setConfig((prev) => ({
        ...prev,
        centerBadge: { ...prev.centerBadge, enabled: true, imageUrl: url }
      }));
    };
  };

  const handleClearLogo = () => {
    setLogoImage(null);
    setConfig((prev) => ({
      ...prev,
      centerBadge: { ...prev.centerBadge, imageUrl: '' }
    }));
  };

  // Upload Custom Background
  const handleUploadBackground = (file: File) => {
    handleTriggerTransition();
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.onloadedmetadata = () => {
        setBgMedia(video);
        setConfig((prev) => ({
          ...prev,
          background: { ...prev.background, type: 'video', mediaUrl: url }
        }));
        if (isPlaying) video.play().catch(() => {});
      };
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setBgMedia(img);
        setConfig((prev) => ({
          ...prev,
          background: { ...prev.background, type: 'image', mediaUrl: url }
        }));
      };
    }
  };

  // Instant Snapshot Cover Frame
  const handleCaptureSnapshot = () => {
    if (!canvasRef.current) return;
    const cleanTitle = config.audio.trackTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `pulsecraft_${cleanTitle}_cover.png`;
    videoExporter.captureSnapshot(canvasRef.current, filename);
  };

  // Video Export Execution (Full or Selected Time Range)
  const handleStartExport = async (
    startTime: number,
    endTime: number,
    fps: 24 | 30 | 60,
    bitrateBps: number
  ) => {
    if (!canvasRef.current) return;

    const renderDuration = Math.max(0.5, endTime - startTime);

    await audioEngine.init();
    setIsExporting(true);
    setExportProgress(0);
    setExportElapsed(0);
    setExportTotalDuration(renderDuration);
    setCompletedBlob(null);

    // Seek to startTime so audio and visualizer start synchronized at selected range
    handleSeek(startTime);
    if (!isPlaying) {
      handleTogglePlay();
    }

    const audioStream = audioEngine.getStreamDestination()?.stream || null;
    const cleanTitle = config.audio.trackTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const startStr = Math.round(startTime);
    const endStr = Math.round(endTime);
    const filename = `pulsecraft_${cleanTitle}_${config.aspectRatio.replace(':', 'x')}_${fps}fps_${startStr}s_to_${endStr}s.webm`;

    try {
      const blob = await videoExporter.startExport(
        canvasRef.current,
        audioStream,
        {
          durationSeconds: renderDuration,
          fps,
          bitrateBps,
          filename
        },
        (percent, elapsed, total) => {
          setExportProgress(percent);
          setExportElapsed(elapsed);
          setExportTotalDuration(total);
        }
      );

      setCompletedBlob(blob);
      setIsExporting(false);
      videoExporter.downloadBlob(blob, filename);
    } catch {
      setIsExporting(false);
    }
  };

  const handleDownloadCompleted = () => {
    if (completedBlob) {
      const cleanTitle = config.audio.trackTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `pulsecraft_${cleanTitle}_${config.aspectRatio.replace(':', 'x')}.webm`;
      videoExporter.downloadBlob(completedBlob, filename);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const featuredTemplates: { id: TemplateId; name: string; desc: string }[] = [
    {
      id: 'avee_classic',
      name: 'Avee Classic Dual-Wing',
      desc: 'Signature dual-winged spectrum with central badge.'
    },
    {
      id: 'cyber_horizon',
      name: 'Cyber Horizon HUD',
      desc: 'Inverted ceiling & floor spectrum HUD.'
    },
    {
      id: 'phonk_crown',
      name: 'Phonk Reaper Crown',
      desc: 'Spiky waveform ring with crest.'
    },
    {
      id: 'trap_nation',
      name: 'Trap Nation Monolith',
      desc: '360° radial spikes with waves.'
    }
  ];

  const navItems: { id: 'templates' | 'visuals' | 'sync' | 'overlays' | 'audio'; label: string }[] = [
    { id: 'templates', label: 'Templates' },
    { id: 'visuals', label: 'Visualizer FX' },
    { id: 'sync', label: 'Beat & Sync' },
    { id: 'overlays', label: 'Overlays & VHS' },
    { id: 'audio', label: 'Audio & Media' }
  ];

  return (
    <div className="h-screen w-screen bg-[#0b0c0d] text-[#f0f0f0] overflow-hidden flex flex-col font-inter">
      {/* 3-Column Studio Grid or Clipper Full-Width Grid: Left Rail (80px) + Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${
        currentView === 'studio' ? 'lg:grid lg:grid-cols-[80px_340px_1fr]' : 'lg:grid lg:grid-cols-[80px_1fr]'
      }`}>
        {/* 1. Left Rail Nav (.rail) */}
        <nav className="rail hidden lg:flex flex-col items-center py-6 gap-6 bg-black border-r border-[rgba(240,240,240,0.12)] shrink-0 z-30 select-none">
          <div className="font-syne text-2xl font-extrabold text-[#ff3e00] -rotate-90 tracking-wider mb-2 select-none cursor-default">
            PCRFT
          </div>

          {/* Primary View Modes */}
          <div className="flex flex-col items-center gap-2 pb-4 border-b border-[rgba(240,240,240,0.15)] w-full px-3">
            <button
              onClick={() => setCurrentView('studio')}
              title="Live Studio (Canvas Visualizer)"
              className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center transition-all ${
                currentView === 'studio'
                  ? 'bg-[#ff3e00] text-[#0b0c0d] font-bold shadow-lg shadow-[#ff3e00]/20'
                  : 'text-[rgba(240,240,240,0.5)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span className="font-space text-[8px] mt-0.5 font-bold uppercase">STUDIO</span>
            </button>

            <button
              onClick={() => setCurrentView('clipper')}
              title="Long-Form Audio Clipper (60M+)"
              className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                currentView === 'clipper'
                  ? 'bg-[#ff3e00] text-[#0b0c0d] font-bold shadow-lg shadow-[#ff3e00]/20'
                  : 'text-[rgba(240,240,240,0.5)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
                <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
              </svg>
              <span className="font-space text-[8px] mt-0.5 font-bold uppercase">60M+</span>
            </button>
          </div>

          {/* Secondary Studio Drawer Tabs */}
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={() => {
                setCurrentView('studio');
                setActiveTab('templates');
              }}
              title="Templates"
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                currentView === 'studio' && activeTab === 'templates'
                  ? 'bg-[#ff3e00] text-[#0b0c0d]'
                  : 'text-[rgba(240,240,240,0.5)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>

            <button
              onClick={() => {
                setCurrentView('studio');
                setActiveTab('visuals');
              }}
              title="Visualizer FX"
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                currentView === 'studio' && activeTab === 'visuals'
                  ? 'bg-[#ff3e00] text-[#0b0c0d]'
                  : 'text-[rgba(240,240,240,0.5)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </button>

            <button
              onClick={() => {
                setCurrentView('studio');
                setActiveTab('sync');
              }}
              title="Beat & Sync"
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                currentView === 'studio' && activeTab === 'sync'
                  ? 'bg-[#ff3e00] text-[#0b0c0d]'
                  : 'text-[rgba(240,240,240,0.5)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
              </svg>
            </button>

            <button
              onClick={() => {
                setCurrentView('studio');
                setActiveTab('overlays');
              }}
              title="Overlays & VHS"
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                currentView === 'studio' && activeTab === 'overlays'
                  ? 'bg-[#ff3e00] text-[#0b0c0d]'
                  : 'text-[rgba(240,240,240,0.5)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="7" x2="7" y2="7"></line>
                <line x1="2" y1="17" x2="7" y2="17"></line>
                <line x1="17" y1="17" x2="22" y2="17"></line>
                <line x1="17" y1="7" x2="22" y2="7"></line>
              </svg>
            </button>

            <button
              onClick={() => {
                setCurrentView('studio');
                setActiveTab('audio');
              }}
              title="Audio & Media"
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                currentView === 'studio' && activeTab === 'audio'
                  ? 'bg-[#ff3e00] text-[#0b0c0d]'
                  : 'text-[rgba(240,240,240,0.5)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </button>
          </div>
        </nav>

        {/* 2. Sidebar Drawer (aside) - shown in studio view */}
        {currentView === 'studio' && (
          <aside className="border-r border-[rgba(240,240,240,0.12)] bg-[#0b0c0d] flex flex-col h-full overflow-hidden shrink-0 z-20">
          <div className="p-5 px-6 border-b border-[rgba(240,240,240,0.12)]">
            <span className="font-space text-[10px] uppercase tracking-[0.15em] text-[#ff3e00] block mb-1">
              Module.01
            </span>
            <div className="font-syne font-extrabold text-xl tracking-tight text-[#f0f0f0]">
              PULSE CRAFT
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Vertical Navigation Section */}
            <div className="p-5 px-6 border-b border-[rgba(240,240,240,0.12)]">
              <span className="font-space text-[10px] uppercase tracking-[0.15em] text-[#ff3e00] block mb-3">
                Navigation
              </span>
              <nav className="flex flex-col gap-0.5">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`text-left p-3.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'text-[#f0f0f0] bg-[rgba(255,62,0,0.06)] border-l-2 border-[#ff3e00]'
                          : 'text-[rgba(240,240,240,0.5)] hover:text-white border-l-2 border-transparent'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Global FX Transition Engine Card */}
            <div className="p-5 px-6 border-b border-[rgba(240,240,240,0.12)] space-y-3">
              <div>
                <span className="font-space text-[10px] uppercase tracking-[0.15em] text-[#ff3e00] block mb-1">
                  Transition Engine
                </span>
                <h2 className="font-syne text-base font-bold text-[#f0f0f0] tracking-tight">
                  Global FX
                </h2>
                <p className="text-xs text-[rgba(240,240,240,0.5)] leading-relaxed mt-1">
                  Select a dashing audio-reactive template inspired by legendary music channels.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <select
                  value={config.transitions?.effect || 'blur_dissolve'}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      transitions: {
                        ...(p.transitions || { enabled: true, duration: 0.6 }),
                        effect: e.target.value as any
                      }
                    }))
                  }
                  className="w-full bg-[#141517] border border-[rgba(240,240,240,0.12)] text-[#f0f0f0] p-2 font-space text-xs focus:outline-none focus:border-[#ff3e00]"
                >
                  <option value="blur_dissolve">Blur Dissolve</option>
                  <option value="crossfade">Smooth Crossfade</option>
                  <option value="wipe_left">Wipe Left</option>
                  <option value="wipe_right">Wipe Right</option>
                  <option value="radial_iris">Radial Iris</option>
                  <option value="glitch_cut">Glitch Cut</option>
                  <option value="none">Direct Cut (None)</option>
                </select>

                <div>
                  <div className="flex justify-between font-space text-[10px] text-[rgba(240,240,240,0.5)] mb-1">
                    <span>Duration:</span>
                    <span className="text-[#ff3e00] font-bold">
                      {(config.transitions?.duration || 0.6).toFixed(2)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={2.0}
                    step={0.05}
                    value={config.transitions?.duration || 0.6}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        transitions: {
                          ...(p.transitions || { enabled: true, effect: 'blur_dissolve' }),
                          duration: parseFloat(e.target.value)
                        }
                      }))
                    }
                    className="w-full accent-[#ff3e00] h-1.5 bg-[#141517] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Active Tab Detailed Inspector Panel */}
            <div className="flex-1 p-5 px-6">
              {activeTab === 'templates' && (
                <TemplatePicker
                  config={config}
                  onSelectTemplate={handleSelectTemplate}
                  onUpdateConfig={setConfig}
                  onTestTransition={handleTriggerTransition}
                />
              )}

              {activeTab === 'visuals' && (
                <VisualizerControls
                  config={config}
                  onUpdateConfig={setConfig}
                  onUploadLogo={handleUploadLogo}
                  onClearLogo={handleClearLogo}
                  onUploadBackground={handleUploadBackground}
                  hasCustomLogo={!!logoImage}
                  hasCustomBg={!!bgMedia}
                />
              )}

              {activeTab === 'sync' && (
                <BeatSyncPanel
                  config={config}
                  onUpdateConfig={setConfig}
                  beatState={beatState}
                  playbackTime={playbackTime}
                  duration={duration}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'overlays' && (
                <OverlayControls
                  config={config}
                  onUpdateConfig={setConfig}
                  playbackTime={playbackTime}
                  duration={duration}
                />
              )}

              {activeTab === 'audio' && (
                <TrackSelector
                  config={config}
                  onSelectPreset={handleSelectPresetTrack}
                  onUploadAudio={handleUploadAudio}
                  currentTrackId={currentTrackId}
                />
              )}
            </div>

            {/* Bottom Engine Build Tag */}
            <div className="p-4 px-6 mt-auto border-t border-[rgba(240,240,240,0.08)]">
              <span className="font-space text-[10px] text-[rgba(240,240,240,0.3)] tracking-wider">
                Engine Build: v2.4.0
              </span>
            </div>
          </div>
        </aside>
        )}

        {/* 3. Main Viewport: Studio or Long-Form Audio Clipper */}
        {currentView === 'studio' ? (
          <main className="flex flex-col h-full overflow-hidden bg-tech-grid relative">
            {/* Top Header */}
            <Header
              onOpenExport={() => setIsExportModalOpen(true)}
              onCaptureSnapshot={handleCaptureSnapshot}
              onOpenRepoMeta={() => setIsRepoMetaOpen(true)}
              aspectRatio={config.aspectRatio}
              resolution={config.preview?.resolution || '720p'}
              isPlaying={isPlaying}
              currentView={currentView}
              onSwitchView={setCurrentView}
            />

            {/* Viewport Canvas Stage Container */}
            <div className="viewport-container flex-1 m-5 lg:m-7 border border-[rgba(240,240,240,0.12)] bg-black flex flex-col shadow-2xl overflow-hidden min-h-0">
              <CanvasStage
                config={config}
                onUpdateConfig={setConfig}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                playbackTime={playbackTime}
                duration={duration}
                onSeek={handleSeek}
                beatState={beatState}
                renderer={renderer}
                freqData={freqData}
                timeData={timeData}
                bgMedia={bgMedia}
                logoImage={logoImage}
                onFileDrop={handleFileDrop}
                canvasRef={canvasRef}
                onTriggerTransition={handleTriggerTransition}
              />
            </div>

            {/* 4. Bottom Control & Track Transport Panel (.bottom-panel) */}
            <div className="bottom-panel bg-[#141517] border-t border-[rgba(240,240,240,0.12)] p-5 px-8 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 shrink-0 z-20">
              {/* Track Info & Scrubber */}
              <div className="track-info flex items-center gap-5">
                <button
                  onClick={handleTogglePlay}
                  className="play-head w-12 h-12 rounded-sm bg-[#ff3e00] hover:bg-[#ff5722] text-black font-extrabold flex items-center justify-center shrink-0 shadow-lg shadow-[#ff3e00]/25 active:scale-95 transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <span className="text-sm font-black tracking-tighter">❚❚</span>
                  ) : (
                    <span className="text-base font-black ml-0.5">▶</span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-[#f0f0f0] tracking-tight truncate">
                    {config.audio.trackTitle || 'My Feet Are on the Ground'}
                  </div>
                  <div className="font-space text-xs text-[rgba(240,240,240,0.5)] uppercase tracking-wider truncate">
                    BY {config.audio.artistName || 'ITS2KASOOO'}
                  </div>

                  <div className="timeline-container mt-2 flex items-center gap-3">
                    <span className="font-space text-[10px] text-[rgba(240,240,240,0.5)] tabular-nums">
                      {formatTime(playbackTime)}
                    </span>
                    <div className="timeline-track relative flex-1 h-1 bg-[rgba(240,240,240,0.15)] group cursor-pointer flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, duration)}
                        step={0.05}
                        value={playbackTime}
                        onChange={(e) => handleSeek(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className="timeline-progress h-full bg-[#ff3e00] relative"
                        style={{
                          width: `${Math.min(100, (playbackTime / Math.max(1, duration)) * 100)}%`
                        }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white scale-0 group-hover:scale-100 transition-transform shadow" />
                      </div>
                    </div>
                    <span className="font-space text-[10px] text-[rgba(240,240,240,0.5)] tabular-nums">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Template Selector Grid */}
              <div className="template-grid grid grid-cols-2 sm:grid-cols-4 gap-2">
                {featuredTemplates.map((t) => {
                  const isActive = config.template === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`template-card relative p-3 bg-[#0b0c0d] border cursor-pointer transition-all ${
                        isActive
                          ? 'border-[#ff3e00] shadow-sm active'
                          : 'border-[rgba(240,240,240,0.12)] hover:border-[rgba(240,240,240,0.3)]'
                      }`}
                    >
                      {isActive && (
                        <div className="status-pill absolute top-2 right-2 font-space text-[8px] bg-[#ff3e00] text-[#0b0c0d] font-bold px-1.5 py-0.5">
                          CURR
                        </div>
                      )}
                      <h3 className="font-bold text-xs text-[#f0f0f0] mb-1 truncate pr-6">
                        {t.name}
                      </h3>
                      <p className="text-[10px] text-[rgba(240,240,240,0.5)] line-clamp-2 leading-snug">
                        {t.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        ) : (
          /* 60M+ Long Audio Clipper Page */
          <main className="flex flex-col h-full overflow-hidden relative">
            <LongAudioClipperPage
              config={config}
              onUpdateConfig={setConfig}
              audioEngine={audioEngine}
              videoExporter={videoExporter}
              canvasRef={canvasRef}
              bgMedia={bgMedia}
              onSwitchToStudio={() => setCurrentView('studio')}
              playbackTime={playbackTime}
              duration={duration}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onUploadAudioFile={handleUploadAudio}
              audioMediaRef={audioMediaRef}
              videoMediaRef={videoMediaRef}
            />

            {/* Hidden Canvas Stage to preserve canvasRef and WebGL/2D rendering for clip video exporter */}
            <div className="hidden" aria-hidden="true">
              <CanvasStage
                config={config}
                onUpdateConfig={setConfig}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                playbackTime={playbackTime}
                duration={duration}
                onSeek={handleSeek}
                beatState={beatState}
                renderer={renderer}
                freqData={freqData}
                timeData={timeData}
                bgMedia={bgMedia}
                logoImage={logoImage}
                onFileDrop={handleFileDrop}
                canvasRef={canvasRef}
                onTriggerTransition={handleTriggerTransition}
              />
            </div>
          </main>
        )}
      </div>

      {/* High-Quality Video Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => {
          if (!isExporting) {
            setIsExportModalOpen(false);
            setCompletedBlob(null);
          }
        }}
        config={config}
        onUpdateConfig={setConfig}
        onStartExport={handleStartExport}
        onCancelExport={() => {
          videoExporter.cancelExport();
          setIsExporting(false);
        }}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportElapsed={exportElapsed}
        exportTotalDuration={exportTotalDuration}
        completedBlob={completedBlob}
        onDownloadCompleted={handleDownloadCompleted}
        onCaptureSnapshot={handleCaptureSnapshot}
        trackDuration={duration || config.audio.duration || 15}
        currentPlaybackTime={playbackTime}
      />

      {/* GitHub Repo Metadata & Tech Stack Architecture Modal */}
      <RepoMetaModal
        isOpen={isRepoMetaOpen}
        onClose={() => setIsRepoMetaOpen(false)}
      />
    </div>
  );
}
