export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type TemplateId =
  | 'avee_classic'
  | 'trap_nation'
  | 'cyber_horizon'
  | 'phonk_crown'
  | 'neon_box_frame'
  | 'tunnel_portal'
  | 'twin_woofers'
  | 'neon_grid'
  | 'monstercat_bars'
  | 'vinyl_record'
  | 'starburst';

export type OverlayAnimation =
  | 'none'
  | 'beat_pulse'
  | 'fade'
  | 'glitch_shake'
  | 'slide_left'
  | 'slide_right'
  | 'rotate_slow'
  | 'strobe';

export interface CustomOverlayItem {
  id: string;
  type: 'text' | 'image';
  name: string;
  enabled: boolean;

  // Text specific properties
  text?: string;
  fontFamily?: 'Outfit' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'Cinzel' | 'Anton';
  fontSize?: number; // 12 to 120 px
  fontWeight?: 'normal' | 'bold' | '800';
  letterSpacing?: number;

  // Graphic / Image specific
  imageUrl?: string;
  aspectRatio?: number;

  // Visual appearance
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  glowColor?: string;
  glowBlur?: number;
  opacity?: number; // 0 to 1

  // Position & Transform (percentages 0-100)
  x: number;
  y: number;
  scale: number; // 0.2 to 3.0
  rotation: number; // degrees

  // Animation & Dynamics
  animation: OverlayAnimation;
  beatReactionStrength: number; // 0 to 2

  // Timing (appear & disappear with track)
  hasTiming: boolean;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  fadeDuration: number; // in seconds
}

export interface BeatPoint {
  id: string;
  time: number; // in seconds
  intensity: number; // 0.2 to 1.0
  type: 'manual' | 'detected';
}

export type BeatSyncMode = 'hybrid' | 'auto_only' | 'manual_only';
export type BeatSensitivityPreset = 'low' | 'medium' | 'high' | 'hyper' | 'custom';
export type FramingMode = 'fill_crop' | 'fit_blur' | 'contain_letterbox';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? T[P]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export type TransitionEffect =
  | 'none'
  | 'crossfade'
  | 'blur_dissolve'
  | 'wipe_left'
  | 'wipe_right'
  | 'radial_iris'
  | 'glitch_cut';

export interface RunningEdgeLightConfig {
  enabled: boolean;
  color: string;
  secondaryColor?: string;
  speed: number;           // 0.2 to 3.0
  thickness: number;       // 2 to 14 px
  length: number;          // 0.04 to 0.45 perimeter fraction
  glowBlur: number;        // 4 to 45 px
  margin: number;          // 10 to 80 px
  cornerRadius: number;    // 0 to 60 px
  beamCount: 1 | 2 | 4;    // single, dual opposing, or quad corner chasers
  beatBoost: boolean;      // speed surge and bloom flash on beat kicks
  cornerBrackets: boolean; // Avee Player corner accents that ignite when passed
}

export interface VisualizerConfig {
  template: TemplateId;
  aspectRatio: AspectRatio;
  framingMode: FramingMode;
  fps: 30 | 60;
  exportQuality: '1080p' | '720p';

  // Transition Engine
  transitions: {
    enabled: boolean;
    effect: TransitionEffect;
    duration: number; // seconds (0.2 to 1.5)
  };

  // Preview Optimization & Low-Res Performance
  preview: {
    resolution: '1080p' | '720p' | '480p';
    windowSize: 'full' | 'medium' | 'compact';
    fpsCap: 30 | 60;
    reduceGlowOnLowRes: boolean;
  };

  // Audio track metadata & sync
  audio: {
    trackTitle: string;
    artistName: string;
    albumOrSubtitle: string;
    sourceUrl: string;
    duration: number;
    bpm: number;
    syncOffsetMs: number; // Overall audio offset
  };

  // Advanced Beat & Audio Reactive Engine
  beatDetection: {
    syncMode?: BeatSyncMode;
    sensitivityPreset?: BeatSensitivityPreset;
    sensitivity: number;        // 0.5 to 2.5
    subBassThreshold?: number;   // 0.05 to 0.8
    bassBoost: number;          // 1.0 to 3.5
    bassShakeStrength: number;  // 0.0 to 1.0
    smoothing: number;          // 0.1 to 0.95
    decaySpeed?: number;         // 0.82 to 0.98
    frequencyCutoff: number;    // lowpass filter cutoff
    nudgeMs?: number;            // visual nudge forward/backward (-500 to +500 ms)
    manualBeats?: BeatPoint[];   // manual beat points / cue markers
    movementSmoothing?: number;  // smooth motion fluidity (0.1 snappy to 0.95 liquid)
  };

  // Running Glow Light Beam over Frame / Corner Edges
  runningEdgeLight: RunningEdgeLightConfig;

  // Circular / Spectrum Bars
  bars: {
    barCount: number;
    circleRadius: number;
    barWidth: number;
    barMaxHeight: number;
    glowStrength: number;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    waveLines: boolean;
    barCapStyle: 'flat' | 'rounded' | 'diamond';
    innerBars: boolean;
    symmetric: boolean;
  };

  // Center Badge / Logo
  centerBadge: {
    enabled: boolean;
    imageUrl: string;
    badgeText: string;
    shape: 'circle' | 'hexagon' | 'shield';
    size: number;
    borderWidth: number;
    borderColor: string;
    glowColor: string;
    pulseIntensity: number;
    spinSpeed: number;
  };

  // Background
  background: {
    type: 'image' | 'video' | 'gradient';
    mediaUrl: string;
    blur: number;
    brightness: number;
    vignette: number;
    bassZoom: number;
    fitBlurWings?: boolean;
  };

  // Built-in Overlays & Aesthetics
  overlays: {
    particles: boolean;
    particleCount: number;
    particleColor: string;
    particleShape?: 'circle' | 'heart' | 'cube' | 'star';
    particleBurstOnKick: boolean;
    vhsEffect: boolean;
    filmGrain: boolean;
    lightLeak: boolean;
    crtScanlines: boolean;
    watermarkText: string;
    showTimestamp: boolean;
    chromaticAberration: boolean;
    mobileSafeGuides?: boolean;
  };

  // Custom Layered Graphic & Text Overlays
  customOverlays: CustomOverlayItem[];

  // Drag-and-drop / placement positions (percentages 0-100)
  layout: {
    visualizerPos: { x: number; y: number };
    titlePos: { x: number; y: number };
    watermarkPos: { x: number; y: number };
    scale: number;
  };
}

export interface BeatDetectionState {
  isBeat: boolean;
  beatIntensity: number;   // instantaneous kick (0 to 1)
  bassEnergy: number;      // raw bass power
  midEnergy: number;
  highEnergy: number;
  pulseDecay: number;      // smoothed envelope for camera shakes
  bpmEstimate: number;
  isManualHit: boolean;
}

export interface PresetTrack {
  id: string;
  name: string;
  artist: string;
  genre: string;
  bpm: number;
  duration: number;
  url: string;
  videoUrl?: string;
  coverImage?: string;
  initialBeats?: number[]; // pre-calculated beat markers
}

export interface ExportFormatPreset {
  id: string;
  name: string;
  description: string;
  platform: 'tiktok_reels' | 'youtube_hd' | 'instagram_square' | 'portrait_feed' | 'custom';
  aspectRatio: AspectRatio;
  fps: 24 | 30 | 60;
  bitrateBps: number;
  template: TemplateId;
  isSavedCustom?: boolean;
}

export interface AudioClipSegment {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  aspectRatio: AspectRatio;
  template: TemplateId;
  fps: 24 | 30 | 60;
  bitrateBps: number;
  status: 'idle' | 'rendering' | 'completed' | 'error';
  blobUrl?: string;
  fileSizeMb?: number;
  createdAt: number;
}

