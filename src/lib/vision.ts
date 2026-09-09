// Service de capture d'écran et de flux vidéo pour la Vision du Compagnon
export class CompanionVisionService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private onStopCallback: (() => void) | null = null;

  public isSharing(): boolean {
    return !!this.stream && this.stream.active && this.stream.getVideoTracks().some((t) => t.readyState === 'live');
  }

  public async startScreenShare(onStop?: () => void): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      console.warn("L'API Screen Capture (getDisplayMedia) n'est pas disponible sur ce navigateur.");
      return false;
    }

    // Arrêter tout partage existant
    this.stopScreenShare();
    this.onStopCallback = onStop || null;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { max: 15 },
        } as any,
        audio: false,
      });

      this.stream = stream;

      // Élément vidéo masqué pour le rendu des frames
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      this.videoElement = video;

      await video.play().catch((e) => {
        console.warn('Lecture du flux vidéo de capture :', e);
      });

      // Détecter si l'utilisateur coupe le partage depuis le bouton natif du navigateur
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          this.cleanup();
          if (this.onStopCallback) {
            this.onStopCallback();
          }
        };
      }

      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn("Erreur lors de l'activation du partage d'écran :", err);
      }
      this.cleanup();
      return false;
    }
  }

  public captureFrameBase64(): string | null {
    if (!this.videoElement || !this.isSharing()) {
      return null;
    }

    const video = this.videoElement;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const maxDim = 1280;
      let targetW = video.videoWidth;
      let targetH = video.videoHeight;

      if (targetW > maxDim) {
        const ratio = maxDim / targetW;
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
      }

      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, targetW, targetH);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Only = dataUrl.split(',')[1];
      return base64Only || null;
    } catch (err) {
      console.warn("Erreur lors de la capture d'une frame d'écran :", err);
      return null;
    }
  }

  public stopScreenShare(): void {
    this.cleanup();
    if (this.onStopCallback) {
      this.onStopCallback();
      this.onStopCallback = null;
    }
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.stream = null;
    }

    if (this.videoElement) {
      try {
        this.videoElement.srcObject = null;
      } catch {}
      this.videoElement = null;
    }
  }
}

export const visionManager = new CompanionVisionService();
