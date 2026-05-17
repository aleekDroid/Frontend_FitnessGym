// src/app/pages/admin/inventory/product-details/product-details.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductsService } from '../../../../core/services/products.service';
import { Product } from '../../../../core/models/product.model';
import { StatusConfirmModalComponent } from '../../../../shared/components/status-confirm-modal/status-confirm-modal.component';
import { ProductFormModalComponent } from '../../../../shared/components/product-form-modal/product-form-modal.component';
import { StockAdjustmentModalComponent } from '../../../../shared/components/stock-adjustment-modal/stock-adjustment-modal.component';
import { MovementDetailsModalComponent } from '../../../../shared/components/movement-details-modal/movement-details-modal.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    FormsModule, 
    StatusConfirmModalComponent, 
    ProductFormModalComponent,
    StockAdjustmentModalComponent,
    MovementDetailsModalComponent
  ],
  templateUrl: './product-details.html',
  styleUrls: ['./product-details.scss']
})
export class ProductDetails implements OnInit {
  productId: number | null = null;
  product = signal<Product | null>(null);
  loading = signal(true);
  saving = signal(false);
  Math = Math;
  
  movements = signal<any[]>([]);
  loadingHistory = signal(false);

  historyPage = signal(1);
  historyLimit = signal(10);
  historyTotal = signal(0);
  historyTotalPages = signal(0);
  historySearch = signal('');
  historyStartDate = signal('');
  historyEndDate = signal('');
  historyType = signal('');

  private readonly searchSubject = new Subject<string>();

  showEditModal = signal(false);
  productForm: FormGroup;

  showStockModal = signal(false);
  savingStock = signal(false);

  showMovementModal = signal(false);
  selectedMovement = signal<any>(null);

  showStatusModal = signal(false);
  togglingStatus = signal(false);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productsService: ProductsService,
    private readonly fb: FormBuilder,
    private readonly notificationService: NotificationService
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      serialNumber: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]], // Kept for type safety, but unused in edit
      description: ['']
    });
  }

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.historySearch.set(query);
      this.historyPage.set(1);
      this.loadHistory();
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId = +id;
        this.loadProduct();
        this.loadHistory();
      }
    });
  }

  loadProduct(): void {
    if (!this.productId) return;
    this.loading.set(true);
    this.productsService.getById(this.productId).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.goBack();
      }
    });
  }

  loadHistory(): void {
    if (!this.productId) return;
    this.loadingHistory.set(true);
    
    this.productsService.getProductHistory(
      this.productId,
      this.historyPage(),
      this.historyLimit(),
      this.historySearch(),
      this.historyStartDate(),
      this.historyEndDate(),
      this.historyType()
    ).subscribe({
      next: (res) => {
        this.movements.set(res.data);
        this.historyTotal.set(res.meta.totalItems);
        this.historyTotalPages.set(res.meta.totalPages);
        this.historyPage.set(res.meta.currentPage);
        this.loadingHistory.set(false);
      },
      error: (err) => {
        console.error('Error fetching history', err);
        this.loadingHistory.set(false);
      }
    });
  }

  onHistorySearch(val: string): void {
    this.searchSubject.next(val);
  }

  onHistoryStartDateChange(val: string): void {
    this.historyStartDate.set(val);
    if (val && this.historyEndDate() && val > this.historyEndDate()) {
      this.historyEndDate.set(val);
    }
    this.onHistoryFilterChange();
  }

  onHistoryEndDateChange(val: string): void {
    this.historyEndDate.set(val);
    if (val && this.historyStartDate() && val < this.historyStartDate()) {
      this.historyStartDate.set(val);
    }
    this.onHistoryFilterChange();
  }

  onHistoryFilterChange(): void {
    this.historyPage.set(1);
    this.loadHistory();
  }

  onHistoryLimitChange(newLimit: number): void {
    this.historyLimit.set(newLimit);
    this.historyPage.set(1);
    this.loadHistory();
  }

  goToHistoryPage(page: number): void {
    if (page >= 1 && page <= this.historyTotalPages()) {
      this.historyPage.set(page);
      this.loadHistory();
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/inventory']);
  }

  openEdit(): void {
    this.showEditModal.set(true);
  }

  handleSave(val: any): void {
    if (!this.product()) return;
    
    this.saving.set(true);
    // Exclude stock from general info update
    const { stock, ...updatePayload } = val;
    const payload = { id: this.product()!.id, ...updatePayload };

    this.productsService.update(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEditModal();
        this.notificationService.show('Producto actualizado correctamente.', 'success');
        this.loadProduct(); // Reload the updated product information from the API!
      },
      error: (err) => {
        console.error('Error updating product:', err);
        this.saving.set(false);
        this.notificationService.show(err.error?.message || 'Error al actualizar el producto.', 'error');
      }
    });
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  openStockModal(): void {
    this.showStockModal.set(true);
  }

  closeStockModal(): void {
    this.showStockModal.set(false);
  }

  openMovementDetails(m: any): void {
    this.selectedMovement.set(m);
    this.showMovementModal.set(true);
  }

  closeMovementModal(): void {
    this.showMovementModal.set(false);
    this.selectedMovement.set(null);
  }

  openStatusModal(): void {
    this.showStatusModal.set(true);
  }

  closeStatusModal(): void {
    this.showStatusModal.set(false);
  }

  confirmToggleStatus(): void {
    const p = this.product();
    if (!p) return;
    this.togglingStatus.set(true);
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    this.productsService.toggleStatus(p.id, newStatus).subscribe({
      next: () => {
        this.togglingStatus.set(false);
        this.closeStatusModal();
        this.loadProduct();
      },
      error: () => this.togglingStatus.set(false)
    });
  }

  onSubmitStock(val: any): void {
    if (!this.productId) return;
    
    this.savingStock.set(true);
    this.productsService.updateStock(this.productId, val.quantity, val.type, val.reason).subscribe({
      next: () => {
        this.savingStock.set(false);
        this.closeStockModal();
        this.loadProduct();
        this.loadHistory(); // Reload history after update!
      },
      error: () => this.savingStock.set(false)
    });
  }

  formatDate(dateStr: string): string {
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


