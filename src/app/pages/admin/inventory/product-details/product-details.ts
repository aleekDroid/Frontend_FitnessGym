
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductsService } from '../../../../core/services/products.service';
import { Product } from '../../../../core/models/product.model';
import { StatusConfirmModalComponent } from '../../../../shared/components/status-confirm-modal/status-confirm-modal.component';
import { ProductFormModalComponent } from '../../../../shared/components/product-form-modal/product-form-modal.component';
import { StockAdjustmentModalComponent } from '../../../../shared/components/stock-adjustment-modal/stock-adjustment-modal.component';
import { MovementDetailsModalComponent } from '../../../../shared/components/movement-details-modal/movement-details-modal.component';

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

  showEditModal = signal(false);
  productForm: FormGroup;

  showStockModal = signal(false);
  savingStock = signal(false);

  showMovementModal = signal(false);
  selectedMovement = signal<any | null>(null);

  showStatusModal = signal(false);
  togglingStatus = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productsService: ProductsService,
    private fb: FormBuilder
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
    this.productsService.getProductHistory(this.productId).subscribe({
      next: (res) => {
        const combined: any[] = [];
        
        // Add manual or administrative movements
        if (res.movements) {
          res.movements.forEach(m => {
            combined.push({
              id: `m-${m.id}`,
              type: m.type,
              quantity: m.quantity,
              date: m.createdAt,
              description: m.reason || 'Movimiento de inventario',
              raw: m
            });
          });
        }
        
        // Add actual sales
        if (res.sales) {
          res.sales.forEach(s => {
            combined.push({
              id: `s-${s.id}`,
              type: 'sale',
              quantity: -s.quantity, // Sales always reduce stock
              date: s.createdAt,
              description: `Venta #${s.id} (${this.translatePaymentMethod(s.paymentMethod)})`,
              raw: s
            });
          });
        }

        
        // Sort descending by date
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.movements.set(combined);
      },
      error: (err) => console.error('Error fetching history', err)
    });
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
      next: (updatedProduct) => {
        this.product.set(updatedProduct);
        this.saving.set(false);
        this.closeEditModal();
        // Toast is likely handled by a global interceptor or we should add one here
      },
      error: (err) => {
        console.error('Error updating product:', err);
        this.saving.set(false);
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


