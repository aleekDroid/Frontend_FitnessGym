// src/app/shared/components/status-confirm-modal/status-confirm-modal.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-confirm-modal.component.html',
  styleUrl: './status-confirm-modal.component.scss'
})
export class StatusConfirmModalComponent {
  @Input() entityType: string = 'elemento'; 
  @Input() entityName: string = '';
  @Input() isActive: boolean = true;
  @Input() isLoading: boolean = false;
  @Input() warningMessage: string | null = null;
  @Input() customTitle: string | null = null;
  @Input() customMessage: string | null = null;
  @Input() confirmBtnText: string | null = null;
  
  @Output() closeEvent = new EventEmitter<void>();
  @Output() confirmEvent = new EventEmitter<void>();

  closeModal(): void {
    if (!this.isLoading) {
      this.closeEvent.emit();
    }
  }

  confirm(): void {
    if (!this.isLoading) {
      this.confirmEvent.emit();
    }
  }
}
