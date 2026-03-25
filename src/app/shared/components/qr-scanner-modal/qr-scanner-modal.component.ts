import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-scanner-modal.component.html',
  styleUrls: ['./qr-scanner-modal.component.scss']
})
export class QrScannerModalComponent implements OnInit, OnDestroy {
  @Output() scanSuccess = new EventEmitter<number>();
  @Output() closeScanner = new EventEmitter<void>();

  private scanner: Html5QrcodeScanner | null = null;

  ngOnInit(): void {
    // We delay the initialization slightly to ensure the element is in the DOM
    setTimeout(() => {
      this.initScanner();
    }, 100);
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private initScanner(): void {
    this.scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
      },
      /* verbose= */ false
    );

    this.scanner.render(
      (decodedText) => {
        const idUser = Number.parseInt(decodedText, 10);
        if (!Number.isNaN(idUser)) {
          this.scanSuccess.emit(idUser);
          this.stopScanner();
        }
      },
      (errorMessage) => {
        // scanner error
      }
    );

  }

  private stopScanner(): void {
    if (this.scanner) {
      this.scanner.clear().catch(err => console.error("Error stopping scanner", err));
      this.scanner = null;
    }
  }
}
