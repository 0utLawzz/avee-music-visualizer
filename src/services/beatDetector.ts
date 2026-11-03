import { SuggestedHitPoint } from '../types/visualizer';
import { AudioEngine } from './audioEngine';

export class BeatDetector {
  private lastBassEnergy = 0;
  private energyHistory: number[] = [];
  private maxHistoryLen = 40;

  /**
   * Fast intelligent scan to generate suggested hit points / drops across an audio track.
   * Works smoothly for short or long-form (60+ min) files.
   */
  public generateSuggestedHits(
    duration: number,
    bpm = 128,
    existingHits: number[] = []
  ): SuggestedHitPoint[] {
    const hits: SuggestedHitPoint[] = [];

    // If explicit detected beats already exist, convert highest intensity ones
    if (existingHits && existingHits.length > 0) {
      existingHits.forEach((time, index) => {
        if (time <= duration) {
          hits.push({
            id: `hit_existing_${index}_${Math.round(time)}`,
            time: parseFloat(time.toFixed(2)),
            label: `Detected Hit #${index + 1}`,
            intensity: 0.85,
            type: index % 4 === 0 ? 'drop' : 'kick',
            confidence: 0.92
          });
        }
      });
      return hits.sort((a, b) => a.time - b.time);
    }

    // Algorithmic estimation for electronic / pop / trap / ambient songs & DJ sets
    // In electronic music & DJ mixes, phrases and drops follow 16 / 32 / 64 bar structures
    const secondsPerBeat = 60 / (bpm || 128);
    const secondsPer16Bars = secondsPerBeat * 64; // ~30s at 128bpm
    const secondsPer32Bars = secondsPerBeat * 128; // ~60s at 128bpm

    // Anchor first build & drop
    const firstDrop = Math.min(duration * 0.1, Math.max(15, secondsPer16Bars));
    hits.push({
      id: `hit_drop_1`,
      time: parseFloat(firstDrop.toFixed(1)),
      label: 'Opening Build & Main Drop',
      intensity: 0.95,
      type: 'drop',
      confidence: 0.94
    });

    if (duration > 60) {
      // 1-minute to 15-minute marks
      let currentTime = firstDrop + secondsPer32Bars;
      let counter = 2;

      while (currentTime < duration - 15) {
        const isMajorDrop = counter % 3 === 0;
        const isBreakdown = counter % 2 === 0;

        hits.push({
          id: `hit_sugg_${counter}`,
          time: parseFloat(currentTime.toFixed(1)),
          label: isMajorDrop
            ? `Major Drop #${Math.ceil(counter / 3)}`
            : isBreakdown
            ? `Breakdown Transition`
            : `Bass Hook & Kick`,
          intensity: isMajorDrop ? 0.98 : isBreakdown ? 0.75 : 0.85,
          type: isMajorDrop ? 'drop' : isBreakdown ? 'transition' : 'kick',
          confidence: isMajorDrop ? 0.95 : 0.88
        });

        // Advance phrase: 32 bars or 64 bars
        currentTime += isMajorDrop ? secondsPer32Bars * 1.5 : secondsPer32Bars;
        counter++;
      }
    } else {
      // Short audio (15-60s)
      const mid = duration * 0.5;
      hits.push({
        id: `hit_short_mid`,
        time: parseFloat(mid.toFixed(1)),
        label: 'Peak Energy Chorus',
        intensity: 0.92,
        type: 'drop',
        confidence: 0.9
      });
    }

    return hits.sort((a, b) => a.time - b.time);
  }

  /**
   * Real-time transient spike detection from AnalyserNode frequency data
   */
  public detectRealTimeTransient(
    freqData: Uint8Array,
    playbackTime: number,
    sensitivity = 1.3
  ): SuggestedHitPoint | null {
    if (!freqData || freqData.length < 16) return null;

    // Sub-bass & kick bins (indices 0 to 12 in 512-bin FFT covers 0-500Hz)
    let bassSum = 0;
    const binCount = 12;
    for (let i = 0; i < binCount; i++) {
      bassSum += freqData[i];
    }
    const currentBass = bassSum / (binCount * 255); // 0 to 1

    this.energyHistory.push(currentBass);
    if (this.energyHistory.length > this.maxHistoryLen) {
      this.energyHistory.shift();
    }

    const avg =
      this.energyHistory.reduce((acc, v) => acc + v, 0) /
      Math.max(1, this.energyHistory.length);

    const flux = currentBass - this.lastBassEnergy;
    this.lastBassEnergy = currentBass;

    // Trigger hit if sudden spike exceeds local average by sensitivity factor
    if (currentBass > 0.45 && flux > 0.18 && currentBass > avg * sensitivity) {
      const isBigDrop = currentBass > 0.8 && flux > 0.3;
      return {
        id: `hit_rt_${Date.now()}`,
        time: parseFloat(playbackTime.toFixed(2)),
        label: isBigDrop ? 'Real-Time Peak Drop' : 'Transient Kick Hit',
        intensity: parseFloat(currentBass.toFixed(2)),
        type: isBigDrop ? 'drop' : 'kick',
        confidence: 0.9
      };
    }

    return null;
  }
}
