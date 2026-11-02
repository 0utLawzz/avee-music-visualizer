import { VisualizerConfig, PresetTrack, DeepPartial } from '../types/visualizer';

export const PRESET_TRACKS: PresetTrack[] = [
  {
    id: 'user_uploaded_ref',
    name: 'My Feet Are on the Ground',
    artist: 'its2kasooo',
    genre: 'Trap / Phonk / Wave',
    bpm: 130,
    duration: 15,
    url: '/assets/aistudio/My_Feet_Are_on_the_Ground_exported_0_cadb4f90.mp4',
    videoUrl: '/assets/aistudio/My_Feet_Are_on_the_Ground_exported_0_cadb4f90.mp4',
    coverImage: ''
  },
  {
    id: 'trap_808_anthem',
    name: 'Midnight Phantom 808',
    artist: 'PulseCraft Lab',
    genre: 'Trap / Bass',
    bpm: 140,
    duration: 30,
    url: 'procedural_trap'
  },
  {
    id: 'cyber_synthwave',
    name: 'Neon Overdrive (128 BPM)',
    artist: 'Vektor Sound',
    genre: 'Synthwave / Electro',
    bpm: 128,
    duration: 30,
    url: 'procedural_synth'
  },
  {
    id: 'edm_festival_drop',
    name: 'Titanium Pulse (Festival Drop)',
    artist: 'Aura Nation',
    genre: 'EDM / Bass House',
    bpm: 128,
    duration: 30,
    url: 'procedural_edm'
  },
  {
    id: 'lofi_sunset',
    name: 'Tokyo Rain Nostalgia',
    artist: 'Komorebi Chill',
    genre: 'Lo-Fi / Chillhop',
    bpm: 84,
    duration: 30,
    url: 'procedural_lofi'
  }
];

export const TEMPLATE_CONFIGS: Record<string, DeepPartial<VisualizerConfig>> = {
  avee_classic: {
    template: 'avee_classic',
    bars: {
      barCount: 120,
      circleRadius: 130,
      barWidth: 3.5,
      barMaxHeight: 180,
      glowStrength: 24,
      primaryColor: '#ff2a55',
      secondaryColor: '#ffffff',
      accentColor: '#38bdf8',
      waveLines: true,
      barCapStyle: 'rounded',
      innerBars: true,
      symmetric: true
    },
    centerBadge: {
      enabled: true,
      imageUrl: '',
      badgeText: 'OUTLAWZ',
      shape: 'circle',
      size: 90,
      borderWidth: 3,
      borderColor: '#ff2a55',
      glowColor: '#ff2a55',
      pulseIntensity: 1.25,
      spinSpeed: 0.2
    },
    overlays: {
      particles: true,
      particleCount: 110,
      particleColor: '#ff4444',
      particleBurstOnKick: true,
      vhsEffect: true,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'Avee Player',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.35,
      bassBoost: 2.2,
      bassShakeStrength: 0.65,
      smoothing: 0.82,
      frequencyCutoff: 160
    },
    background: {
      type: 'image',
      mediaUrl: '',
      blur: 2,
      brightness: 0.85,
      vignette: 0.6,
      bassZoom: 1.15
    }
  },

  trap_nation: {
    template: 'trap_nation',
    bars: {
      barCount: 160,
      circleRadius: 150,
      barWidth: 4,
      barMaxHeight: 220,
      glowStrength: 32,
      primaryColor: '#e11d48',
      secondaryColor: '#f97316',
      accentColor: '#fbbf24',
      waveLines: false,
      barCapStyle: 'diamond',
      innerBars: false,
      symmetric: false
    },
    centerBadge: {
      enabled: true,
      imageUrl: '',
      badgeText: 'TRAP BASS',
      shape: 'circle',
      size: 110,
      borderWidth: 4,
      borderColor: '#ffffff',
      glowColor: '#e11d48',
      pulseIntensity: 1.4,
      spinSpeed: 0
    },
    overlays: {
      particles: true,
      particleCount: 160,
      particleColor: '#f43f5e',
      particleBurstOnKick: true,
      vhsEffect: false,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'NATION',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.4,
      bassBoost: 2.5,
      bassShakeStrength: 0.85,
      smoothing: 0.78,
      frequencyCutoff: 140
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 0,
      brightness: 0.9,
      vignette: 0.7,
      bassZoom: 1.2
    }
  },

  cyber_horizon: {
    template: 'cyber_horizon',
    bars: {
      barCount: 96,
      circleRadius: 0,
      barWidth: 5,
      barMaxHeight: 180,
      glowStrength: 30,
      primaryColor: '#2dd4bf',
      secondaryColor: '#06b6d4',
      accentColor: '#ffffff',
      waveLines: true,
      barCapStyle: 'rounded',
      innerBars: false,
      symmetric: true
    },
    centerBadge: {
      enabled: false,
      imageUrl: '',
      badgeText: '',
      shape: 'shield',
      size: 90,
      borderWidth: 2,
      borderColor: '#2dd4bf',
      glowColor: '#06b6d4',
      pulseIntensity: 1.1,
      spinSpeed: 0
    },
    overlays: {
      particles: true,
      particleCount: 80,
      particleColor: '#2dd4bf',
      particleShape: 'circle',
      particleBurstOnKick: true,
      vhsEffect: true,
      filmGrain: false,
      lightLeak: false,
      crtScanlines: true,
      watermarkText: 'CYBER·HORIZON',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.35,
      bassBoost: 2.2,
      bassShakeStrength: 0.5,
      smoothing: 0.8,
      frequencyCutoff: 170
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 0,
      brightness: 0.85,
      vignette: 0.75,
      bassZoom: 1.12
    }
  },

  phonk_crown: {
    template: 'phonk_crown',
    bars: {
      barCount: 140,
      circleRadius: 140,
      barWidth: 4,
      barMaxHeight: 230,
      glowStrength: 35,
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      accentColor: '#22c55e',
      waveLines: true,
      barCapStyle: 'diamond',
      innerBars: true,
      symmetric: true
    },
    centerBadge: {
      enabled: true,
      imageUrl: '',
      badgeText: 'PHONK',
      shape: 'shield',
      size: 110,
      borderWidth: 4,
      borderColor: '#60a5fa',
      glowColor: '#3b82f6',
      pulseIntensity: 1.45,
      spinSpeed: 0.15
    },
    overlays: {
      particles: true,
      particleCount: 120,
      particleColor: '#60a5fa',
      particleShape: 'circle',
      particleBurstOnKick: true,
      vhsEffect: false,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'PHONK DRIFT',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.5,
      bassBoost: 2.7,
      bassShakeStrength: 0.95,
      smoothing: 0.75,
      frequencyCutoff: 130
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 2,
      brightness: 0.8,
      vignette: 0.85,
      bassZoom: 1.25
    }
  },

  neon_box_frame: {
    template: 'neon_box_frame',
    bars: {
      barCount: 100,
      circleRadius: 0,
      barWidth: 4,
      barMaxHeight: 140,
      glowStrength: 28,
      primaryColor: '#38bdf8',
      secondaryColor: '#ffffff',
      accentColor: '#06b6d4',
      waveLines: true,
      barCapStyle: 'flat',
      innerBars: false,
      symmetric: true
    },
    centerBadge: {
      enabled: false,
      imageUrl: '',
      badgeText: 'FALLING',
      shape: 'circle',
      size: 70,
      borderWidth: 2,
      borderColor: '#38bdf8',
      glowColor: '#38bdf8',
      pulseIntensity: 1.1,
      spinSpeed: 0
    },
    overlays: {
      particles: true,
      particleCount: 65,
      particleColor: '#38bdf8',
      particleShape: 'heart',
      particleBurstOnKick: true,
      vhsEffect: true,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'Avee Box Player',
      showTimestamp: true,
      chromaticAberration: false
    },
    beatDetection: {
      sensitivity: 1.25,
      bassBoost: 2.0,
      bassShakeStrength: 0.45,
      smoothing: 0.84,
      frequencyCutoff: 160
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 3,
      brightness: 0.75,
      vignette: 0.7,
      bassZoom: 1.1
    }
  },

  tunnel_portal: {
    template: 'tunnel_portal',
    bars: {
      barCount: 80,
      circleRadius: 0,
      barWidth: 5,
      barMaxHeight: 160,
      glowStrength: 32,
      primaryColor: '#0ea5e9',
      secondaryColor: '#6366f1',
      accentColor: '#38bdf8',
      waveLines: true,
      barCapStyle: 'rounded',
      innerBars: false,
      symmetric: true
    },
    centerBadge: {
      enabled: false,
      imageUrl: '',
      badgeText: '',
      shape: 'circle',
      size: 80,
      borderWidth: 2,
      borderColor: '#0ea5e9',
      glowColor: '#6366f1',
      pulseIntensity: 1.2,
      spinSpeed: 0
    },
    overlays: {
      particles: true,
      particleCount: 90,
      particleColor: '#bae6fd',
      particleShape: 'cube',
      particleBurstOnKick: true,
      vhsEffect: false,
      filmGrain: true,
      lightLeak: false,
      crtScanlines: false,
      watermarkText: 'WARP PORTAL',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.4,
      bassBoost: 2.3,
      bassShakeStrength: 0.7,
      smoothing: 0.79,
      frequencyCutoff: 150
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 1,
      brightness: 0.8,
      vignette: 0.8,
      bassZoom: 1.2
    }
  },

  twin_woofers: {
    template: 'twin_woofers',
    bars: {
      barCount: 72,
      circleRadius: 110,
      barWidth: 4,
      barMaxHeight: 190,
      glowStrength: 34,
      primaryColor: '#ef4444',
      secondaryColor: '#f97316',
      accentColor: '#ffffff',
      waveLines: true,
      barCapStyle: 'diamond',
      innerBars: true,
      symmetric: false
    },
    centerBadge: {
      enabled: false,
      imageUrl: '',
      badgeText: '',
      shape: 'circle',
      size: 90,
      borderWidth: 3,
      borderColor: '#ef4444',
      glowColor: '#f97316',
      pulseIntensity: 1.4,
      spinSpeed: 0
    },
    overlays: {
      particles: true,
      particleCount: 85,
      particleColor: '#ef4444',
      particleShape: 'heart',
      particleBurstOnKick: true,
      vhsEffect: true,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'TWIN 808 WOOFERS',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.55,
      bassBoost: 2.8,
      bassShakeStrength: 1.0,
      smoothing: 0.74,
      frequencyCutoff: 120
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 2,
      brightness: 0.82,
      vignette: 0.85,
      bassZoom: 1.28
    }
  },

  neon_grid: {
    template: 'neon_grid',
    bars: {
      barCount: 96,
      circleRadius: 120,
      barWidth: 4,
      barMaxHeight: 160,
      glowStrength: 28,
      primaryColor: '#06b6d4',
      secondaryColor: '#d946ef',
      accentColor: '#3b82f6',
      waveLines: true,
      barCapStyle: 'rounded',
      innerBars: true,
      symmetric: true
    },
    centerBadge: {
      enabled: true,
      imageUrl: '',
      badgeText: 'CYBER',
      shape: 'hexagon',
      size: 85,
      borderWidth: 3,
      borderColor: '#06b6d4',
      glowColor: '#d946ef',
      pulseIntensity: 1.2,
      spinSpeed: 0.4
    },
    overlays: {
      particles: true,
      particleCount: 90,
      particleColor: '#06b6d4',
      particleBurstOnKick: true,
      vhsEffect: true,
      filmGrain: false,
      lightLeak: false,
      crtScanlines: true,
      watermarkText: 'CYBER·GRID',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.25,
      bassBoost: 2.0,
      bassShakeStrength: 0.5,
      smoothing: 0.85,
      frequencyCutoff: 180
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 0,
      brightness: 0.8,
      vignette: 0.65,
      bassZoom: 1.1
    }
  },

  monstercat_bars: {
    template: 'monstercat_bars',
    bars: {
      barCount: 84,
      circleRadius: 0,
      barWidth: 8,
      barMaxHeight: 280,
      glowStrength: 20,
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      accentColor: '#34d399',
      waveLines: false,
      barCapStyle: 'flat',
      innerBars: false,
      symmetric: true
    },
    centerBadge: {
      enabled: false,
      imageUrl: '',
      badgeText: '',
      shape: 'circle',
      size: 70,
      borderWidth: 2,
      borderColor: '#10b981',
      glowColor: '#10b981',
      pulseIntensity: 1.1,
      spinSpeed: 0
    },
    overlays: {
      particles: true,
      particleCount: 75,
      particleColor: '#34d399',
      particleBurstOnKick: false,
      vhsEffect: false,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'ARENA VISUALS',
      showTimestamp: true,
      chromaticAberration: false
    },
    beatDetection: {
      sensitivity: 1.2,
      bassBoost: 1.8,
      bassShakeStrength: 0.35,
      smoothing: 0.88,
      frequencyCutoff: 150
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 0,
      brightness: 0.85,
      vignette: 0.5,
      bassZoom: 1.08
    }
  },

  vinyl_record: {
    template: 'vinyl_record',
    bars: {
      barCount: 140,
      circleRadius: 175,
      barWidth: 2.5,
      barMaxHeight: 110,
      glowStrength: 15,
      primaryColor: '#f59e0b',
      secondaryColor: '#f97316',
      accentColor: '#fbbf24',
      waveLines: true,
      barCapStyle: 'rounded',
      innerBars: false,
      symmetric: true
    },
    centerBadge: {
      enabled: true,
      imageUrl: '',
      badgeText: 'VINYL 33⅓',
      shape: 'circle',
      size: 95,
      borderWidth: 2,
      borderColor: '#f59e0b',
      glowColor: '#f59e0b',
      pulseIntensity: 1.12,
      spinSpeed: 0.8
    },
    overlays: {
      particles: true,
      particleCount: 50,
      particleColor: '#fde68a',
      particleBurstOnKick: false,
      vhsEffect: true,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'LO-FI CHILL',
      showTimestamp: true,
      chromaticAberration: false
    },
    beatDetection: {
      sensitivity: 1.1,
      bassBoost: 1.5,
      bassShakeStrength: 0.25,
      smoothing: 0.9,
      frequencyCutoff: 200
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 4,
      brightness: 0.75,
      vignette: 0.8,
      bassZoom: 1.05
    }
  },

  starburst: {
    template: 'starburst',
    bars: {
      barCount: 180,
      circleRadius: 100,
      barWidth: 2.5,
      barMaxHeight: 260,
      glowStrength: 35,
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      accentColor: '#38bdf8',
      waveLines: true,
      barCapStyle: 'diamond',
      innerBars: true,
      symmetric: false
    },
    centerBadge: {
      enabled: true,
      imageUrl: '',
      badgeText: 'SUPERNOVA',
      shape: 'circle',
      size: 80,
      borderWidth: 3,
      borderColor: '#a855f7',
      glowColor: '#ec4899',
      pulseIntensity: 1.35,
      spinSpeed: -0.3
    },
    overlays: {
      particles: true,
      particleCount: 180,
      particleColor: '#c084fc',
      particleBurstOnKick: true,
      vhsEffect: false,
      filmGrain: true,
      lightLeak: true,
      crtScanlines: false,
      watermarkText: 'NOVA FX',
      showTimestamp: true,
      chromaticAberration: true
    },
    beatDetection: {
      sensitivity: 1.45,
      bassBoost: 2.4,
      bassShakeStrength: 0.75,
      smoothing: 0.8,
      frequencyCutoff: 150
    },
    background: {
      type: 'gradient',
      mediaUrl: '',
      blur: 0,
      brightness: 0.8,
      vignette: 0.75,
      bassZoom: 1.22
    }
  }
};

export const DEFAULT_CONFIG: VisualizerConfig = {
  template: 'avee_classic',
  aspectRatio: '16:9',
  framingMode: 'fit_blur',
  fps: 60,
  exportQuality: '1080p',

  transitions: {
    enabled: true,
    effect: 'blur_dissolve',
    duration: 0.6
  },

  preview: {
    resolution: '720p', // Default to balanced 720p to prevent PC hang/lag!
    windowSize: 'full',
    fpsCap: 60,
    reduceGlowOnLowRes: true
  },

  audio: {
    trackTitle: 'My Feet Are on the Ground',
    artistName: 'its2kasooo',
    albumOrSubtitle: 'Avee Player / OutLawz Remix',
    sourceUrl: '/assets/aistudio/My_Feet_Are_on_the_Ground_exported_0_cadb4f90.mp4',
    duration: 15,
    bpm: 130,
    syncOffsetMs: 0
  },

  beatDetection: {
    syncMode: 'hybrid',
    sensitivityPreset: 'medium',
    sensitivity: 1.35,
    subBassThreshold: 0.15,
    bassBoost: 2.2,
    bassShakeStrength: 0.65,
    smoothing: 0.82,
    decaySpeed: 0.88,
    frequencyCutoff: 160,
    nudgeMs: 0,
    manualBeats: [
      { id: 'b_0', time: 0.0, intensity: 1.0, type: 'manual' },
      { id: 'b_1', time: 0.46, intensity: 0.8, type: 'manual' },
      { id: 'b_2', time: 0.92, intensity: 1.0, type: 'manual' },
      { id: 'b_3', time: 1.38, intensity: 0.8, type: 'manual' },
      { id: 'b_4', time: 1.84, intensity: 1.0, type: 'manual' },
      { id: 'b_5', time: 2.30, intensity: 0.8, type: 'manual' },
      { id: 'b_6', time: 2.76, intensity: 1.0, type: 'manual' },
      { id: 'b_7', time: 3.23, intensity: 0.8, type: 'manual' },
      { id: 'b_8', time: 3.69, intensity: 1.0, type: 'manual' },
      { id: 'b_9', time: 4.15, intensity: 0.8, type: 'manual' },
      { id: 'b_10', time: 4.61, intensity: 1.0, type: 'manual' },
      { id: 'b_11', time: 5.07, intensity: 0.8, type: 'manual' },
      { id: 'b_12', time: 5.53, intensity: 1.0, type: 'manual' },
      { id: 'b_13', time: 6.00, intensity: 1.0, type: 'manual' },
      { id: 'b_14', time: 6.46, intensity: 1.0, type: 'manual' },
      { id: 'b_15', time: 6.92, intensity: 1.0, type: 'manual' },
      { id: 'b_16', time: 7.38, intensity: 1.0, type: 'manual' },
      { id: 'b_17', time: 7.84, intensity: 1.0, type: 'manual' },
      { id: 'b_18', time: 8.30, intensity: 1.0, type: 'manual' },
      { id: 'b_19', time: 8.76, intensity: 1.0, type: 'manual' },
      { id: 'b_20', time: 9.23, intensity: 1.0, type: 'manual' }
    ]
  },

  bars: {
    barCount: 120,
    circleRadius: 130,
    barWidth: 3.5,
    barMaxHeight: 180,
    glowStrength: 24,
    primaryColor: '#ff2a55',
    secondaryColor: '#ffffff',
    accentColor: '#38bdf8',
    waveLines: true,
    barCapStyle: 'rounded',
    innerBars: true,
    symmetric: true
  },

  centerBadge: {
    enabled: true,
    imageUrl: '',
    badgeText: 'OUTLAWZ',
    shape: 'circle',
    size: 90,
    borderWidth: 3,
    borderColor: '#ff2a55',
    glowColor: '#ff2a55',
    pulseIntensity: 1.25,
    spinSpeed: 0.2
  },

  background: {
    type: 'video',
    mediaUrl: '/assets/aistudio/My_Feet_Are_on_the_Ground_exported_0_cadb4f90.mp4',
    blur: 0,
    brightness: 0.85,
    vignette: 0.6,
    bassZoom: 1.15,
    fitBlurWings: true
  },

  overlays: {
    particles: true,
    particleCount: 110,
    particleColor: '#ff3b5c',
    particleBurstOnKick: true,
    vhsEffect: true,
    filmGrain: true,
    lightLeak: true,
    crtScanlines: false,
    watermarkText: 'Avee Player',
    showTimestamp: true,
    chromaticAberration: true,
    mobileSafeGuides: false
  },

  customOverlays: [
    {
      id: 'ov_title_top',
      type: 'text',
      name: 'Top Header Branding',
      enabled: true,
      text: 'OUTLAWZ BASS',
      fontFamily: 'Outfit',
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: 4,
      color: '#ffffff',
      glowColor: '#ff2a55',
      glowBlur: 14,
      opacity: 0.95,
      x: 50,
      y: 12,
      scale: 1.0,
      rotation: 0,
      animation: 'beat_pulse',
      beatReactionStrength: 1.3,
      hasTiming: false,
      startTime: 0,
      endTime: 15,
      fadeDuration: 0.4
    },
    {
      id: 'ov_drop_cue',
      type: 'text',
      name: 'Phonk Drop Callout',
      enabled: true,
      text: 'BASS DROP',
      fontFamily: 'Outfit',
      fontSize: 48,
      fontWeight: '800',
      letterSpacing: 6,
      color: '#ff2a55',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      glowColor: '#ff0033',
      glowBlur: 25,
      opacity: 1.0,
      x: 50,
      y: 72,
      scale: 1.1,
      rotation: -2,
      animation: 'glitch_shake',
      beatReactionStrength: 1.8,
      hasTiming: true,
      startTime: 5.5,
      endTime: 9.5,
      fadeDuration: 0.3
    },
    {
      id: 'ov_watermark_handle',
      type: 'text',
      name: 'Artist Watermark',
      enabled: true,
      text: '@its2kasooo · OUTLAWZ MEDIA',
      fontFamily: 'JetBrains Mono',
      fontSize: 13,
      fontWeight: 'bold',
      letterSpacing: 2,
      color: '#38bdf8',
      glowColor: '#0284c7',
      glowBlur: 8,
      opacity: 0.85,
      x: 84,
      y: 92,
      scale: 1.0,
      rotation: 0,
      animation: 'fade',
      beatReactionStrength: 0.5,
      hasTiming: false,
      startTime: 0,
      endTime: 15,
      fadeDuration: 0.5
    }
  ],

  layout: {
    visualizerPos: { x: 50, y: 50 },
    titlePos: { x: 12, y: 88 },
    watermarkPos: { x: 12, y: 82 },
    scale: 1.0
  }
};

