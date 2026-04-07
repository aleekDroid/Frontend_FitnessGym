import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsQR from 'jsqr';
import Quagga from '@ericblade/quagga2';

declare var BarcodeDetector: any;

@Component({
  selector: 'app-qr-scanner-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-scanner-modal.component.html',
  styleUrls: ['./qr-scanner-modal.component.scss']
})
export class QrScannerModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() mode: 'qr' | 'barcode' = 'qr';
  @Input() unsupervised = false;
  @Input() status: 'idle' | 'success' | 'error' = 'idle';

  @Output() unsupervisedChange = new EventEmitter<boolean>();
  @Output() scanSuccess = new EventEmitter<string>();
  @Output() closeScanner = new EventEmitter<void>();

  private isStarting = false;
  private quaggaRunning = false;

  // Recursos jsQR
  private videoStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private scanInterval: any = null;
  errorMessage = '';

  // Camera Controls
  isTorchSupported = false;
  isTorchOn = false;
  isZoomSupported = false;
  isZoomOn = false;

  private successAudio = new Audio('audio/success.mp3');
  private errorAudio = new Audio('audio/error.mp3');

  get hintText(): string {
    if (this.unsupervised) return 'Modo Automático Activo';
    return this.mode === 'qr'
      ? 'Apunta al código QR'
      : 'Apunta al código de barras';
  }

  ngOnInit(): void {
    setTimeout(() => this.startScanner(), 500);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['status'] && !changes['status'].firstChange) {
      this.handleStatusChange(changes['status'].currentValue);
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  toggleUnsupervised(): void {
    this.unsupervisedChange.emit(!this.unsupervised);
  }

  async toggleTorch(): Promise<void> {
    if (!this.isTorchSupported) return;
    try {
      this.isTorchOn = !this.isTorchOn;
      const track = this.videoStream?.getVideoTracks()[0];
      if (track) {
        await (track as any).applyConstraints({
          advanced: [{ torch: this.isTorchOn }]
        });
      }
    } catch (err) {
      console.error('Error toggling torch', err);
      this.isTorchOn = !this.isTorchOn;
    }
  }

  async toggleZoom(): Promise<void> {
    if (!this.isZoomSupported) return;
    try {
      this.isZoomOn = !this.isZoomOn;
      const track = this.videoStream?.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities() as any;
        const zoomValue = this.isZoomOn
          ? Math.min(2.0, capabilities.zoom?.max ?? 2.0)
          : (capabilities.zoom?.min ?? 1.0);
        await (track as any).applyConstraints({
          advanced: [{ zoom: zoomValue }]
        });
      }
    } catch (err) {
      console.error('Error toggling zoom', err);
      this.isZoomOn = !this.isZoomOn;
    }
  }

  private handleStatusChange(newStatus: 'idle' | 'success' | 'error'): void {
    if (newStatus === 'success') {
      this.successAudio.play().catch(e => console.log('Audio play failed', e));
    } else if (newStatus === 'error') {
      this.errorAudio.play().catch(e => console.log('Audio play failed', e));
    }
  }

  private async startScanner(): Promise<void> {
    if (this.isStarting) return;
    this.isStarting = true;
    try {
      if (this.mode === 'barcode') {
        await this.startQuagga();
      } else {
        await this.startJsQr();
      }
    } finally {
      this.isStarting = false;
    }
  }

  private async startJsQr(): Promise<void> {
    try {
      const reader = document.getElementById('reader') as HTMLElement;
      if (reader) reader.innerHTML = '';

      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = this.videoStream;
      this.videoEl.setAttribute('playsinline', 'true');
      this.videoEl.setAttribute('autoplay', 'true');
      this.videoEl.style.width = '100%';
      this.videoEl.style.height = '100%';
      this.videoEl.style.objectFit = 'cover';
      reader.appendChild(this.videoEl);

      this.canvasEl = document.createElement('canvas');
      this.canvasEl.style.display = 'none';
      reader.appendChild(this.canvasEl);

      await this.videoEl.play();

      // Verificar capacidades de torch y zoom
      const track = this.videoStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      this.isTorchSupported = !!capabilities?.torch;
      this.isZoomSupported = !!capabilities?.zoom;

      // Loop de escaneo a 12fps
      this.scanInterval = setInterval(() => {
        this.scanFrameWithJsQr();
      }, 1000 / 12);

    } catch (err) {
      console.error('Unable to start QR scanner', err);
      this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
    }
  }

  private scanFrameWithJsQr(): void {
    if (!this.videoEl || !this.canvasEl) return;
    if (this.videoEl.readyState !== this.videoEl.HAVE_ENOUGH_DATA) return;
    if (this.status !== 'idle') return;

    const video = this.videoEl;
    const canvas = this.canvasEl;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code?.data) {
      this.scanSuccess.emit(code.data);
      if (!this.unsupervised) this.stopScanner();
    }
  }

  private async startQuagga(): Promise<void> {
    const reader = document.getElementById('reader') as HTMLElement;
    if (reader) reader.innerHTML = '';

    return new Promise((resolve, reject) => {
      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: document.getElementById('reader') as HTMLElement,
            constraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          decoder: {
            readers: [
              'ean_reader',   // EAN-13 — estándar en todos los productos mexicanos
              'ean_8_reader', // EAN-8 — productos pequeños (chicles, pilas, etc.)
            ],
            multiple: false,
          },
          locate: true,
          frequency: 10,
        },
        (err) => {
          if (err) {
            console.error('Quagga init error', err);
            this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
            reject(err);
            return;
          }
          Quagga.start();
          this.quaggaRunning = true;
          resolve();
        }
      );

      Quagga.onDetected((result) => {
        const code = result?.codeResult?.code;
        if (code && this.status === 'idle') {
          this.scanSuccess.emit(code);
          this.stopScanner();
        }
      });
    });
  }

  private async stopScanner(): Promise<void> {
    try {
      if (this.isTorchOn) await this.toggleTorch();

      // Detener loop de jsQR
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }

      // Detener Quagga y liberar su stream
      if (this.quaggaRunning) {
        Quagga.offDetected();
        try {
          // Some versions of Quagga.stop don't return a promise but user syntax allows it or catching is safe
          await Quagga.stop();
        } catch(e) {}
        this.quaggaRunning = false;
      }

      // Detener stream de jsQR y limpiar DOM
      if (this.videoStream) {
        this.videoStream.getTracks().forEach(t => t.stop());
        this.videoStream = null;
      }
      if (this.videoEl) {
        this.videoEl.srcObject = null;
        this.videoEl.remove();
        this.videoEl = null;
      }
      if (this.canvasEl) {
        this.canvasEl.remove();
        this.canvasEl = null;
      }

      // Seguridad: limpiar cualquier track huérfano de Quagga en el DOM
      document.querySelectorAll('video').forEach(video => {
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          video.srcObject = null;
        }
      });

    } catch (err) {
      console.error('Error stopping scanner', err);
    }
  }
}
