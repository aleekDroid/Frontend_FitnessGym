// src/app/pages/admin/prices/prices.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { SubscriptionType, CreateSubscriptionTypeDto } from '../../../core/models/subscription.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { StatusConfirmModalComponent } from '../../../shared/components/status-confirm-modal/status-confirm-modal.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-prices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StatusConfirmModalComponent, ToastComponent],
  templateUrl: './prices.component.html',
  styleUrls: ['./prices.component.scss'],
})
export class PricesComponent implements OnInit {
  types = signal<SubscriptionType[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  editType = signal<SubscriptionType | null>(null);
  statusTarget = signal<SubscriptionType | null>(null);
  showStatusConfirm = signal(false);

  // Filters and Pagination
  currentPage = signal(1);
  limit = signal(8);
  totalItems = signal(0);
  totalPages = signal(0);
  searchQuery = signal('');
  statusFilter = signal('');

  private readonly searchSubject = new Subject<string>();

  priceForm: FormGroup;

  constructor(
    private readonly subscriptionsService: SubscriptionsService, 
    private readonly fb: FormBuilder,
    private readonly notificationService: NotificationService
  ) {
    this.priceForm = this.fb.group({
      name:                  ['', Validators.required],
      price:                 [0, [Validators.required, Validators.min(1)]],
      duration:              [30, [Validators.required, Validators.min(1)]],
      person_per_suscription:[1, [Validators.required, Validators.min(1)]],
      description:           ['', Validators.required],
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
    this.subscriptionsService.getAll(
      this.currentPage(),
      this.limit(),
      this.searchQuery() || undefined,
      this.statusFilter() || undefined
    ).subscribe({
      next: res => {
        this.types.set(res.data);
        this.totalItems.set(res.meta.totalItems);
        this.totalPages.set(res.meta.totalPages);
        this.currentPage.set(res.meta.currentPage);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  changeStatusFilter(status: string): void {
    this.statusFilter.set(status);
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
    this.editType.set(null);
    this.priceForm.reset({ duration: 30, person_per_suscription: 1, price: 0 });
    this.showModal.set(true);
  }

  openEdit(t: SubscriptionType): void {
    this.editType.set(t);
    this.priceForm.patchValue({ name: t.name, price: t.price, duration: t.duration, person_per_suscription: t.person_per_suscription, description: t.description });
    
    // Lock fields for "visita" slug
    if (t.slug === 'visita') {
      this.priceForm.get('name')?.disable();
      this.priceForm.get('duration')?.disable();
    } else {
      this.priceForm.get('name')?.enable();
      this.priceForm.get('duration')?.enable();
    }
    
    this.showModal.set(true);
  }

  closeModal(): void { 
    this.priceForm.get('name')?.enable(); // Ensure enabled when reopening or for create
    this.priceForm.get('duration')?.enable();
    this.showModal.set(false); 
  }

  stepValue(controlName: string, step: number): void {
    const control = this.priceForm.get(controlName);
    if (control && !control.disabled) {
      let currentVal = Number.parseFloat(control.value) || 0;
      let newVal = Math.max(0, currentVal + step); // Prevents negative values
      control.setValue(newVal);
      control.markAsDirty();
    }
  }

  onSubmit(): void {
    if (this.priceForm.invalid) { this.priceForm.markAllAsTouched(); return; }
    this.saving.set(true);
    // Use getRawValue() to include disabled fields (necessary for the backend update if fields are locked)
    const val = this.priceForm.getRawValue();

    if (this.editType()) {
      this.subscriptionsService.update(this.editType()!.id, val).subscribe(() => { 
        this.saving.set(false); 
        this.closeModal(); 
        this.notificationService.show('Membresía actualizada correctamente', 'success');
        this.loadData(); 
      });
    } else {
      this.subscriptionsService.create(val).subscribe(() => { 
        this.saving.set(false); 
        this.closeModal(); 
        this.notificationService.show('Membresía creada exitosamente', 'success');
        this.loadData(); 
      });
    }
  }

  confirmToggleStatus(t: SubscriptionType): void { 
    this.statusTarget.set(t); 
    this.showStatusConfirm.set(true); 
  }
  
  cancelStatusConfirm(): void { 
    this.showStatusConfirm.set(false); 
    this.statusTarget.set(null); 
  }
  
  doToggleStatus(): void {
    const target = this.statusTarget();
    if (!target) return;
    
    this.saving.set(true);
    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    
    this.subscriptionsService.updateStatus(target.id, newStatus).subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelStatusConfirm(); 
        this.notificationService.show(
          `Membresía ${newStatus === 'active' ? 'activada' : 'desactivada'} correctamente`, 
          'success'
        );
        this.loadData(); 
      },
      error: (err) => {
        console.error('Error toggling status:', err);
        this.saving.set(false);
        this.notificationService.show('Error al cambiar el estado de la membresía', 'error');
      }
    });
  }

  get f() { return this.priceForm.controls; }

  durationLabel(days: number): string {
    if (days >= 365) return `${days / 365} año${days / 365 > 1 ? 's' : ''}`;
    if (days >= 30)  return `${days / 30} mes${days / 30 > 1 ? 'es' : ''}`;
    return `${days} días`;
  }
}
