import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Product } from '../../../core/models/product.model';
import { ProductsService } from '../../../core/services/products.service';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-sales-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-modal.component.html',
  styleUrls: ['./sales-modal.component.scss']
})
export class SalesModalComponent implements OnInit {
  @Input() isLoading = false;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() saleEvent = new EventEmitter<{ products: { id: number; quantity: number }[]; payment_method: string }>();

  // Search
  searchTerm = signal('');
  searchResults = signal<Product[]>([]);
  showDropdown = signal(false);
  searching = signal(false);
  private searchSubject = new Subject<string>();

  // Cart
  cartItems = signal<CartItem[]>([]);
  paymentMethod = signal('cash');
  errorMessage = signal('');

  // Computed
  total = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  cartEmpty = computed(() => this.cartItems().length === 0);

  constructor(private productsService: ProductsService) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      if (term.trim().length < 2) {
        this.searchResults.set([]);
        this.showDropdown.set(false);
        return;
      }
      this.searching.set(true);
      this.productsService.getProducts(1, 10, term, 'active').subscribe({
        next: res => {
          // Filter out products already in cart
          const cartIds = this.cartItems().map(i => i.product.id);
          this.searchResults.set(res.data.filter(p => !cartIds.includes(p.id) && p.stock > 0));
          this.showDropdown.set(true);
          this.searching.set(false);
        },
        error: () => this.searching.set(false)
      });
    });
  }

  onSearchInput(val: string): void {
    this.searchTerm.set(val);
    this.searchSubject.next(val);
  }

  addToCart(product: Product): void {
    const current = this.cartItems();
    if (current.find(i => i.product.id === product.id)) return;
    this.cartItems.set([...current, { product, quantity: 1 }]);
    this.showDropdown.set(false);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.errorMessage.set('');
  }

  removeFromCart(productId: number): void {
    this.cartItems.set(this.cartItems().filter(i => i.product.id !== productId));
  }

  updateQuantity(productId: number, delta: number): void {
    this.cartItems.update(items =>
      items.map(item => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty < 1 || newQty > item.product.stock) return item;
        return { ...item, quantity: newQty };
      })
    );
  }

  setQuantity(productId: number, value: string): void {
    const qty = parseInt(value, 10);
    if (isNaN(qty)) return;
    this.cartItems.update(items =>
      items.map(item => {
        if (item.product.id !== productId) return item;
        const clamped = Math.max(1, Math.min(qty, item.product.stock));
        return { ...item, quantity: clamped };
      })
    );
  }

  getSubtotal(item: CartItem): number {
    return item.product.price * item.quantity;
  }

  onSubmit(): void {
    if (this.cartEmpty()) return;
    this.errorMessage.set('');
    const payload = {
      products: this.cartItems().map(i => ({ id: i.product.id, quantity: i.quantity })),
      payment_method: this.paymentMethod()
    };
    this.saleEvent.emit(payload);
  }

  closeModal(): void {
    this.closeEvent.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  onDropdownBlur(): void {
    // Delay to allow click on dropdown item
    setTimeout(() => this.showDropdown.set(false), 200);
  }
}
