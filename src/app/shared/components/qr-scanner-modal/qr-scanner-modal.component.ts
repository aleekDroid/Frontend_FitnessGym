import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-scanner-modal.component.html',
  styleUrls: ['./qr-scanner-modal.component.scss']
})
export class QrScannerModalComponent implements OnInit, OnDestroy, OnChanges {
  /** 'qr' → área cuadrada para códigos QR (asistencias)
   *  'barcode' → área rectangular para códigos de barras (inventario/ventas) */
  @Input() mode: 'qr' | 'barcode' = 'qr';

  /** Si está activo, el modal no se cierra solo y muestra feedback visual grande */
  @Input() unsupervised = false;

  /** Estado actual del escaneo para mostrar feedback visual y auditivo */
  @Input() status: 'idle' | 'success' | 'error' = 'idle';

  @Output() unsupervisedChange = new EventEmitter<boolean>();
  @Output() scanSuccess = new EventEmitter<string>();
  @Output() closeScanner = new EventEmitter<void>();

  private html5QrCode: Html5Qrcode | null = null;
  private isStarting = false;
  errorMessage = '';

  toggleUnsupervised(): void {
    this.unsupervisedChange.emit(!this.unsupervised);
  }


  // Audio objects to reuse
  private successAudio = new Audio('audio/success.mp3');
  private errorAudio = new Audio('audio/error.mp3');

  get hintText(): string {
    if (this.unsupervised) return 'Modo Automático Activo';
    return this.mode === 'qr'
      ? 'Apunta la cámara al código QR del usuario.'
      : 'Apunta la cámara al código de barras del producto.';
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
      // 1. Elegimos solo los formatos necesarios según el modo (Aumenta MUCHO el rendimiento)
      const formatsToSupport = this.mode === 'qr'
        ? [Html5QrcodeSupportedFormats.QR_CODE]
        : [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ];

      this.html5QrCode = new Html5Qrcode('reader', {
        formatsToSupport: formatsToSupport,
        verbose: false,
      });

      // 2. Quitamos el 'qrbox' para que escanee todo el frame visible (mejor responsividad)
      const scanConfig = {
        fps: 15,
        aspectRatio: this.mode === 'qr' ? 1 : 1.777778,
        disableFlip: this.mode === 'barcode', // Desactivar flip mejora la velocidad en barcodes
      };

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        scanConfig,
        (decodedText) => {
          // Solo emitimos si no estamos mostrando un resultado previo
          if (decodedText && this.status === 'idle') {
            this.scanSuccess.emit(decodedText);
            
            // Si no es autoservicio, detenemos todo para dejar pasar al parent
            if (!this.unsupervised) {
              this.stopScanner();
            }
          }
        },
        (_errorMessage) => {
          // Silent errors during real-time scanning
        }
      );
    } catch (err) {
      console.error('Unable to start scanner', err);
      this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
    } finally {
      this.isStarting = false;
    }
  }

  private async stopScanner(): Promise<void> {
    try {
      if (this.html5QrCode?.isScanning) {
        await this.html5QrCode.stop();
      }
      this.html5QrCode?.clear();
    } catch (err) {
      console.error('Error stopping scanner', err);
    } finally {
      this.html5QrCode = null;
    }
  }
}
