// src/app/pages/admin/inventory/inventory.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductsService } from '../../../core/services/products.service';
import { Product, CreateProductDto } from '../../../core/models/product.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class InventoryComponent implements OnInit {
  products = signal<Product[]>([]);
  searchQuery = signal('');
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  editProduct = signal<Product | null>(null);
  deleteTarget = signal<Product | null>(null);
  showDeleteConfirm = signal(false);

  productForm: FormGroup;

  constructor(private productsService: ProductsService, private fb: FormBuilder) {
    this.productForm = this.fb.group({
      name:          ['', Validators.required],
      serial_number: ['', Validators.required],
      price:         ['', [Validators.required, Validators.min(0)]],
      stock:         ['', [Validators.required, Validators.min(0)]],
      description:   [''],
    });
  }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading.set(true);
    this.productsService.getAll().subscribe(p => { this.products.set(p); this.loading.set(false); });
  }

  get filtered(): Product[] {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(q) || p.serial_number.toLowerCase().includes(q));
  }

  onSearch(val: string): void { this.searchQuery.set(val); }

  openCreate(): void {
    this.editProduct.set(null);
    this.productForm.reset();
    this.showModal.set(true);
  }

  openEdit(p: Product): void {
    this.editProduct.set(p);
    this.productForm.patchValue({ name: p.name, serial_number: p.serial_number, price: p.price, stock: p.stock, description: p.description });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.productForm.reset(); }

  onSubmit(): void {
    if (this.productForm.invalid) { this.productForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.productForm.value;

    if (this.editProduct()) {
      this.productsService.update(this.editProduct()!.id, val).subscribe(() => { this.saving.set(false); this.closeModal(); this.loadData(); });
    } else {
      this.productsService.create(val as CreateProductDto).subscribe(() => { this.saving.set(false); this.closeModal(); this.loadData(); });
    }
  }

  confirmDelete(p: Product): void { this.deleteTarget.set(p); this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); this.deleteTarget.set(null); }
  doDelete(): void {
    if (!this.deleteTarget()) return;
    this.productsService.delete(this.deleteTarget()!.id).subscribe(() => { this.cancelDelete(); this.loadData(); });
  }

  get f() { return this.productForm.controls; }

  stockStatus(stock: number): string {
    if (stock === 0) return 'sin-stock';
    if (stock <= 3) return 'bajo';
    return 'ok';
  }
}
