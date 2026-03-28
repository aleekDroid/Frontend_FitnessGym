import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-movement-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movement-details-modal.component.html',
  styleUrl: './movement-details-modal.component.scss'
})
export class MovementDetailsModalComponent {
  @Input() movement: any | null = null;
  @Output() closeEvent = new EventEmitter<void>();

  Math = Math;

  closeModal(): void {
    this.closeEvent.emit();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  translatePaymentMethod(method: string): string {
    const map: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia'
    };
    return map[method?.toLowerCase()] || method;
  }

  translateType(type: string): string {
    const map: Record<string, string> = {
      sale: 'Venta',
      restock: 'Reabastecimiento',
      adjustment: 'Ajuste',
      return: 'Devolución',
      damage: 'Daño/Pérdida'
    };
    return map[type?.toLowerCase()] || type;
  }
}
