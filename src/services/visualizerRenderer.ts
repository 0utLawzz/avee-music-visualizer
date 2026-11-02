import { VisualizerConfig, BeatDetectionState, CustomOverlayItem, TransitionEffect } from '../types/visualizer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  alpha: number;
  color: string;
}

export class VisualizerRenderer {
  private particles: Particle[] = [];
  private lastTime = performance.now();
  private spinAngle = 0;
  private peakBars: number[] = [];
  private noiseCanvas: HTMLCanvasElement | null = null;
  private noiseCtx: CanvasRenderingContext2D | null = null;
  private overlayImagesCache: Map<string, HTMLImageElement> = new Map();

  // Transition Engine
  private transitionSnapshot: HTMLCanvasElement | null = null;
  private transitionSnapshotCtx: CanvasRenderingContext2D | null = null;
  private isTransitioning = false;
  private transitionStartTime = 0;
  private transitionDuration = 0.6;
  private transitionEffect: TransitionEffect = 'blur_dissolve';

  // 3D Portal Warp Cubes (Tunnel Portal Template)
  private warpCubes: { x: number; y: number; z: number; size: number; alpha: number; rot: number }[] = [];

  constructor() {
    this.initNoiseCanvas();
    this.initWarpCubes(80);
  }

  private initWarpCubes(count = 80): void {
    this.warpCubes = [];
    for (let i = 0; i < count; i++) {
      this.warpCubes.push({
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 800,
        z: Math.random() * 900 + 40,
        size: Math.random() * 16 + 10,
        alpha: Math.random() * 0.7 + 0.3,
        rot: Math.random() * Math.PI * 2
      });
    }
  }

  private initNoiseCanvas(): void {
    try {
      this.noiseCanvas = document.createElement('canvas');
      this.noiseCanvas.width = 256;
      this.noiseCanvas.height = 256;
      this.noiseCtx = this.noiseCanvas.getContext('2d');
      if (this.noiseCtx) {
        const imgData = this.noiseCtx.createImageData(256, 256);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const val = Math.random() * 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 25; // light grain
        }
        this.noiseCtx.putImageData(imgData, 0, 0);
      }
    } catch {
      // Noise fallback
    }
  }

  public initParticles(count: number, width: number, height: number, color: string): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -Math.random() * 1.5 - 0.2, // gentle upward drift
        size: Math.random() * 2.5 + 1,
        baseSize: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.7 + 0.3,
        color
      });
    }
  }

  private getOrLoadOverlayImage(url: string): HTMLImageElement | null {
    if (!url) return null;
    let img = this.overlayImagesCache.get(url);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      this.overlayImagesCache.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  /**
   * Captures the current canvas frame and initiates a transition (fade, blur, wipe, iris, glitch)
   */
  public triggerTransition(
    currentCanvas: HTMLCanvasElement,
    effect: TransitionEffect = 'blur_dissolve',
    durationSeconds = 0.6
  ): void {
    if (effect === 'none' || durationSeconds <= 0) return;

    if (!this.transitionSnapshot) {
      this.transitionSnapshot = document.createElement('canvas');
    }
    this.transitionSnapshot.width = currentCanvas.width;
    this.transitionSnapshot.height = currentCanvas.height;
    this.transitionSnapshotCtx = this.transitionSnapshot.getContext('2d');
    if (this.transitionSnapshotCtx) {
      this.transitionSnapshotCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      this.transitionSnapshotCtx.drawImage(currentCanvas, 0, 0);
    }

    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionDuration = durationSeconds;
    this.transitionEffect = effect;
  }

  /**
   * Main render loop for the visualizer
   */
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    timeData: Uint8Array,
    beatState: BeatDetectionState,
    bgMedia: HTMLImageElement | HTMLVideoElement | null,
    logoImage: HTMLImageElement | null,
    playbackTime: number,
    isDraggingElement?: string | null
  ): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Apply spin speed
    this.spinAngle += (config.centerBadge.spinSpeed || 0.2) * dt * (1 + beatState.pulseDecay * 1.5);

    // Camera shake from bass pulse
    const shakeMult = config.beatDetection.bassShakeStrength || 0.6;
    const shakeX = (Math.random() - 0.5) * beatState.pulseDecay * 18 * shakeMult;
    const shakeY = (Math.random() - 0.5) * beatState.pulseDecay * 18 * shakeMult;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Render Background Layer (With Smart Social Media Aspect Ratio Framing)
    this.renderBackground(ctx, width, height, config, beatState, bgMedia);

    // 2. Render Floating Particle Sparks
    if (config.overlays.particles) {
      this.renderParticles(ctx, width, height, config, beatState);
    }

    // 3. Render Visualizer Bars & Core Rings
    const vizCenterX = (config.layout.visualizerPos.x / 100) * width;
    const vizCenterY = (config.layout.visualizerPos.y / 100) * height;

    const hasBuiltInCenter = ['cyber_horizon', 'neon_box_frame', 'tunnel_portal', 'twin_woofers'].includes(config.template);

    this.renderVisualizer(
      ctx,
      width,
      height,
      vizCenterX,
      vizCenterY,
      config,
      freqData,
      timeData,
      beatState,
      playbackTime
    );

    // 4. Render Center Badge / Logo (for templates with floating center badges)
    if (config.centerBadge.enabled && !hasBuiltInCenter) {
      this.renderCenterBadge(
        ctx,
        vizCenterX,
        vizCenterY,
        config,
        beatState,
        logoImage
      );
    }

    // 5. Render Track Info & Artist Badge (cyber_horizon and neon_box_frame have built-in typography)
    if (config.template !== 'cyber_horizon') {
      this.renderTrackInfo(ctx, width, height, config, playbackTime);
    }

    // 6. Render Custom Layered Graphic & Text Overlays
    if (config.customOverlays && config.customOverlays.length > 0) {
      this.renderCustomOverlays(ctx, width, height, config, beatState, playbackTime);
    }

    // 7. Render Built-in Aesthetic Overlays (Film Grain, VHS, Scanlines, Light Leaks)
    this.renderOverlays(ctx, width, height, config, beatState, playbackTime);

    // 8. Mobile Safe Zone Guides in 9:16 vertical mode (if enabled)
    if (config.aspectRatio === '9:16' && config.overlays.mobileSafeGuides) {
      this.renderMobileSafeZones(ctx, width, height);
    }

    // 9. Render Layout Drag Guides if user is dragging an element
    if (isDraggingElement) {
      this.renderDragGuides(ctx, width, height, config, isDraggingElement);
    }

    // 10. Transition Engine Blend Pass (fade, blur dissolve, wipe, radial iris, glitch)
    if (this.isTransitioning && this.transitionSnapshot) {
      const elapsed = (now - this.transitionStartTime) / 1000;
      const progress = Math.min(1.0, elapsed / Math.max(0.05, this.transitionDuration));
      if (progress >= 1.0) {
        this.isTransitioning = false;
      } else {
        this.applyTransitionBlend(
          ctx,
          width,
          height,
          progress,
          this.transitionEffect,
          this.transitionSnapshot
        );
      }
    }

    ctx.restore();
  }

  /**
   * Blends the previous canvas snapshot during transition
   */
  private applyTransitionBlend(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    effect: TransitionEffect,
    snapshot: HTMLCanvasElement
  ): void {
    ctx.save();

    switch (effect) {
      case 'crossfade': {
        ctx.globalAlpha = Math.max(0, 1.0 - progress);
        ctx.drawImage(snapshot, 0, 0, width, height);
        break;
      }

      case 'blur_dissolve': {
        const blurAmount = Math.sin(progress * Math.PI) * 26;
        if (blurAmount > 0.5) {
          ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
        }
        ctx.globalAlpha = Math.max(0, 1.0 - progress * 1.15);
        ctx.drawImage(snapshot, 0, 0, width, height);
        ctx.filter = 'none';
        break;
      }

      case 'wipe_left': {
        const cutX = width * (1.0 - progress);
        ctx.beginPath();
        ctx.rect(0, 0, cutX, height);
        ctx.clip();
        ctx.drawImage(snapshot, 0, 0, width, height);

        // Glowing divider line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(cutX, 0);
        ctx.lineTo(cutX, height);
        ctx.stroke();
        break;
      }

      case 'wipe_right': {
        const cutX = width * progress;
        ctx.beginPath();
        ctx.rect(cutX, 0, width - cutX, height);
        ctx.clip();
        ctx.drawImage(snapshot, 0, 0, width, height);

        // Glowing divider line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(cutX, 0);
        ctx.lineTo(cutX, height);
        ctx.stroke();
        break;
      }

      case 'radial_iris': {
        const maxR = Math.hypot(width, height) * 0.65;
        const r = progress * maxR;

        // Clip outside the expanding circle to show previous frame
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.drawImage(snapshot, 0, 0, width, height);

        // Glowing expanding iris boundary ring
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f43f5e';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'glitch_cut': {
        const slices = 14;
        const sliceH = height / slices;
        const fade = Math.max(0, 1.0 - progress);
        ctx.globalAlpha = fade;

        for (let i = 0; i < slices; i++) {
          const jitter = (Math.random() - 0.5) * fade * 80;
          ctx.drawImage(
            snapshot,
            0,
            i * sliceH,
            width,
            sliceH,
            jitter,
            i * sliceH,
            width,
            sliceH
          );
        }
        break;
      }

      default:
        break;
    }

    ctx.restore();
  }

  /**
   * Intelligently renders background to adapt perfectly to 16:9, 9:16, 1:1, or 4:5
   * Uses "Fit & Blur Wings" to eliminate black letterbox bars while preventing awkward cropping!
   */
  private renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    beatState: BeatDetectionState,
    bgMedia: HTMLImageElement | HTMLVideoElement | null
  ): void {
    ctx.save();

    // Bass zoom factor
    const zoomScale = 1.0 + beatState.pulseDecay * ((config.background.bassZoom || 1.15) - 1.0);

    ctx.translate(width / 2, height / 2);
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-width / 2, -height / 2);

    const hasMedia = bgMedia && (bgMedia instanceof HTMLImageElement ? bgMedia.complete && bgMedia.naturalWidth > 0 : bgMedia.readyState >= 2);

    if (hasMedia && bgMedia) {
      const mediaW = bgMedia instanceof HTMLImageElement ? bgMedia.naturalWidth : (bgMedia as HTMLVideoElement).videoWidth;
      const mediaH = bgMedia instanceof HTMLImageElement ? bgMedia.naturalHeight : (bgMedia as HTMLVideoElement).videoHeight;
      const mediaAspect = mediaW / mediaH;
      const canvasAspect = width / height;

      const framing = config.framingMode || 'fit_blur';

      if (framing === 'fit_blur' && Math.abs(mediaAspect - canvasAspect) > 0.08) {
        // --- PASS 1: Blurred Ambience Background Fill ---
        // Scale media to completely cover the canvas with rich color, light, and motion
        const coverScale = Math.max(width / mediaW, height / mediaH) * 1.15;
        const coverW = mediaW * coverScale;
        const coverH = mediaH * coverScale;
        const coverX = (width - coverW) / 2;
        const coverY = (height - coverH) / 2;

        ctx.save();
        ctx.filter = 'blur(36px) brightness(0.65)';
        ctx.drawImage(bgMedia, coverX, coverY, coverW, coverH);
        ctx.restore();

        // --- PASS 2: Sharp Centered Video Frame ---
        // Scale to fit neatly without any clipping
        const fitScale = Math.min(width / mediaW, height / mediaH);
        const fitW = mediaW * fitScale;
        const fitH = mediaH * fitScale;
        const fitX = (width - fitW) / 2;
        const fitY = (height - fitH) / 2;

        ctx.save();
        ctx.shadowBlur = 45;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.drawImage(bgMedia, fitX, fitY, fitW, fitH);

        // Subtle glowing border around center frame
        ctx.strokeStyle = config.bars.primaryColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4 + beatState.pulseDecay * 0.4;
        ctx.strokeRect(fitX, fitY, fitW, fitH);
        ctx.restore();
      } else {
        // Default Full-Bleed Cover Fit
        const scale = Math.max(width / mediaW, height / mediaH);
        const renderW = mediaW * scale;
        const renderH = mediaH * scale;
        const renderX = (width - renderW) / 2;
        const renderY = (height - renderH) / 2;

        if (config.background.blur > 0) {
          ctx.filter = `blur(${config.background.blur}px)`;
        }
        ctx.drawImage(bgMedia, renderX, renderY, renderW, renderH);
        ctx.filter = 'none';
      }
    } else {
      // Procedural Atmospheric Gradient Background
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );

      if (config.template === 'avee_classic' || config.template === 'trap_nation') {
        grad.addColorStop(0, '#38020a');
        grad.addColorStop(0.5, '#190306');
        grad.addColorStop(1, '#050102');
      } else if (config.template === 'neon_grid') {
        grad.addColorStop(0, '#042f2e');
        grad.addColorStop(0.6, '#0f172a');
        grad.addColorStop(1, '#020617');
      } else if (config.template === 'monstercat_bars') {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.6, '#061b17');
        grad.addColorStop(1, '#020b08');
      } else {
        grad.addColorStop(0, '#2d1537');
        grad.addColorStop(0.5, '#170c1d');
        grad.addColorStop(1, '#08030b');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let y = 0; y < height; y += 40) {
        ctx.fillRect(0, y, width, 1);
      }
    }

    // Darkness / Brightness overlay
    const brightness = config.background.brightness ?? 0.85;
    if (brightness < 1.0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1.0 - brightness})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Vignette
    const vignette = config.background.vignette ?? 0.6;
    if (vignette > 0) {
      const vGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.28,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );
      vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vGrad.addColorStop(1, `rgba(0, 0, 0, ${vignette})`);
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private renderParticles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    beatState: BeatDetectionState
  ): void {
    if (this.particles.length === 0 || this.particles.length !== config.overlays.particleCount) {
      this.initParticles(config.overlays.particleCount || 100, width, height, config.overlays.particleColor);
    }

    const vizCenterX = (config.layout.visualizerPos.x / 100) * width;
    const vizCenterY = (config.layout.visualizerPos.y / 100) * height;

    ctx.save();
    for (const p of this.particles) {
      // If hard kick, push outward from visualizer center
      if (beatState.isBeat && config.overlays.particleBurstOnKick) {
        const dx = p.x - vizCenterX;
        const dy = p.y - vizCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = beatState.beatIntensity * 12;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Friction
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 - 0.15; // gentle upward drift

      // Wrap around
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) {
        p.y = height;
        p.x = Math.random() * width;
      }
      if (p.y > height) p.y = 0;

      // Particle size expands on bass pulse
      const currentSize = p.baseSize * (1 + beatState.pulseDecay * 0.8);
      const shape = config.overlays.particleShape || 'circle';

      ctx.fillStyle = config.overlays.particleColor || '#ffffff';
      ctx.globalAlpha = p.alpha * (0.6 + beatState.pulseDecay * 0.4);
      ctx.shadowBlur = 8 * beatState.pulseDecay;
      ctx.shadowColor = config.overlays.particleColor || '#ffffff';

      if (shape === 'heart') {
        const hSize = currentSize * 2.2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        ctx.moveTo(0, hSize * 0.3);
        ctx.bezierCurveTo(0, -hSize * 0.2, -hSize * 0.6, -hSize * 0.2, -hSize * 0.6, hSize * 0.3);
        ctx.bezierCurveTo(-hSize * 0.6, hSize * 0.7, 0, hSize * 1.1, 0, hSize * 1.3);
        ctx.bezierCurveTo(0, hSize * 1.1, hSize * 0.6, hSize * 0.7, hSize * 0.6, hSize * 0.3);
        ctx.bezierCurveTo(hSize * 0.6, -hSize * 0.2, 0, -hSize * 0.2, 0, hSize * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (shape === 'cube') {
        const cSize = currentSize * 2.4;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillRect(-cSize / 2, -cSize / 2, cSize, cSize);
        ctx.beginPath();
        ctx.moveTo(-cSize / 2, -cSize / 2);
        ctx.lineTo(-cSize / 4, -cSize);
        ctx.lineTo(cSize * 0.75, -cSize);
        ctx.lineTo(cSize / 2, -cSize / 2);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = p.alpha * 0.7;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cSize / 2, -cSize / 2);
        ctx.lineTo(cSize * 0.75, -cSize);
        ctx.lineTo(cSize * 0.75, 0);
        ctx.lineTo(cSize / 2, cSize / 2);
        ctx.closePath();
        ctx.fillStyle = config.bars.accentColor || '#38bdf8';
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.fill();
        ctx.restore();
      } else if (shape === 'star') {
        const sSize = currentSize * 2.0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        for (let s = 0; s < 4; s++) {
          const angle = (s * Math.PI) / 2;
          ctx.lineTo(Math.cos(angle) * sSize, Math.sin(angle) * sSize);
          ctx.lineTo(Math.cos(angle + Math.PI / 4) * (sSize * 0.3), Math.sin(angle + Math.PI / 4) * (sSize * 0.3));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderVisualizer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cx: number,
    cy: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    timeData: Uint8Array,
    beatState: BeatDetectionState,
    playbackTime = 0
  ): void {
    const template = config.template;

    if (template === 'cyber_horizon') {
      this.renderCyberHorizon(ctx, width, height, config, freqData, timeData, beatState);
      return;
    }

    if (template === 'phonk_crown') {
      this.renderPhonkCrown(ctx, width, height, cx, cy, config, freqData, timeData, beatState);
      return;
    }

    if (template === 'neon_box_frame') {
      this.renderNeonBoxFrame(ctx, width, height, config, freqData, beatState, playbackTime);
      return;
    }

    if (template === 'tunnel_portal') {
      this.renderTunnelPortal(ctx, width, height, config, freqData, timeData, beatState, playbackTime);
      return;
    }

    if (template === 'twin_woofers') {
      this.renderTwinWoofers(ctx, width, height, config, freqData, timeData, beatState);
      return;
    }

    if (template === 'monstercat_bars') {
      this.renderMonstercatSpectrum(ctx, width, height, config, freqData, beatState);
      return;
    }

    if (template === 'neon_grid') {
      this.renderNeonGridPerspective(ctx, width, height, config, freqData, beatState);
    }

    // Circular Equalizer Templates: Avee Classic, Trap Nation, Vinyl Record, Starburst
    const barsCount = config.bars.barCount || 120;
    // Adapt base radius slightly for vertical mode so it doesn't clip
    const aspectFactor = config.aspectRatio === '9:16' ? 0.9 : 1.0;
    const baseRadius = (config.bars.circleRadius || 130) * (config.layout.scale || 1.0) * aspectFactor;
    // Base radius pumps with kick
    const activeRadius = baseRadius * (1.0 + beatState.pulseDecay * 0.18);
    const barWidth = config.bars.barWidth || 3.5;
    const barMaxHeight = config.bars.barMaxHeight || 180;
    const glowStrength = config.bars.glowStrength || 25;

    ctx.save();
    ctx.translate(cx, cy);

    // Side Horizontal Waveform Lines (Signature Avee Player Feature!)
    if (config.bars.waveLines && (template === 'avee_classic' || template === 'vinyl_record')) {
      this.renderSideWaveforms(ctx, cx, width, activeRadius, timeData, config, beatState);
    }

    // Outer Glow Setup
    ctx.shadowBlur = glowStrength * (0.7 + beatState.pulseDecay * 0.8);
    ctx.shadowColor = config.bars.primaryColor;

    // Draw Frequency Bars
    const halfCount = Math.floor(barsCount / 2);

    for (let i = 0; i < barsCount; i++) {
      let binIndex: number;
      if (config.bars.symmetric) {
        // Mirrored wings (Avee Player butterfly shape!)
        const symIdx = i < halfCount ? i : barsCount - 1 - i;
        binIndex = Math.floor(Math.pow(symIdx / halfCount, 1.4) * (freqData.length * 0.5));
      } else {
        binIndex = Math.floor(Math.pow(i / barsCount, 1.4) * (freqData.length * 0.5));
      }

      binIndex = Math.min(freqData.length - 1, Math.max(0, binIndex));
      const rawVal = freqData[binIndex] || 0;
      const normalizedVal = (rawVal / 255) * config.beatDetection.bassBoost;
      const barHeight = Math.max(3, normalizedVal * barMaxHeight * (0.85 + beatState.pulseDecay * 0.35));

      // Calculate angle around circle
      const angle = (i / barsCount) * Math.PI * 2 + this.spinAngle;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const startX = cos * activeRadius;
      const startY = sin * activeRadius;
      const endX = cos * (activeRadius + barHeight);
      const endY = sin * (activeRadius + barHeight);

      // Color Gradient from primary to secondary
      const grad = ctx.createLinearGradient(startX, startY, endX, endY);
      grad.addColorStop(0, config.bars.primaryColor);
      grad.addColorStop(0.6, config.bars.secondaryColor || '#ffffff');
      grad.addColorStop(1, config.bars.accentColor || config.bars.primaryColor);

      ctx.strokeStyle = grad;
      ctx.lineWidth = barWidth;
      ctx.lineCap = config.bars.barCapStyle === 'rounded' ? 'round' : 'square';

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Inner bars if enabled
      if (config.bars.innerBars) {
        const innerH = barHeight * 0.35;
        const inEndX = cos * (activeRadius - innerH);
        const inEndY = sin * (activeRadius - innerH);

        ctx.strokeStyle = config.bars.secondaryColor || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(inEndX, inEndY);
        ctx.stroke();
      }
    }

    // Central pulsing neon ring boundary
    ctx.strokeStyle = config.bars.primaryColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, activeRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private renderSideWaveforms(
    ctx: CanvasRenderingContext2D,
    cx: number,
    totalWidth: number,
    radius: number,
    timeData: Uint8Array,
    config: VisualizerConfig,
    beatState: BeatDetectionState
  ): void {
    const leftSpan = cx - radius - 20;
    const rightSpan = totalWidth - (cx + radius + 20);

    ctx.save();
    ctx.strokeStyle = config.bars.accentColor || '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.shadowColor = config.bars.accentColor || '#38bdf8';
    ctx.lineWidth = 2.5;

    // Left line
    if (leftSpan > 20) {
      ctx.beginPath();
      const step = leftSpan / 40;
      for (let i = 0; i < 40; i++) {
        const x = -radius - 20 - i * step;
        const timeVal = (timeData[i % timeData.length] - 128) / 128;
        const y = timeVal * 28 * (1 + beatState.pulseDecay);
        if (i === 0) ctx.moveTo(-radius - 20, 0);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Right line
    if (rightSpan > 20) {
      ctx.beginPath();
      const step = rightSpan / 40;
      for (let i = 0; i < 40; i++) {
        const x = radius + 20 + i * step;
        const timeVal = (timeData[(i + 40) % timeData.length] - 128) / 128;
        const y = timeVal * 28 * (1 + beatState.pulseDecay);
        if (i === 0) ctx.moveTo(radius + 20, 0);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderMonstercatSpectrum(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    beatState: BeatDetectionState
  ): void {
    const barCount = config.bars.barCount || 84;
    const barWidth = Math.max(3, (width * 0.8) / barCount - 3);
    const startX = width * 0.1;
    const baselineY = height * 0.76;

    if (this.peakBars.length !== barCount) {
      this.peakBars = new Array(barCount).fill(0);
    }

    ctx.save();

    for (let i = 0; i < barCount; i++) {
      const bin = Math.floor(Math.pow(i / barCount, 1.5) * (freqData.length * 0.5));
      const val = (freqData[bin] || 0) / 255;
      const barH = val * (config.bars.barMaxHeight || 280) * (0.9 + beatState.pulseDecay * 0.3);

      const x = startX + i * (barWidth + 3);

      if (barH >= this.peakBars[i]) {
        this.peakBars[i] = barH;
      } else {
        this.peakBars[i] = Math.max(0, this.peakBars[i] - 3.5);
      }

      const grad = ctx.createLinearGradient(x, baselineY, x, baselineY - barH);
      grad.addColorStop(0, config.bars.primaryColor);
      grad.addColorStop(1, config.bars.accentColor);

      ctx.fillStyle = grad;
      ctx.shadowBlur = config.bars.glowStrength * (0.8 + beatState.pulseDecay * 0.4);
      ctx.shadowColor = config.bars.primaryColor;
      ctx.fillRect(x, baselineY - barH, barWidth, barH);

      // Peak cap line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, baselineY - this.peakBars[i] - 4, barWidth, 3);

      // Floor reflection
      ctx.fillStyle = config.bars.primaryColor;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x, baselineY + 2, barWidth, barH * 0.35);
      ctx.globalAlpha = 1.0;
    }

    // Floor divider line
    ctx.strokeStyle = config.bars.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX - 20, baselineY);
    ctx.lineTo(startX + barCount * (barWidth + 3) + 20, baselineY);
    ctx.stroke();

    ctx.restore();
  }

  private renderNeonGridPerspective(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    _freqData: Uint8Array,
    beatState: BeatDetectionState
  ): void {
    const horizon = height * 0.62;
    ctx.save();
    ctx.strokeStyle = config.bars.primaryColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = config.bars.primaryColor;
    ctx.lineWidth = 1.5;

    const vpX = width / 2;
    for (let x = -width * 0.5; x <= width * 1.5; x += 90) {
      ctx.beginPath();
      ctx.moveTo(vpX, horizon);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const offset = ((performance.now() * 0.1) % 50) * (1 + beatState.pulseDecay * 2);
    for (let y = horizon; y <= height; y += 22) {
      const currentY = y + offset;
      if (currentY <= height) {
        const alpha = (currentY - horizon) / (height - horizon);
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, currentY);
        ctx.lineTo(width, currentY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private renderCenterBadge(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    config: VisualizerConfig,
    beatState: BeatDetectionState,
    logoImage: HTMLImageElement | null
  ): void {
    const badge = config.centerBadge;
    const baseSize = (badge.size || 90) * (config.layout.scale || 1.0);
    const pulseFactor = 1.0 + beatState.pulseDecay * ((badge.pulseIntensity || 1.25) - 1.0);
    const currentRadius = (baseSize / 2) * pulseFactor;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowBlur = 20 * (1 + beatState.pulseDecay);
    ctx.shadowColor = badge.glowColor || '#ff2a55';

    if (badge.shape === 'hexagon') {
      this.drawPolygon(ctx, 0, 0, currentRadius, 6, badge.borderColor, badge.borderWidth);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#08080c';
      ctx.fill();
      ctx.strokeStyle = badge.borderColor || '#ff2a55';
      ctx.lineWidth = badge.borderWidth || 3;
      ctx.stroke();
    }

    if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius - badge.borderWidth - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        logoImage,
        -currentRadius,
        -currentRadius,
        currentRadius * 2,
        currentRadius * 2
      );
      ctx.restore();
    } else if (badge.badgeText) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.max(12, Math.floor(currentRadius * 0.38))}px 'Outfit', sans-serif`;
      ctx.fillText(badge.badgeText, 0, 0);

      ctx.font = `600 ${Math.max(8, Math.floor(currentRadius * 0.16))}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = badge.borderColor || '#ff2a55';
      ctx.fillText('AUDIO VISUALS', 0, currentRadius * 0.42);
    }

    ctx.restore();
  }

  private drawPolygon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    sides: number,
    strokeColor: string,
    lineWidth: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      const px = x + radius * Math.cos(a);
      const py = y + radius * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  /**
   * Renders user custom text and graphic overlay layers with exact timing & animations
   */
  private renderCustomOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    beatState: BeatDetectionState,
    playbackTime: number
  ): void {
    const now = performance.now();

    for (const item of config.customOverlays) {
      if (!item.enabled) continue;

      // 1. Timing Check (Appear & Disappear with track)
      let timingAlpha = 1.0;
      if (item.hasTiming) {
        if (playbackTime < item.startTime || playbackTime > item.endTime) {
          continue; // outside time window
        }
        const fade = Math.max(0.05, item.fadeDuration || 0.4);
        if (playbackTime < item.startTime + fade) {
          timingAlpha = (playbackTime - item.startTime) / fade;
        } else if (playbackTime > item.endTime - fade) {
          timingAlpha = (item.endTime - playbackTime) / fade;
        }
        timingAlpha = Math.max(0, Math.min(1, timingAlpha));
      }

      ctx.save();

      // Base Position
      let posX = (item.x / 100) * width;
      let posY = (item.y / 100) * height;

      // 2. Animations & Dynamic Beat Reactive Calculations
      let dynamicScale = item.scale || 1.0;
      let dynamicRotation = (item.rotation || 0) * (Math.PI / 180);
      let animAlpha = 1.0;

      const reaction = item.beatReactionStrength || 1.0;

      switch (item.animation) {
        case 'beat_pulse':
          dynamicScale *= 1.0 + (beatState.pulseDecay * reaction * 0.28);
          break;

        case 'glitch_shake':
          if (beatState.isBeat || beatState.pulseDecay > 0.3) {
            const jitter = beatState.pulseDecay * reaction * 14;
            posX += (Math.random() - 0.5) * jitter;
            posY += (Math.random() - 0.5) * (jitter * 0.6);
            dynamicRotation += (Math.random() - 0.5) * 0.08 * reaction;
          }
          break;

        case 'fade':
          animAlpha = 0.75 + 0.25 * Math.sin(now * 0.003);
          break;

        case 'rotate_slow':
          dynamicRotation += (now * 0.0006) % (Math.PI * 2);
          break;

        case 'strobe':
          if (beatState.isBeat) {
            animAlpha = 1.0;
          } else {
            animAlpha = 0.3 + 0.7 * beatState.pulseDecay;
          }
          break;

        case 'slide_left':
        case 'slide_right': {
          if (item.hasTiming) {
            const elapsedSinceStart = playbackTime - item.startTime;
            if (elapsedSinceStart < 0.6) {
              const slideProgress = elapsedSinceStart / 0.6;
              const dir = item.animation === 'slide_left' ? -1 : 1;
              posX += dir * (1 - slideProgress) * 120;
            }
          }
          break;
        }
      }

      const finalAlpha = Math.max(0, Math.min(1, (item.opacity ?? 1.0) * timingAlpha * animAlpha));
      ctx.globalAlpha = finalAlpha;

      ctx.translate(posX, posY);
      ctx.rotate(dynamicRotation);
      ctx.scale(dynamicScale, dynamicScale);

      // 3. Render Text Element
      if (item.type === 'text' && item.text) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${item.fontWeight || 'bold'} ${item.fontSize || 32}px '${item.fontFamily || 'Outfit'}', sans-serif`;

        // Glow blur
        if (item.glowColor && item.glowBlur) {
          ctx.shadowBlur = item.glowBlur * (1 + beatState.pulseDecay * 0.5);
          ctx.shadowColor = item.glowColor;
        }

        // Stroke outline
        if (item.strokeColor && item.strokeWidth && item.strokeWidth > 0) {
          ctx.strokeStyle = item.strokeColor;
          ctx.lineWidth = item.strokeWidth;
          ctx.strokeText(item.text, 0, 0);
        }

        // Fill
        ctx.fillStyle = item.color || '#ffffff';
        ctx.fillText(item.text, 0, 0);
      }
      // 4. Render Graphic / Logo Element
      else if (item.type === 'image' && item.imageUrl) {
        const img = this.getOrLoadOverlayImage(item.imageUrl);
        if (img) {
          const baseW = (img.naturalWidth || 100);
          const baseH = (img.naturalHeight || 100);
          const targetW = 120;
          const targetH = (baseH / baseW) * targetW;

          if (item.glowColor && item.glowBlur) {
            ctx.shadowBlur = item.glowBlur * (1 + beatState.pulseDecay);
            ctx.shadowColor = item.glowColor;
          }

          ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        }
      }

      ctx.restore();
    }
  }

  private renderTrackInfo(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    playbackTime: number
  ): void {
    const titleX = (config.layout.titlePos.x / 100) * width;
    const titleY = (config.layout.titlePos.y / 100) * height;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    const mins = Math.floor(playbackTime / 60);
    const secs = Math.floor(playbackTime % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (config.overlays.watermarkText) {
      ctx.font = `700 13px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = config.bars.accentColor || '#38bdf8';
      ctx.fillText(config.overlays.watermarkText.toUpperCase(), titleX, titleY - 26);
    }

    ctx.font = `700 18px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    const fullTitle = `${config.audio.artistName || 'Unknown'} — ${config.audio.trackTitle || 'Track'}`;
    ctx.fillText(fullTitle, titleX, titleY);

    if (config.overlays.showTimestamp) {
      ctx.font = `500 12px 'JetBrains Mono', monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`TIME: ${timeStr} · ${config.audio.bpm} BPM`, titleX, titleY + 18);
    }

    ctx.restore();
  }

  private renderOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    beatState: BeatDetectionState,
    playbackTime: number
  ): void {
    ctx.save();

    // 1. Light Leak / Lens Flare
    if (config.overlays.lightLeak) {
      const flareRadius = width * (0.35 + beatState.pulseDecay * 0.2);
      const flareGrad = ctx.createRadialGradient(
        width * 0.15,
        height * 0.15,
        10,
        width * 0.15,
        height * 0.15,
        flareRadius
      );
      flareGrad.addColorStop(0, 'rgba(255, 120, 60, 0.28)');
      flareGrad.addColorStop(0.5, 'rgba(255, 40, 100, 0.12)');
      flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. VHS Cassette Overlay (Timestamp, REC dot, PLAY mode)
    if (config.overlays.vhsEffect) {
      ctx.font = `600 13px 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#00ffcc';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00ffcc';

      const mins = Math.floor(playbackTime / 60);
      const secs = Math.floor(playbackTime % 60);
      const ms = Math.floor((playbackTime % 1) * 100);
      const vhsTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;

      ctx.fillText(`PLAY ▶  ${vhsTime}`, 32, 42);
      ctx.fillText(`SP 1080p · HI-FI STEREO`, width - 210, 42);

      // CRT Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }
    }

    // 3. Film Grain
    if (config.overlays.filmGrain && this.noiseCanvas) {
      ctx.globalAlpha = 0.12 + beatState.pulseDecay * 0.05;
      const ptrn = ctx.createPattern(this.noiseCanvas, 'repeat');
      if (ptrn) {
        ctx.fillStyle = ptrn;
        ctx.fillRect(0, 0, width, height);
      }
    }

    ctx.restore();
  }

  /**
   * TikTok / Instagram Reels UI Safe Zones guides for 9:16 vertical video
   */
  private renderMobileSafeZones(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Top status / search safe margin (approx 140px on 1920h)
    const topSafe = 140;
    ctx.beginPath();
    ctx.moveTo(0, topSafe);
    ctx.lineTo(width, topSafe);
    ctx.stroke();

    // Bottom caption & sound title safe margin (approx 320px on 1920h)
    const bottomSafe = height - 320;
    ctx.beginPath();
    ctx.moveTo(0, bottomSafe);
    ctx.lineTo(width, bottomSafe);
    ctx.stroke();

    // Right icon column safe margin (approx 110px on 1080w)
    const rightSafe = width - 110;
    ctx.beginPath();
    ctx.moveTo(rightSafe, topSafe);
    ctx.lineTo(rightSafe, bottomSafe);
    ctx.stroke();

    ctx.fillStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.font = `600 11px 'JetBrains Mono', monospace`;
    ctx.fillText('TIKTOK / REELS SAFE ZONE', 24, topSafe - 12);
    ctx.restore();
  }

  // =========================================================================
  // 1. CYBER HORIZON (Avee Gallery Template - image_93e7ec11.png)
  // Ceiling & Floor Inverted Equalizer Bars with Center Waveform HUD Banner
  // =========================================================================
  private renderCyberHorizon(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    timeData: Uint8Array,
    beatState: BeatDetectionState
  ): void {
    const barCount = 48;
    const barWidth = Math.max(3, (width * 0.95) / (barCount * 2) - 2.5);
    const primary = config.bars.primaryColor || '#2dd4bf';
    const accent = config.bars.accentColor || '#ffffff';

    ctx.save();

    // 1. Perspective Elliptical Arcs in Background
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.48, height * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.42, height * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Ceiling Inverted Spectrum Bars (Hanging down from y = 0)
    for (let i = 0; i < barCount; i++) {
      const bin = Math.floor(Math.pow(i / barCount, 1.35) * (freqData.length * 0.5));
      const val = (freqData[bin] || 0) / 255;
      const barH = Math.max(4, val * 120 * config.beatDetection.bassBoost * (0.8 + beatState.pulseDecay * 0.4));

      // Left wing
      const lx = width / 2 - (i + 1) * (barWidth + 2.5);
      // Right wing
      const rx = width / 2 + i * (barWidth + 2.5);

      const topGrad = ctx.createLinearGradient(0, 0, 0, barH);
      topGrad.addColorStop(0, primary);
      topGrad.addColorStop(1, accent);

      ctx.fillStyle = topGrad;
      ctx.shadowBlur = 12 * beatState.pulseDecay;
      ctx.shadowColor = primary;

      ctx.fillRect(lx, 0, barWidth, barH);
      ctx.fillRect(rx, 0, barWidth, barH);

      // Tip cap dots
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lx + barWidth / 2, barH + 4, barWidth / 2, 0, Math.PI * 2);
      ctx.arc(rx + barWidth / 2, barH + 4, barWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Floor Spectrum Bars (Standing up from y = height)
    for (let i = 0; i < barCount; i++) {
      const bin = Math.floor(Math.pow(i / barCount, 1.35) * (freqData.length * 0.5));
      const val = (freqData[bin] || 0) / 255;
      const barH = Math.max(4, val * 120 * config.beatDetection.bassBoost * (0.8 + beatState.pulseDecay * 0.4));

      const lx = width / 2 - (i + 1) * (barWidth + 2.5);
      const rx = width / 2 + i * (barWidth + 2.5);

      const botGrad = ctx.createLinearGradient(0, height, 0, height - barH);
      botGrad.addColorStop(0, primary);
      botGrad.addColorStop(1, accent);

      ctx.fillStyle = botGrad;
      ctx.shadowBlur = 12 * beatState.pulseDecay;
      ctx.shadowColor = primary;

      ctx.fillRect(lx, height - barH, barWidth, barH);
      ctx.fillRect(rx, height - barH, barWidth, barH);

      // Tip cap dots
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lx + barWidth / 2, height - barH - 4, barWidth / 2, 0, Math.PI * 2);
      ctx.arc(rx + barWidth / 2, height - barH - 4, barWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Center Audio HUD Glass Banner
    const bannerW = Math.min(width * 0.88, 760);
    const bannerH = 110;
    const bannerX = (width - bannerW) / 2;
    const bannerY = (height - bannerH) / 2;

    // Glass backdrop
    ctx.fillStyle = 'rgba(5, 15, 20, 0.75)';
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    // Left Geometric Triangle [◀] Prev
    const triSize = 36;
    const leftTriX = bannerX + 45;
    const centerLineY = height / 2;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 14;
    ctx.shadowColor = primary;
    ctx.beginPath();
    ctx.moveTo(leftTriX, centerLineY - triSize);
    ctx.lineTo(leftTriX - triSize * 0.9, centerLineY);
    ctx.lineTo(leftTriX, centerLineY + triSize);
    ctx.closePath();
    ctx.stroke();

    ctx.font = `600 13px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Prev', leftTriX - triSize * 0.65, centerLineY + 5);

    // Right Geometric Triangle Next [▶]
    const rightTriX = bannerX + bannerW - 45;
    ctx.beginPath();
    ctx.moveTo(rightTriX, centerLineY - triSize);
    ctx.lineTo(rightTriX + triSize * 0.9, centerLineY);
    ctx.lineTo(rightTriX, centerLineY + triSize);
    ctx.closePath();
    ctx.stroke();

    ctx.fillText('Next', rightTriX + 8, centerLineY + 5);

    // Dotted Audio Waveform Line connecting between left and right controls
    const waveStartX = leftTriX + 16;
    const waveEndX = rightTriX - 16;
    const waveWidth = waveEndX - waveStartX;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = primary;

    const wavePoints = 40;
    const step = waveWidth / wavePoints;

    for (let i = 0; i < wavePoints; i++) {
      const wx = waveStartX + i * step;
      // Skip center region where text sits
      const distFromCenter = Math.abs(wx - width / 2);
      if (distFromCenter < 140) {
        // Dotted horizontal line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(wx - 2, centerLineY - 1, 4, 2);
        continue;
      }

      const tIdx = Math.floor((i / wavePoints) * timeData.length);
      const tVal = ((timeData[tIdx] || 128) - 128) / 128;
      const waveH = tVal * 28 * (1.0 + beatState.pulseDecay * 0.8);

      ctx.fillStyle = primary;
      ctx.fillRect(wx - 1.5, centerLineY - waveH / 2, 3, Math.max(3, Math.abs(waveH)));
    }

    // Centered Typography
    ctx.textAlign = 'center';
    ctx.shadowBlur = 15;
    ctx.shadowColor = primary;

    // Artist / "Your Name"
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 22px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(config.audio.artistName || 'Your Name', width / 2, centerLineY - 14);

    // Title / "Song Title / Tagline"
    ctx.fillStyle = primary;
    ctx.font = `600 15px 'Outfit', sans-serif`;
    ctx.fillText(config.audio.trackTitle || 'Song Title / Tagline', width / 2, centerLineY + 28);

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // =========================================================================
  // 2. PHONK REAPER CROWN (Avee Gallery Template - image_60e223eb.png)
  // Double Dynamic Contour Waveform with Crown Spikes & Phonk Drift Emblem
  // =========================================================================
  private renderPhonkCrown(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cx: number,
    cy: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    timeData: Uint8Array,
    beatState: BeatDetectionState
  ): void {
    const radius = (config.bars.circleRadius || 140) * (config.layout.scale || 1.0) * (1.0 + beatState.pulseDecay * 0.22);
    const primary = config.bars.primaryColor || '#3b82f6';
    const secondary = config.bars.secondaryColor || '#8b5cf6';
    const accent = config.bars.accentColor || '#60a5fa';

    ctx.save();

    // 1. Phonk Eerie Radial Aura
    const aura = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 2.2);
    aura.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    aura.addColorStop(0.5, 'rgba(139, 92, 246, 0.12)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);

    ctx.translate(cx, cy);

    // 2. Outer Crown Spikes Contour Ring
    const points = 72;
    ctx.shadowBlur = config.bars.glowStrength * (0.8 + beatState.pulseDecay * 0.8);
    ctx.shadowColor = primary;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const idx = i % points;
      const angle = (idx / points) * Math.PI * 2 - Math.PI / 2; // start from top
      const freqBin = Math.floor((idx / points) * (freqData.length * 0.45));
      const val = (freqData[freqBin] || 0) / 255;

      // Crown spikes on the top hemisphere (between -60 deg and +60 deg from top)
      const topFactor = Math.abs(angle + Math.PI / 2);
      const isCrownZone = topFactor < Math.PI * 0.35;
      const crownMultiplier = isCrownZone ? 1.8 + Math.sin(idx * 2) * 0.5 : 1.0;

      const spikeH = val * 90 * config.beatDetection.bassBoost * crownMultiplier * (0.85 + beatState.pulseDecay * 0.4);
      const r = radius + spikeH;

      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const crownGrad = ctx.createLinearGradient(0, -radius - 80, 0, radius + 80);
    crownGrad.addColorStop(0, '#ffffff');
    crownGrad.addColorStop(0.5, primary);
    crownGrad.addColorStop(1, secondary);

    ctx.strokeStyle = crownGrad;
    ctx.stroke();

    // 3. Inner Smooth Oscillating Waveform Ring
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const idx = i % points;
      const angle = (idx / points) * Math.PI * 2;
      const tIdx = Math.floor((idx / points) * timeData.length);
      const tVal = ((timeData[tIdx] || 128) - 128) / 128;

      const r = radius * 0.88 + tVal * 24 * (1.0 + beatState.pulseDecay);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Central Phonk Reaper Badge & Crown Silhouette
    const badgeR = radius * 0.72;
    ctx.fillStyle = '#050814';
    ctx.beginPath();
    ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Crown Icon inside center badge
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = primary;
    ctx.beginPath();
    ctx.moveTo(-32, 10);
    ctx.lineTo(-40, -18);
    ctx.lineTo(-14, -6);
    ctx.lineTo(0, -28); // center crown point
    ctx.lineTo(14, -6);
    ctx.lineTo(40, -18);
    ctx.lineTo(32, 10);
    ctx.closePath();
    ctx.fill();

    // Crown base jewels
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(-22, 18, 3, 0, Math.PI * 2);
    ctx.arc(0, 18, 3.5, 0, Math.PI * 2);
    ctx.arc(22, 18, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Signature Phonk Brand Stamp (Lower Left)
    ctx.save();
    const tagX = 42;
    const tagY = height - 75;

    // Green accent line
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(tagX, tagY - 24, 4, 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 24px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText('PHONK', tagX + 12, tagY - 4);

    ctx.fillStyle = '#22c55e';
    ctx.font = `700 13px 'JetBrains Mono', monospace`;
    ctx.fillText('AVEE PLAYER TEMPLATE', tagX + 12, tagY + 14);

    ctx.restore();
  }

  // =========================================================================
  // 3. NEON BOX FRAME (Avee Gallery Template - image_4bb5b174.png)
  // 4-Sided Equalizer Frame with Floating Glowing Hearts and Top Script
  // =========================================================================
  private renderNeonBoxFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    beatState: BeatDetectionState,
    playbackTime: number
  ): void {
    const boxW = Math.min(width * 0.72, 680);
    const boxH = Math.min(height * 0.65, 480);
    const bx = (width - boxW) / 2;
    const by = (height - boxH) / 2;

    const primary = config.bars.primaryColor || '#38bdf8';
    const accent = config.bars.accentColor || '#ffffff';

    ctx.save();

    // 1. Glowing Box Frame Borders
    ctx.shadowBlur = 18 * (0.8 + beatState.pulseDecay * 0.6);
    ctx.shadowColor = primary;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by, boxW, boxH);

    // 2. Corner Bracket Highlights
    const cornerSize = 24;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(bx, by + cornerSize);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + cornerSize, by);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(bx + boxW - cornerSize, by);
    ctx.lineTo(bx + boxW, by);
    ctx.lineTo(bx + boxW, by + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(bx, by + boxH - cornerSize);
    ctx.lineTo(bx, by + boxH);
    ctx.lineTo(bx + cornerSize, by + boxH);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(bx + boxW - cornerSize, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH - cornerSize);
    ctx.stroke();

    // 3. Equalizer Bars along all 4 Frame Edges
    const hBarCount = 36;
    const vBarCount = 24;
    const barWidth = 3;

    // Top Edge Spectrum Bars (Shooting inward and outward)
    for (let i = 0; i < hBarCount; i++) {
      const bin = Math.floor((i / hBarCount) * (freqData.length * 0.4));
      const val = (freqData[bin] || 0) / 255;
      const barH = val * 55 * config.beatDetection.bassBoost * (0.8 + beatState.pulseDecay * 0.4);

      const x = bx + 20 + (i / (hBarCount - 1)) * (boxW - 40);

      // Inward bar
      ctx.fillStyle = primary;
      ctx.fillRect(x - barWidth / 2, by, barWidth, barH);
      // Outward bar
      ctx.fillStyle = accent;
      ctx.fillRect(x - barWidth / 2, by - barH * 0.6, barWidth, barH * 0.6);
    }

    // Bottom Edge Spectrum Bars
    for (let i = 0; i < hBarCount; i++) {
      const bin = Math.floor((i / hBarCount) * (freqData.length * 0.4));
      const val = (freqData[bin] || 0) / 255;
      const barH = val * 55 * config.beatDetection.bassBoost * (0.8 + beatState.pulseDecay * 0.4);

      const x = bx + 20 + (i / (hBarCount - 1)) * (boxW - 40);

      ctx.fillStyle = primary;
      ctx.fillRect(x - barWidth / 2, by + boxH - barH, barWidth, barH);
      ctx.fillStyle = accent;
      ctx.fillRect(x - barWidth / 2, by + boxH, barWidth, barH * 0.6);
    }

    // Left Edge Vertical Spectrum Bars
    for (let i = 0; i < vBarCount; i++) {
      const bin = Math.floor((i / vBarCount) * (freqData.length * 0.4));
      const val = (freqData[bin] || 0) / 255;
      const barH = val * 45 * config.beatDetection.bassBoost * (0.8 + beatState.pulseDecay * 0.4);

      const y = by + 20 + (i / (vBarCount - 1)) * (boxH - 40);

      ctx.fillStyle = primary;
      ctx.fillRect(bx, y - barWidth / 2, barH, barWidth);
      ctx.fillStyle = accent;
      ctx.fillRect(bx - barH * 0.6, y - barWidth / 2, barH * 0.6, barWidth);
    }

    // Right Edge Vertical Spectrum Bars
    for (let i = 0; i < vBarCount; i++) {
      const bin = Math.floor((i / vBarCount) * (freqData.length * 0.4));
      const val = (freqData[bin] || 0) / 255;
      const barH = val * 45 * config.beatDetection.bassBoost * (0.8 + beatState.pulseDecay * 0.4);

      const y = by + 20 + (i / (vBarCount - 1)) * (boxH - 40);

      ctx.fillStyle = primary;
      ctx.fillRect(bx + boxW - barH, y - barWidth / 2, barH, barWidth);
      ctx.fillStyle = accent;
      ctx.fillRect(bx + boxW, y - barWidth / 2, barH * 0.6, barWidth);
    }

    // 4. Top Cursive Title ("Falling" or Track Title)
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = primary;
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 700 36px 'Outfit', cursive, sans-serif`;
    ctx.fillText(config.audio.trackTitle || 'Falling', width / 2, by - 35);

    // 5. Bottom Seeker Bar & Time (e.g. 0:45)
    const mins = Math.floor(playbackTime / 60);
    const secs = Math.floor(playbackTime % 60).toString().padStart(2, '0');
    const timeStr = `${mins}:${secs}`;

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 15px 'JetBrains Mono', monospace`;
    ctx.fillText(timeStr, width / 2, by + boxH + 34);

    // Progress line
    const progressW = boxW * 0.65;
    const progressX = (width - progressW) / 2;
    const progressY = by + boxH + 52;
    const pct = Math.min(1.0, playbackTime / Math.max(1, config.audio.duration || 30));

    // Background track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(progressX, progressY, progressW, 3);

    // Filled progress
    ctx.fillStyle = primary;
    ctx.fillRect(progressX, progressY, progressW * pct, 3);

    // Neon pip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(progressX + progressW * pct, progressY + 1.5, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // =========================================================================
  // 4. 3D CUBE WARP PORTAL (Avee Gallery Template - image_54955e6a.png)
  // Rectangular Cyber Frame with 3D Exploding Cubes Flying Into View
  // =========================================================================
  private renderTunnelPortal(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    timeData: Uint8Array,
    beatState: BeatDetectionState,
    playbackTime: number
  ): void {
    const primary = config.bars.primaryColor || '#0ea5e9';
    const accent = config.bars.accentColor || '#38bdf8';

    ctx.save();

    // 1. Cyber Wave Outer Border Frame
    const frameW = Math.min(width * 0.75, 720);
    const frameH = Math.min(height * 0.72, 520);
    const fx = (width - frameW) / 2;
    const fy = (height - frameH) / 2;

    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 18 * (0.8 + beatState.pulseDecay * 0.5);
    ctx.shadowColor = primary;

    // Draw wavy contour along top & bottom border lines
    ctx.beginPath();
    const segments = 40;
    // Top wavy line
    for (let i = 0; i <= segments; i++) {
      const x = fx + (i / segments) * frameW;
      const tVal = ((timeData[i % timeData.length] || 128) - 128) / 128;
      const y = fy + tVal * 12 * (1 + beatState.pulseDecay);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // Right side
    ctx.lineTo(fx + frameW, fy + frameH);
    // Bottom wavy line
    for (let i = segments; i >= 0; i--) {
      const x = fx + (i / segments) * frameW;
      const tVal = ((timeData[(i + 20) % timeData.length] || 128) - 128) / 128;
      const y = fy + frameH + tVal * 12 * (1 + beatState.pulseDecay);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(fx, fy);
    ctx.closePath();
    ctx.stroke();

    // 2. 3D Warping Cubes (Flying from Center Outward)
    const vpX = width / 2;
    const vpY = height / 2;
    const warpSpeed = 10 + beatState.beatIntensity * 45;

    for (const cube of this.warpCubes) {
      cube.z -= warpSpeed;
      if (cube.z <= 25) {
        cube.z = 900;
        cube.x = (Math.random() - 0.5) * 1100;
        cube.y = (Math.random() - 0.5) * 750;
      }

      // Perspective Projection
      const focal = 320;
      const projX = vpX + (cube.x * focal) / cube.z;
      const projY = vpY + (cube.y * focal) / cube.z;

      // Distance scaling
      const distScale = Math.min(4.5, focal / cube.z);
      const curSize = cube.size * distScale * (0.9 + beatState.pulseDecay * 0.4);

      if (projX < -50 || projX > width + 50 || projY < -50 || projY > height + 50) {
        continue;
      }

      ctx.save();
      ctx.translate(projX, projY);
      ctx.rotate(cube.rot + playbackTime * 0.4);

      ctx.shadowBlur = 10 * distScale;
      ctx.shadowColor = accent;

      // Front Face
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.min(1.0, (cube.alpha * distScale * 0.6));
      ctx.fillRect(-curSize / 2, -curSize / 2, curSize, curSize);

      // Top Perspective Face
      ctx.fillStyle = primary;
      ctx.globalAlpha = Math.min(1.0, (cube.alpha * distScale * 0.8));
      ctx.beginPath();
      ctx.moveTo(-curSize / 2, -curSize / 2);
      ctx.lineTo(-curSize / 4, -curSize * 0.9);
      ctx.lineTo(curSize * 0.75, -curSize * 0.9);
      ctx.lineTo(curSize / 2, -curSize / 2);
      ctx.closePath();
      ctx.fill();

      // Right Perspective Face
      ctx.fillStyle = accent;
      ctx.globalAlpha = Math.min(1.0, (cube.alpha * distScale * 0.5));
      ctx.beginPath();
      ctx.moveTo(curSize / 2, -curSize / 2);
      ctx.lineTo(curSize * 0.75, -curSize * 0.9);
      ctx.lineTo(curSize * 0.75, curSize * 0.2);
      ctx.lineTo(curSize / 2, curSize / 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 3. Lower Left Cursive Script ("My love....")
    ctx.shadowBlur = 18;
    ctx.shadowColor = accent;
    ctx.fillStyle = '#22d3ee';
    ctx.font = `italic 700 38px 'Outfit', cursive, sans-serif`;
    ctx.fillText('My love....', fx + 30, fy + frameH - 35);

    // 4. Lower Right Digital Timestamp Box (0:16)
    const mins = Math.floor(playbackTime / 60);
    const secs = Math.floor(playbackTime % 60).toString().padStart(2, '0');
    const timeStr = `${mins}:${secs}`;

    ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
    ctx.fillRect(fx + frameW - 110, fy + frameH - 65, 80, 30);
    ctx.strokeStyle = primary;
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + frameW - 110, fy + frameH - 65, 80, 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 14px 'JetBrains Mono', monospace`;
    ctx.fillText(timeStr, fx + frameW - 92, fy + frameH - 45);

    ctx.restore();
  }

  // =========================================================================
  // 5. TWIN BASS WOOFERS (Avee Gallery Template - image_be9f7c65.png)
  // Dual Subwoofers with Fiery Sunburst Spikes & Bottom Triple Sine Waves
  // =========================================================================
  private renderTwinWoofers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    freqData: Uint8Array,
    timeData: Uint8Array,
    beatState: BeatDetectionState
  ): void {
    const woofer1X = width * 0.23;
    const woofer2X = width * 0.77;
    const wooferY = height * 0.42;

    const baseR = Math.min(width * 0.15, 140) * (config.layout.scale || 1.0);
    // Subwoofer cone physically pulses with low bass energy!
    const activeR = baseR * (1.0 + beatState.bassEnergy * 0.32);

    ctx.save();

    // Helper to draw one full subwoofer assembly
    const drawWoofer = (wx: number, wy: number) => {
      ctx.save();
      ctx.translate(wx, wy);

      // 1. Fiery Sunburst Audio Flare Bars radiating outward 360°
      const flareCount = 48;
      for (let i = 0; i < flareCount; i++) {
        const bin = Math.floor((i / flareCount) * (freqData.length * 0.35));
        const val = (freqData[bin] || 0) / 255;
        const flareH = Math.max(8, val * 110 * config.beatDetection.bassBoost * (0.85 + beatState.pulseDecay * 0.45));

        const angle = (i / flareCount) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x1 = cos * (activeR + 10);
        const y1 = sin * (activeR + 10);
        const x2 = cos * (activeR + 10 + flareH);
        const y2 = sin * (activeR + 10 + flareH);

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#f59e0b');
        grad.addColorStop(0.7, '#ef4444');
        grad.addColorStop(1, 'rgba(225, 29, 72, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 16 * beatState.pulseDecay;
        ctx.shadowColor = '#ef4444';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 2. Heavy Speaker Outer Rubber Surround
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(0, 0, activeR + 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.stroke();

      // 3. Vibrating Subwoofer Speaker Cone
      const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, activeR);
      coneGrad.addColorStop(0, '#0c0a09');
      coneGrad.addColorStop(0.6, '#292524');
      coneGrad.addColorStop(1, '#1c1917');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.arc(0, 0, activeR, 0, Math.PI * 2);
      ctx.fill();

      // Concentric Bass Rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, activeR * 0.75, 0, Math.PI * 2);
      ctx.arc(0, 0, activeR * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Center Dust Cap Dome (Glows red with bass)
      const capR = activeR * 0.35;
      const capGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, capR);
      capGrad.addColorStop(0, '#fca5a5');
      capGrad.addColorStop(0.4, '#dc2626');
      capGrad.addColorStop(1, '#450a0a');

      ctx.fillStyle = capGrad;
      ctx.shadowBlur = 25 * beatState.pulseDecay;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, capR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    // Draw Left & Right Woofers
    drawWoofer(woofer1X, wooferY);
    drawWoofer(woofer2X, wooferY);

    // 2. Bottom Triple Sinewave Oscilloscope Ribbons
    const ribbonY = height * 0.82;
    const waveCount = 80;
    const step = width / waveCount;

    // Ribbon 1: Neon Red Sine
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    for (let i = 0; i <= waveCount; i++) {
      const x = i * step;
      const tIdx = Math.floor((i / waveCount) * timeData.length);
      const tVal = ((timeData[tIdx] || 128) - 128) / 128;
      const y = ribbonY + tVal * 45 * (1.0 + beatState.pulseDecay * 0.8) + Math.sin(i * 0.18) * 15;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Ribbon 2: Crisp White Sine
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i <= waveCount; i++) {
      const x = i * step;
      const tIdx = Math.floor(((i + 15) / waveCount) * timeData.length);
      const tVal = ((timeData[tIdx % timeData.length] || 128) - 128) / 128;
      const y = ribbonY - 14 + tVal * 38 * (1.0 + beatState.pulseDecay * 0.6) + Math.sin(i * 0.18 + 1.2) * 20;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Ribbon 3: Neon Violet Sine
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    for (let i = 0; i <= waveCount; i++) {
      const x = i * step;
      const tIdx = Math.floor(((i + 30) / waveCount) * timeData.length);
      const tVal = ((timeData[tIdx % timeData.length] || 128) - 128) / 128;
      const y = ribbonY + 16 + tVal * 32 * (1.0 + beatState.pulseDecay * 0.5) + Math.sin(i * 0.18 + 2.4) * 18;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Center Headphone & "BROKEN HEART" Emblem
    const centerBadgeX = width / 2;
    const centerBadgeY = height * 0.72;

    ctx.save();
    ctx.textAlign = 'center';

    // Headphone arch icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(centerBadgeX, centerBadgeY - 10, 22, Math.PI, 0);
    ctx.stroke();

    // Heart icon in center
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(centerBadgeX - 6, centerBadgeY - 10, 6, 0, Math.PI * 2);
    ctx.arc(centerBadgeX + 6, centerBadgeY - 10, 6, 0, Math.PI * 2);
    ctx.fill();

    // "BROKEN HEART" text
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 20px 'Plus Jakarta Sans', sans-serif`;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ef4444';
    ctx.fillText('BROKEN HEART', centerBadgeX, centerBadgeY + 24);

    // Decorative underline
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerBadgeX - 70, centerBadgeY + 30);
    ctx.lineTo(centerBadgeX + 70, centerBadgeY + 30);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.restore();

    ctx.restore();
  }

  private renderDragGuides(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    activeElement: string
  ): void {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    if (activeElement === 'visualizer') {
      const cx = (config.layout.visualizerPos.x / 100) * width;
      const cy = (config.layout.visualizerPos.y / 100) * height;
      const r = (config.bars.circleRadius || 130) * (config.layout.scale || 1.0) + 40;

      // Snapping crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();

      // Bounding box
      ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    } else if (activeElement === 'title') {
      const tx = (config.layout.titlePos.x / 100) * width;
      const ty = (config.layout.titlePos.y / 100) * height;
      ctx.strokeRect(tx - 10, ty - 35, 340, 60);
    } else {
      // Check if it's a custom overlay item
      const overlayItem = config.customOverlays.find((o) => o.id === activeElement);
      if (overlayItem) {
        const ox = (overlayItem.x / 100) * width;
        const oy = (overlayItem.y / 100) * height;
        const boxSize = 140 * (overlayItem.scale || 1.0);
        ctx.strokeRect(ox - boxSize / 2, oy - 28, boxSize, 56);
      }
    }

    ctx.restore();
  }
}
