export interface ExportOptions {
  durationSeconds: number;
  fps: 30 | 60;
  bitrateBps: number;
  filename: string;
}

export class VideoExporter {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isExporting = false;
  private startTime = 0;
  private timerId: number | null = null;

  public getIsExporting(): boolean {
    return this.isExporting;
  }

  public cancelExport(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isExporting = false;
    this.recordedChunks = [];
  }

  /**
   * Starts high-quality canvas + audio recording
   */
  public async startExport(
    canvas: HTMLCanvasElement,
    audioStream: MediaStream | null,
    options: ExportOptions,
    onProgress: (percent: number, elapsed: number, total: number) => void
  ): Promise<Blob> {
    this.isExporting = true;
    this.recordedChunks = [];

    // Capture canvas video stream
    const videoStream = canvas.captureStream(options.fps || 60);

    // Combine audio tracks if available
    const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioStream.getAudioTracks());
    }

    const combinedStream = new MediaStream(combinedTracks);

    // Determine supported mime type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm'
    ];

    let selectedMime = 'video/webm';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        this.mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMime,
          videoBitsPerSecond: options.bitrateBps || 10000000 // 10 Mbps default
        });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        this.mediaRecorder.onerror = (event) => {
          this.isExporting = false;
          if (this.timerId) clearInterval(this.timerId);
          reject(event);
        };

        this.mediaRecorder.onstop = () => {
          this.isExporting = false;
          if (this.timerId) clearInterval(this.timerId);
          const blob = new Blob(this.recordedChunks, { type: selectedMime });
          resolve(blob);
        };

        this.startTime = performance.now();
        this.mediaRecorder.start(250); // Collect data chunks every 250ms

        // Progress tracker timer
        this.timerId = window.setInterval(() => {
          if (!this.isExporting) return;
          const elapsed = (performance.now() - this.startTime) / 1000;
          const percent = Math.min(100, Math.floor((elapsed / options.durationSeconds) * 100));
          onProgress(percent, elapsed, options.durationSeconds);

          if (elapsed >= options.durationSeconds) {
            if (this.timerId) clearInterval(this.timerId);
            this.timerId = null;
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
              this.mediaRecorder.stop();
            }
          }
        }, 200);
      } catch (err) {
        this.isExporting = false;
        reject(err);
      }
    });
  }

  /**
   * Helper to trigger instant download in browser
   */
  public downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Capture a single pristine frame as high-res PNG cover art
   */
  public captureSnapshot(canvas: HTMLCanvasElement, filename: string): void {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
  }
}
