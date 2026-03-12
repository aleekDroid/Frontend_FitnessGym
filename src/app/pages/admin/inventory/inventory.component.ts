import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductsService } from '../../../core/services/products.service';
import { Product, CreateProductDto } from '../../../core/models/product.model';
import { StatusConfirmModalComponent } from '../../../shared/components/status-confirm-modal/status-confirm-modal.component';
import { ProductFormModalComponent } from '../../../shared/components/product-form-modal/product-form-modal.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StatusConfirmModalComponent, ProductFormModalComponent],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class InventoryComponent implements OnInit {
  products = signal<Product[]>([]);
  loading = signal(true);
  saving = signal(false);
  togglingStatus = signal(false);

  // Pagination & Search
  searchQuery = signal('');
  filterStatus = signal<'active' | 'inactive' | ''>('');
  filterMinStock = signal<number | null>(null);
  filterMaxStock = signal<number | null>(null);
  filterMinPrice = signal<number | null>(null);
  filterMaxPrice = signal<number | null>(null);
  
  currentPage = signal(1);
  limit = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);
  private searchSubject = new Subject<string>();

  showModal = signal(false);
  editProduct = signal<Product | null>(null);
  statusTarget = signal<Product | null>(null);
  showStatusConfirm = signal(false);

  productForm: FormGroup;

  constructor(
    private productsService: ProductsService, 
    private fb: FormBuilder,
    private router: Router
  ) {
    this.productForm = this.fb.group({
      name:          ['', Validators.required],
      serialNumber: ['', Validators.required],
      price:         ['', [Validators.required, Validators.min(0)]],
      stock:         ['', [Validators.required, Validators.min(0)]],
      description:   [''],
    });
  }

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.loadData();
    });

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    const status = this.filterStatus() || undefined;
    const minS = this.filterMinStock();
    const maxS = this.filterMaxStock();
    const minP = this.filterMinPrice();
    const maxP = this.filterMaxPrice();

    this.productsService.getProducts(
      this.currentPage(),
      this.limit(),
      this.searchQuery(),
      status,
      minS !== null ? minS : undefined,
      maxS !== null ? maxS : undefined,
      minP !== null ? minP : undefined,
      maxP !== null ? maxP : undefined
    ).subscribe({
      next: res => {
        this.products.set(res.data);
        this.totalItems.set(res.meta.totalItems);
        this.totalPages.set(res.meta.totalPages);
        this.currentPage.set(res.meta.currentPage);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch(val: string): void {
    this.searchSubject.next(val);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  onLimitChange(newLimit: number): void {
    this.limit.set(newLimit);
    this.currentPage.set(1);
    this.loadData();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadData();
    }
  }

  openCreate(): void {
    this.editProduct.set(null);
    this.productForm.reset();
    this.showModal.set(true);
  }

  viewDetails(p: Product): void {
    this.router.navigate(['/admin/inventory', p.id]);
  }

  openEdit(p: Product): void {
    this.editProduct.set(p);
    this.productForm.patchValue({ name: p.name, serialNumber: p.serialNumber, price: p.price, stock: p.stock, description: p.description });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.productForm.reset(); }

  handleSave(val: any): void {
    this.saving.set(true);

    if (this.editProduct()) {
      // Exclude stock from the update payload
      const { stock, ...updatePayload } = val;
      const payload = { id: this.editProduct()!.id, ...updatePayload };
      this.productsService.update(payload).subscribe(() => { 
        this.saving.set(false); 
        this.closeModal(); 
        this.loadData(); 
      });
    } else {
      this.productsService.create(val as CreateProductDto).subscribe(() => { 
        this.saving.set(false); 
        this.closeModal(); 
        this.loadData(); 
      });
    }
  }

  confirmToggleStatus(p: Product): void { this.statusTarget.set(p); this.showStatusConfirm.set(true); }
  cancelToggleStatus(): void { this.showStatusConfirm.set(false); this.statusTarget.set(null); }
  doToggleStatus(): void {
    if (!this.statusTarget()) return;
    const p = this.statusTarget()!;
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    this.productsService.toggleStatus(p.id, newStatus).subscribe(() => { this.cancelToggleStatus(); this.loadData(); });
  }

  get f() { return this.productForm.controls; }

  stockStatus(stock: number): string {
    if (stock === 0) return 'sin-stock';
    if (stock <= 3) return 'bajo';
    return 'ok';
  }
}
