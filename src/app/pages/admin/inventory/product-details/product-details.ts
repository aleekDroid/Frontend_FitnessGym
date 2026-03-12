
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductsService } from '../../../../core/services/products.service';
import { Product } from '../../../../core/models/product.model';
import { StatusConfirmModalComponent } from '../../../../shared/components/status-confirm-modal/status-confirm-modal.component';
import { ProductFormModalComponent } from '../../../../shared/components/product-form-modal/product-form-modal.component';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, StatusConfirmModalComponent, ProductFormModalComponent],
  templateUrl: './product-details.html',
  styleUrls: ['./product-details.scss']
})
export class ProductDetails implements OnInit {
  productId: number | null = null;
  product = signal<Product | null>(null);
  loading = signal(true);
  saving = signal(false);
  
  movements = signal<any[]>([]);

  showEditModal = signal(false);
  productForm: FormGroup;

  showStockModal = signal(false);
  savingStock = signal(false);
  stockForm: FormGroup;

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

    this.stockForm = this.fb.group({
      quantity: [1, Validators.required],
      type: ['restock', Validators.required],
      reason: ['', Validators.required]
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
        
        // Add movements
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
        
        // Add sales
        if (res.sales) {
          res.sales.forEach(s => {
            // Check if this sale is already represented in movements
            const existingSale = combined.find(m => m.type === 'sale' && m.description.includes(`Transacción #${s.id}`));
            if (!existingSale) {
              combined.push({
                id: `s-${s.id}`,
                type: 'sale',
                quantity: -s.quantity, // Sales reduce stock
                date: s.createdAt,
                description: `Venta #${s.id} (${s.paymentMethod})`,
                raw: s
              });
            }
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
    this.stockForm.reset({ quantity: 1, type: 'restock', reason: '' });
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

  // onSubmit() was replaced by handleSave()!

  onSubmitStock(): void {
    if (this.stockForm.invalid || !this.productId) {
      this.stockForm.markAllAsTouched();
      return;
    }
    
    this.savingStock.set(true);
    const val = this.stockForm.value;
    
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
}
