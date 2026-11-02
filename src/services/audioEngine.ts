import { BeatDetectionState } from '../types/visualizer';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | AudioBufferSourceNode | null = null;
  private mediaElement: HTMLAudioElement | HTMLVideoElement | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private gainNode: GainNode | null = null;

  // Analysis buffers
  private freqData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;

  // Beat detection state
  private energyHistory: number[] = [];
  private readonly historySize = 45;
  private lastBeatTime = 0;
  private beatIntervals: number[] = [];
  private currentBpm = 130;
  private pulseEnvelope = 0;

  // Procedural audio buffers cache
  private proceduralBuffers: Map<string, AudioBuffer> = new Map();
  private isProceduralPlaying = false;
  private proceduralStartTime = 0;
  private proceduralPauseOffset = 0;
  private currentProceduralType: string | null = null;

  constructor() {
    // Lazy initialized on first user interaction to comply with browser autoplay policy
  }

  public async init(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 1.0;

      this.streamDestination = this.ctx.createMediaStreamDestination();

      const bufferLength = this.analyser.frequencyBinCount;
      this.freqData = new Uint8Array(bufferLength);
      this.timeData = new Uint8Array(bufferLength);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getStreamDestination(): MediaStreamAudioDestinationNode | null {
    return this.streamDestination;
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public setSmoothing(smoothing: number): void {
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = Math.max(0.1, Math.min(0.95, smoothing));
    }
  }

  /**
   * Connect an HTMLMediaElement (<audio> or <video>)
   */
  public attachMediaElement(element: HTMLAudioElement | HTMLVideoElement): void {
    if (!this.ctx || !this.analyser || !this.gainNode || !this.streamDestination) return;

    // Disconnect old procedural source if any
    this.stopProcedural();

    if (this.mediaElement === element && this.sourceNode) {
      return; // Already attached to this element
    }

    try {
      this.mediaElement = element;
      this.sourceNode = this.ctx.createMediaElementSource(element);
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.streamDestination);
    } catch {
      // If already connected or CORS error, element might already be attached
    }
  }

  /**
   * Play procedural beat preset (Trap 808, Synthwave, EDM, Lo-fi)
   */
  public async playProcedural(presetType: string, loop = true): Promise<void> {
    await this.init();
    if (!this.ctx || !this.analyser || !this.gainNode || !this.streamDestination) return;

    this.stopProcedural();

    let buffer = this.proceduralBuffers.get(presetType);
    if (!buffer) {
      buffer = this.generateProceduralTrack(presetType);
      this.proceduralBuffers.set(presetType, buffer);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    source.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.analyser.connect(this.streamDestination);

    const offset = this.proceduralPauseOffset % buffer.duration;
    source.start(0, offset);
    this.proceduralStartTime = this.ctx.currentTime - offset;
    this.sourceNode = source;
    this.isProceduralPlaying = true;
    this.currentProceduralType = presetType;
  }

  public pauseProcedural(): void {
    if (this.isProceduralPlaying && this.sourceNode && this.ctx) {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {
        // Ignored
      }
      this.proceduralPauseOffset = this.ctx.currentTime - this.proceduralStartTime;
      this.isProceduralPlaying = false;
    }
  }

  public stopProcedural(): void {
    if (this.sourceNode && 'stop' in this.sourceNode) {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {
        // Ignored
      }
    }
    this.isProceduralPlaying = false;
    this.proceduralPauseOffset = 0;
  }

  public getProceduralCurrentTime(): number {
    if (!this.ctx || !this.isProceduralPlaying) return this.proceduralPauseOffset;
    return (this.ctx.currentTime - this.proceduralStartTime) % 30;
  }

  /**
   * Analyzes current audio frame and runs advanced beat detection
   */
  public analyze(
    sensitivity = 1.3,
    bassBoost = 2.0,
    smoothing = 0.82,
    playbackTime = 0,
    manualBeats: Array<{ time: number; intensity: number }> = [],
    syncMode: 'hybrid' | 'auto_only' | 'manual_only' = 'hybrid',
    nudgeMs = 0,
    subBassThreshold = 0.15,
    decaySpeed = 0.88
  ): {
    freqData: Uint8Array;
    timeData: Uint8Array;
    beatState: BeatDetectionState;
  } {
    if (!this.analyser || !this.freqData || !this.timeData) {
      const dummyFreq = new Uint8Array(512);
      const dummyTime = new Uint8Array(512).fill(128);
      return {
        freqData: dummyFreq,
        timeData: dummyTime,
        beatState: {
          isBeat: false,
          beatIntensity: 0,
          bassEnergy: 0,
          midEnergy: 0,
          highEnergy: 0,
          pulseDecay: 0,
          bpmEstimate: 130,
          isManualHit: false
        }
      };
    }

    this.analyser.smoothingTimeConstant = smoothing;
    this.analyser.getByteFrequencyData(this.freqData as any);
    this.analyser.getByteTimeDomainData(this.timeData as any);

    const length = this.freqData.length;
    // Sub-bass & Bass: 20Hz - 250Hz (bins 0 to ~16 in 1024 FFT at 44.1kHz)
    const bassEnd = Math.min(length, 16);
    // Mid: 250Hz - 2500Hz (bins 16 to ~116)
    const midEnd = Math.min(length, 116);

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.freqData[i];
    }
    const rawBassAvg = bassSum / Math.max(1, bassEnd);
    const bassEnergy = Math.min(255, rawBassAvg * bassBoost) / 255;

    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this.freqData[i];
    }
    const midEnergy = (midSum / Math.max(1, midEnd - bassEnd)) / 255;

    let highSum = 0;
    for (let i = midEnd; i < length; i++) {
      highSum += this.freqData[i];
    }
    const highEnergy = (highSum / Math.max(1, length - midEnd)) / 255;

    // Instant energy calculation
    const instantEnergy = bassEnergy;

    // Running energy history
    this.energyHistory.push(instantEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    let avgEnergy = 0;
    for (let i = 0; i < this.energyHistory.length; i++) {
      avgEnergy += this.energyHistory[i];
    }
    avgEnergy = avgEnergy / Math.max(1, this.energyHistory.length);

    // Variance
    let variance = 0;
    for (let i = 0; i < this.energyHistory.length; i++) {
      const diff = this.energyHistory[i] - avgEnergy;
      variance += diff * diff;
    }
    variance = variance / Math.max(1, this.energyHistory.length);

    // Dynamic threshold coefficient
    const dynamicCoeff = Math.max(1.05, sensitivity * (1 - variance * 0.5));
    const threshold = avgEnergy * dynamicCoeff;

    const now = performance.now();
    let isBeat = false;
    let isManualHit = false;
    let beatIntensity = 0;

    // 1. Check Manual Beat Markers (timed to playbackTime with visual nudge)
    const effectiveTime = playbackTime + (nudgeMs / 1000);
    if (syncMode !== 'auto_only' && manualBeats.length > 0) {
      const hitWindow = 0.055; // 55ms hit tolerance window
      for (const mb of manualBeats) {
        const diff = Math.abs(effectiveTime - mb.time);
        if (diff < hitWindow && now - this.lastBeatTime > 140) {
          isBeat = true;
          isManualHit = true;
          beatIntensity = mb.intensity || 1.0;
          this.pulseEnvelope = beatIntensity;
          this.lastBeatTime = now;
          break;
        }
      }
    }

    // 2. Automatic Beat Detection (if not manual_only and no manual beat hit right now)
    if (!isBeat && syncMode !== 'manual_only') {
      // Check if instant energy exceeds threshold and subBassThreshold
      if (instantEnergy > threshold && instantEnergy > subBassThreshold && now - this.lastBeatTime > 180) {
        isBeat = true;
        beatIntensity = Math.min(1.0, (instantEnergy - threshold) / (threshold + 0.001) + 0.3);
        this.pulseEnvelope = 1.0;

        // BPM interval measurement
        if (this.lastBeatTime > 0) {
          const interval = now - this.lastBeatTime;
          if (interval >= 300 && interval <= 1200) {
            this.beatIntervals.push(interval);
            if (this.beatIntervals.length > 8) this.beatIntervals.shift();

            const avgInterval = this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length;
            this.currentBpm = Math.round(60000 / avgInterval);
          }
        }
        this.lastBeatTime = now;
      }
    }

    // Smooth envelope decay
    if (!isBeat) {
      this.pulseEnvelope *= Math.max(0.7, Math.min(0.98, decaySpeed));
      if (this.pulseEnvelope < 0.001) this.pulseEnvelope = 0;
    }

    return {
      freqData: this.freqData,
      timeData: this.timeData,
      beatState: {
        isBeat,
        beatIntensity: isBeat ? beatIntensity : this.pulseEnvelope,
        bassEnergy,
        midEnergy,
        highEnergy,
        pulseDecay: this.pulseEnvelope,
        bpmEstimate: this.currentBpm,
        isManualHit
      }
    };
  }

  /**
   * Procedural music generator using Web Audio API synthesis
   * Creates seamless 30-second studio loops for each genre
   */
  private generateProceduralTrack(type: string): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');

    const sampleRate = this.ctx.sampleRate;
    const duration = 30; // 30 seconds
    const totalSamples = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = type === 'procedural_trap' ? 140 : type === 'procedural_lofi' ? 84 : 128;
    const beatDuration = 60 / bpm;
    const beatSamples = Math.floor(sampleRate * beatDuration);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beatProgress = (i % beatSamples) / beatSamples;
      const beatIndex = Math.floor(i / beatSamples);

      let sampleL = 0;
      let sampleR = 0;

      if (type === 'procedural_trap') {
        // Deep 808 Kick on beat 0 and syncopated beat 2.5
        const isKickBeat = (beatIndex % 4 === 0) || (beatIndex % 8 === 2 && beatProgress < 0.2);
        if (isKickBeat) {
          const decay = Math.exp(-beatProgress * 7);
          const freq = 120 * Math.exp(-beatProgress * 15) + 38;
          const kick = Math.sin(2 * Math.PI * freq * (beatProgress * beatDuration)) * decay;
          sampleL += kick * 0.9;
          sampleR += kick * 0.9;
        }

        // Snare / Clap on beat 2 and 4
        if (beatIndex % 2 === 1 && beatProgress < 0.3) {
          const snareEnv = Math.exp(-beatProgress * 25);
          const noise = (Math.random() * 2 - 1) * snareEnv;
          const tone = Math.sin(2 * Math.PI * 220 * t) * snareEnv * 0.4;
          sampleL += (noise * 0.5 + tone) * 0.7;
          sampleR += (noise * 0.5 + tone) * 0.7;
        }

        // Rolling Hi-Hats with 16th / 32nd triplet rolls
        const hatSub = Math.floor(beatProgress * 4);
        const hatSubProg = (beatProgress * 4) % 1;
        if (hatSubProg < 0.2) {
          const hatEnv = Math.exp(-hatSubProg * 35);
          const hatNoise = (Math.random() * 2 - 1) * hatEnv * 0.22;
          sampleL += hatNoise * (hatSub % 2 === 0 ? 0.9 : 0.6);
          sampleR += hatNoise * (hatSub % 2 === 1 ? 0.9 : 0.6);
        }

        // Dark trap melody pluck
        const chordNotes = [174.61, 207.65, 261.63, 311.13]; // F minor
        const noteIndex = Math.floor((beatIndex % 8) / 2);
        const noteFreq = chordNotes[noteIndex % chordNotes.length];
        const synthEnv = Math.exp(-beatProgress * 3.5);
        const lead = Math.sin(2 * Math.PI * noteFreq * t) * 0.25 * synthEnv;
        sampleL += lead * 0.4;
        sampleR += lead * 0.6;
      } else if (type === 'procedural_synth') {
        // 128 BPM Synthwave Four-on-the-Floor Kick
        const kickEnv = Math.exp(-beatProgress * 9);
        const kickFreq = 140 * Math.exp(-beatProgress * 18) + 45;
        const kick = Math.sin(2 * Math.PI * kickFreq * (beatProgress * beatDuration)) * kickEnv * 0.85;
        sampleL += kick;
        sampleR += kick;

        // Offbeat Synth Bass (Rolling 16th bassline)
        const bassSub = Math.floor(beatProgress * 4);
        const bassSubProg = (beatProgress * 4) % 1;
        if (bassSub === 1 || bassSub === 3) {
          const bassEnv = Math.exp(-bassSubProg * 6);
          const bassFreq = 65.41; // C2
          const saw = (2 * ((bassFreq * t) % 1) - 1) * bassEnv * 0.35;
          sampleL += saw;
          sampleR += saw;
        }

        // Arpeggiated Chords
        const arpScale = [261.63, 329.63, 392.00, 523.25]; // C Maj
        const arpStep = Math.floor(beatProgress * 4);
        const arpFreq = arpScale[arpStep % arpScale.length];
        const arpEnv = Math.exp(-((beatProgress * 4) % 1) * 8);
        const arpWave = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.2;
        sampleL += arpWave * 0.7;
        sampleR += arpWave * 0.3;
      } else if (type === 'procedural_edm') {
        // Heavy EDM Kick + Sub Drop
        const kickEnv = Math.exp(-beatProgress * 8);
        const kickFreq = 160 * Math.exp(-beatProgress * 15) + 48;
        const kick = Math.sin(2 * Math.PI * kickFreq * (beatProgress * beatDuration)) * kickEnv * 0.95;
        sampleL += kick;
        sampleR += kick;

        // Big festival saw chord on beats
        if (beatProgress < 0.5) {
          const leadEnv = Math.exp(-beatProgress * 4);
          const chords = [440, 554.37, 659.25];
          let chordSum = 0;
          for (const f of chords) {
            chordSum += Math.sin(2 * Math.PI * f * t);
          }
          sampleL += chordSum * 0.1 * leadEnv;
          sampleR += chordSum * 0.1 * leadEnv;
        }
      } else {
        // Lo-Fi chill beat with soft warm kick and vinyl noise
        const vinylNoise = (Math.random() * 2 - 1) * 0.03;
        sampleL += vinylNoise;
        sampleR += vinylNoise;

        if (beatIndex % 2 === 0 && beatProgress < 0.4) {
          const kickEnv = Math.exp(-beatProgress * 6);
          const kickFreq = 90 * Math.exp(-beatProgress * 12) + 40;
          const kick = Math.sin(2 * Math.PI * kickFreq * (beatProgress * beatDuration)) * kickEnv * 0.65;
          sampleL += kick;
          sampleR += kick;
        }

        // Warm electric piano chord
        const lofiChord = [220, 277.18, 329.63, 392];
        let epSum = 0;
        for (const f of lofiChord) {
          epSum += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
        }
        sampleL += epSum * 0.05;
        sampleR += epSum * 0.05;
      }

      // Soft limiter / clamp
      left[i] = Math.max(-0.95, Math.min(0.95, sampleL));
      right[i] = Math.max(-0.95, Math.min(0.95, sampleR));
    }

    return buffer;
  }
}
