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

import { VisualizerConfig, BeatDetectionState, PresetTrack, TemplateId } from './types/visualizer';
import { DEFAULT_CONFIG, TEMPLATE_CONFIGS, PRESET_TRACKS } from './constants/presets';
import { AudioEngine } from './services/audioEngine';
import { VisualizerRenderer } from './services/visualizerRenderer';
import { VideoExporter } from './services/videoExporter';

export default function App() {
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

  // Video Export Execution
  const handleStartExport = async (
    durationSeconds: number,
    fps: 30 | 60,
    bitrateBps: number
  ) => {
    if (!canvasRef.current) return;

    await audioEngine.init();
    setIsExporting(true);
    setExportProgress(0);
    setExportElapsed(0);
    setExportTotalDuration(durationSeconds);
    setCompletedBlob(null);

    // Restart playback at beginning for crisp sync
    handleSeek(0);
    if (!isPlaying) {
      handleTogglePlay();
    }

    const audioStream = audioEngine.getStreamDestination()?.stream || null;
    const cleanTitle = config.audio.trackTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `pulsecraft_${cleanTitle}_${config.aspectRatio.replace(':', 'x')}_${fps}fps.webm`;

    try {
      const blob = await videoExporter.startExport(
        canvasRef.current,
        audioStream,
        {
          durationSeconds,
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

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 3-Zone Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportModalOpen(true)}
        onCaptureSnapshot={handleCaptureSnapshot}
        onOpenRepoMeta={() => setIsRepoMetaOpen(true)}
      />

      {/* Main Studio Viewport (Split Layout: Interactive Stage on Top/Left, Control Panel on Bottom/Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Interactive Canvas Stage */}
        <div className="flex-1 flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
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

        {/* Tabbed Studio Controls Sidebar / Drawer */}
        <div className="w-full lg:w-[460px] xl:w-[500px] h-72 lg:h-full bg-slate-950/80 backdrop-blur-md overflow-y-auto shrink-0 flex flex-col">
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
      />

      {/* GitHub Repo Metadata & Tech Stack Architecture Modal */}
      <RepoMetaModal
        isOpen={isRepoMetaOpen}
        onClose={() => setIsRepoMetaOpen(false)}
      />
    </div>
  );
}
