import { ExportFormatPreset, AspectRatio, TemplateId } from '../types/visualizer';

export const DEFAULT_FORMAT_PRESETS: ExportFormatPreset[] = [
  {
    id: 'tiktok_reels_60',
    name: 'TikTok & Reels Viral (9:16)',
    description: '1080x1920 vertical @ 60 FPS • High bitrate • Maximized for mobile feed algorithms',
    platform: 'tiktok_reels',
    aspectRatio: '9:16',
    fps: 60,
    bitrateBps: 12_000_000,
    template: 'phonk_crown'
  },
  {
    id: 'youtube_master_hd',
    name: 'YouTube Master Visualizer (16:9)',
    description: '1920x1080 widescreen @ 60 FPS • Full dynamic range • Classic channel look',
    platform: 'youtube_hd',
    aspectRatio: '16:9',
    fps: 60,
    bitrateBps: 14_000_000,
    template: 'avee_classic'
  },
  {
    id: 'instagram_square_classic',
    name: 'Instagram Square Grid (1:1)',
    description: '1080x1080 square @ 30 FPS • Balanced bass punch • Iconic Avee woofer style',
    platform: 'instagram_square',
    aspectRatio: '1:1',
    fps: 30,
    bitrateBps: 8_000_000,
    template: 'twin_woofers'
  },
  {
    id: 'portrait_feed_social',
    name: 'Portrait Social Feed (4:5)',
    description: '1080x1350 portrait @ 30 FPS • Extra screen estate for feed scrolling',
    platform: 'portrait_feed',
    aspectRatio: '4:5',
    fps: 30,
    bitrateBps: 10_000_000,
    template: 'neon_box_frame'
  },
  {
    id: 'trap_nation_shorts',
    name: 'Trap Pulse Shorts (9:16)',
    description: '1080x1920 vertical @ 60 FPS • Concentrated center bass ring for EDM/Trap hooks',
    platform: 'tiktok_reels',
    aspectRatio: '9:16',
    fps: 60,
    bitrateBps: 12_000_000,
    template: 'trap_nation'
  },
  {
    id: 'cyber_horizon_yt',
    name: 'Cyberwave Landscape (16:9)',
    description: '1920x1080 landscape @ 60 FPS • Neon grid synthwave aesthetic for full tracks',
    platform: 'youtube_hd',
    aspectRatio: '16:9',
    fps: 60,
    bitrateBps: 14_000_000,
    template: 'cyber_horizon'
  }
];

const STORAGE_KEY = 'pulsecraft_saved_formats_v1';

export function loadSavedCustomFormats(): ExportFormatPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load custom format presets from localStorage', err);
    return [];
  }
}

export function saveCustomFormat(format: Omit<ExportFormatPreset, 'id' | 'isSavedCustom'>): ExportFormatPreset {
  const newPreset: ExportFormatPreset = {
    ...format,
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isSavedCustom: true
  };

  try {
    const existing = loadSavedCustomFormats();
    const updated = [newPreset, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom format', err);
  }

  return newPreset;
}

export function deleteSavedCustomFormat(id: string): void {
  try {
    const existing = loadSavedCustomFormats();
    const filtered = existing.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete custom format', err);
  }
}

/**
 * Format seconds into hh:mm:ss.s or mm:ss.s
 * Perfect for 60+ min files
 */
export function formatLongTime(seconds: number, includeSubSeconds = true): string {
  if (isNaN(seconds) || seconds < 0) return includeSubSeconds ? '00:00.0' : '00:00';
  
  const hrs = Math.floor(seconds / 3600);
  const remMin = seconds % 3600;
  const mins = Math.floor(remMin / 60);
  const secs = Math.floor(remMin % 60);
  const tenths = Math.floor((seconds % 1) * 10);

  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const hh = hrs.toString().padStart(2, '0');
    return includeSubSeconds ? `${hh}:${mm}:${ss}.${tenths}` : `${hh}:${mm}:${ss}`;
  }

  return includeSubSeconds ? `${mm}:${ss}.${tenths}` : `${mm}:${ss}`;
}

/**
 * Parse hh:mm:ss, mm:ss, or ss string into total seconds
 */
export function parseTimeStringToSeconds(timeStr: string): number | null {
  const clean = timeStr.trim();
  if (!clean) return null;

  const parts = clean.split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 3) {
    // hh:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

/**
 * Calculate estimated file size in MB
 */
export function estimateClipFileSize(durationSec: number, bitrateBps: number): number {
  const audioBitrateBps = 192000; // ~192 kbps opus/aac
  const totalBitrate = bitrateBps + audioBitrateBps;
  const totalBits = totalBitrate * durationSec;
  const totalBytes = totalBits / 8;
  return parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
}
