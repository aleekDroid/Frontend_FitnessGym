import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsQR from 'jsqr';

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
  private barcodeRunning = false;
  private zxingReader: any = null;

  // Recursos jsQR
  private videoStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private scanInterval: any = null;

  // ── ANTI-DUPLICATE GUARD ──
  // Semáforo síncrono: se activa en el mismo tick en que se detecta el QR,
  // antes de cualquier petición HTTP o ciclo de change detection de Angular.
  private isProcessing = false;
  // En modo autoservicio: evita re-escanear el mismo código físico cuando
  // el status vuelve a 'idle' mientras el QR sigue apuntando a la cámara.
  private lastScannedCode = '';
  private cooldownTimer: any = null;
  private readonly UNSUPERVISED_COOLDOWN_MS = 4000; // 1s extra sobre los 3s del status

  // Confirmación por mayoría para barcode
  private lastBarcode = '';
  private barcodeConfirmCount = 0;
  private readonly BARCODE_CONFIRM_THRESHOLD = 3;

  errorMessage = '';

  // Camera Controls
  isTorchSupported = false;
  isTorchOn = false;
  isZoomSupported = false;
  isZoomOn = false;

  private readonly successAudio = new Audio('audio/success.mp3');
  private readonly errorAudio = new Audio('audio/error.mp3');

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
          ? Math.min(2, capabilities.zoom?.max ?? 2)
          : (capabilities.zoom?.min ?? 1);
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
    } else if (newStatus === 'idle') {
      // Cuando el parent termina de procesar (status vuelve a idle),
      // liberamos el semáforo. En modo autoservicio el cooldown ya expiró
      // (o expirará), por lo que no es necesario liberar aquí manualmente.
      if (!this.unsupervised) {
        this.isProcessing = false;
      }
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

    // Semáforo síncrono: bloquea inmediatamente, sin depender del @Input status
    // ni del ciclo de change detection de Angular.
    if (this.isProcessing) return;

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
      // En modo autoservicio: ignorar si es el mismo código dentro del cooldown
      if (this.unsupervised && code.data === this.lastScannedCode) return;

      // Activar semáforo síncronamente — antes de cualquier async/emit
      this.isProcessing = true;
      this.lastScannedCode = code.data;

      this.scanSuccess.emit(code.data);

      if (this.unsupervised) {
        // Modo autoservicio: liberar el semáforo y permitir un nuevo escaneo
        // solo después del cooldown (status 3s + 1s de margen)
        if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
        this.cooldownTimer = setTimeout(() => {
          this.isProcessing = false;
          this.lastScannedCode = '';
          this.cooldownTimer = null;
        }, this.UNSUPERVISED_COOLDOWN_MS);
      } else {
        // Modo supervisado: cerrar el scanner y resetear cuando el parent
        // confirme el resultado (handleStatusChange -> idle)
        this.stopScanner();
      }
    }
  }

  private async startQuagga(): Promise<void> {
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

      const track = this.videoStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      this.isTorchSupported = !!capabilities?.torch;
      this.isZoomSupported = !!capabilities?.zoom;

      this.barcodeRunning = true;

      // BarcodeDetector nativo (Chrome Android/Desktop) — GPU-acelerado
      if ('BarcodeDetector' in globalThis) {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8'] });

        this.scanInterval = setInterval(async () => {
          if (!this.videoEl || !this.barcodeRunning) return;
          if (this.videoEl.readyState !== this.videoEl.HAVE_ENOUGH_DATA) return;
          if (this.status !== 'idle') return;

          try {
            const barcodes = await detector.detect(this.videoEl);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              this.confirmBarcode(barcodes[0].rawValue);
            }
          } catch (e) {
            // Ignorar AbortError esperado cuando se suspende o salta un frame
            if (e instanceof Error && e.name !== 'AbortError') {
              console.warn('Native barcode detection failed:', e);
            }
          }
        }, 100);

      } else {
        // Fallback ZXing para Firefox/Safari — ImageData directo sin base64
        const {
          MultiFormatReader, BarcodeFormat, DecodeHintType,
          RGBLuminanceSource, BinaryBitmap, HybridBinarizer,
        } = await import('@zxing/library');

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const zxReader = new MultiFormatReader();
        zxReader.setHints(hints);
        this.zxingReader = zxReader;

        this.scanInterval = setInterval(() => {
          if (!this.videoEl || !this.canvasEl || !this.barcodeRunning) return;
          if (this.videoEl.readyState !== this.videoEl.HAVE_ENOUGH_DATA) return;
          if (this.status !== 'idle') return;

          const ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          this.canvasEl.width = this.videoEl.videoWidth;
          this.canvasEl.height = this.videoEl.videoHeight;
          ctx.drawImage(this.videoEl, 0, 0);

          try {
            const imageData = ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height);
            const imageBuffer = imageData.data;
            const width = this.canvasEl.width;
            const height = this.canvasEl.height;
            const grayscaleBuffer = new Uint8ClampedArray(width * height);
            
            for (let i = 0, j = 0, len = imageBuffer.length; i < len; i += 4, j++) {
              const alpha = imageBuffer[i + 3];
              if (alpha === 0) {
                grayscaleBuffer[j] = 0xFF;
              } else {
                const pixelR = imageBuffer[i];
                const pixelG = imageBuffer[i + 1];
                const pixelB = imageBuffer[i + 2];
                // Fórmulas estándar de luminancia sRGB
                grayscaleBuffer[j] = (306 * pixelR + 601 * pixelG + 117 * pixelB + 0x200) >> 10;
              }
            }

            const luminance = new RGBLuminanceSource(grayscaleBuffer, width, height);
            const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
            const result = zxReader.decode(bitmap);
            const code = result.getText();
            if (code) this.confirmBarcode(code);
          } catch (e) {
            // Ignorar NotFoundException esperado cuando no hay código en el frame
            if (e instanceof Error && e.name !== 'NotFoundException') {
              console.warn('ZXing decoding error:', e);
            }
          }
        }, 100);
      }

    } catch (err) {
      console.error('Unable to start barcode scanner', err);
      this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
    }
  }

  private confirmBarcode(code: string): void {
    // Aplicar el mismo semáforo al flujo de barcode
    if (this.isProcessing) return;

    if (code === this.lastBarcode) {
      this.barcodeConfirmCount++;
    } else {
      this.lastBarcode = code;
      this.barcodeConfirmCount = 1;
    }

    if (this.barcodeConfirmCount >= this.BARCODE_CONFIRM_THRESHOLD) {
      this.isProcessing = true;
      this.barcodeConfirmCount = 0;
      this.lastBarcode = '';
      this.scanSuccess.emit(code);
      this.stopScanner();
    }
  }

  private async stopScanner(): Promise<void> {
    try {
      if (this.isTorchOn) await this.toggleTorch();

      // Cancelar cooldown pendiente si el scanner se cierra manualmente
      if (this.cooldownTimer) {
        clearTimeout(this.cooldownTimer);
        this.cooldownTimer = null;
      }

      // Detener loop de jsQR
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }

      // Resetear estado de barcode y liberar ZXing
      if (this.barcodeRunning) {
        this.barcodeRunning = false;
        this.lastBarcode = '';
        this.barcodeConfirmCount = 0;
      }
      if (this.zxingReader) {
        this.zxingReader = null;
      }

      // Resetear semáforo y cooldown al cerrar
      this.isProcessing = false;
      this.lastScannedCode = '';

      // Detener stream y limpiar DOM
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

    } catch (err) {
      console.error('Error stopping scanner', err);
    }
  }
}
