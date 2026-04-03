// src/app/shared/components/qr-scanner-modal/qr-scanner-modal.component.ts
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-scanner-modal.component.html',
  styleUrls: ['./qr-scanner-modal.component.scss']
})
export class QrScannerModalComponent implements OnInit, OnDestroy {
  @Output() scanSuccess = new EventEmitter<string>();
  @Output() closeScanner = new EventEmitter<void>();

  private html5QrCode: Html5Qrcode | null = null;
  errorMessage: string = '';

  ngOnInit(): void {
    // We delay the initialization slightly to ensure the element is in the DOM
    setTimeout(() => {
      this.startScanner();
    }, 300);
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private async startScanner(): Promise<void> {
    try {
      this.html5QrCode = new Html5Qrcode("reader");
      
      const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        // formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
      };

      await this.html5QrCode.start(
        { facingMode: "environment" }, // Prefer back camera
        config,
        (decodedText) => {
          if (decodedText) {
            this.scanSuccess.emit(decodedText);
            this.stopScanner();
          }
        },
        (errorMessage) => {
          // Silent errors for real-time scanning
        }
      );
    } catch (err) {
      console.error("Unable to start scanner", err);
      this.errorMessage = "No se pudo acceder a la cámara. Verifica los permisos.";
    }
  }

  private async stopScanner(): Promise<void> {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  }
}
