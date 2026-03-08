import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { TransactionDetail } from '../../../core/models/subscription.model';

@Component({
  selector: 'app-transaction-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transaction-detail-modal.component.html',
  styleUrls: ['./transaction-detail-modal.component.scss']
})
export class TransactionDetailModalComponent implements OnInit {
  @Input() transactionId!: number;
  @Input() currentUserId?: number; // Permite saber si el beneficiario es el usuario de la vista actual
  @Output() closeEvent = new EventEmitter<void>();

  detail = signal<TransactionDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private subscriptionsService: SubscriptionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDetail();
  }

  loadDetail(): void {
    this.loading.set(true);
    this.subscriptionsService.getTransactionDetail(this.transactionId).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching transaction details:', err);
        this.error.set('No se pudo cargar el detalle de la transacción.');
        this.loading.set(false);
      }
    });
  }

  closeModal(): void {
    this.closeEvent.emit();
  }

  viewUserProfile(userId: number): void {
    this.closeModal();
    this.router.navigate(['/admin/users', userId]);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia'
    };
    return labels[method] || method;
  }
}
