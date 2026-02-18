// src/app/pages/admin/prices/prices.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { SubscriptionType, CreateSubscriptionTypeDto } from '../../../core/models/subscription.model';

@Component({
  selector: 'app-prices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './prices.component.html',
  styleUrls: ['./prices.component.scss'],
})
export class PricesComponent implements OnInit {
  types = signal<SubscriptionType[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  editType = signal<SubscriptionType | null>(null);
  deleteTarget = signal<SubscriptionType | null>(null);
  showDeleteConfirm = signal(false);

  priceForm: FormGroup;

  constructor(private subscriptionsService: SubscriptionsService, private fb: FormBuilder) {
    this.priceForm = this.fb.group({
      name:                  ['', Validators.required],
      price:                 ['', [Validators.required, Validators.min(1)]],
      duration:              ['30', Validators.required],
      person_per_suscription:['1', Validators.required],
      description:           [''],
    });
  }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading.set(true);
    this.subscriptionsService.getAll().subscribe(t => { this.types.set(t); this.loading.set(false); });
  }

  openCreate(): void {
    this.editType.set(null);
    this.priceForm.reset({ duration: 30, person_per_suscription: 1 });
    this.showModal.set(true);
  }

  openEdit(t: SubscriptionType): void {
    this.editType.set(t);
    this.priceForm.patchValue({ name: t.name, price: t.price, duration: t.duration, person_per_suscription: t.person_per_suscription, description: t.description });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  onSubmit(): void {
    if (this.priceForm.invalid) { this.priceForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.priceForm.value;

    if (this.editType()) {
      this.subscriptionsService.update(this.editType()!.id, val).subscribe(() => { this.saving.set(false); this.closeModal(); this.loadData(); });
    } else {
      this.subscriptionsService.create(val as CreateSubscriptionTypeDto).subscribe(() => { this.saving.set(false); this.closeModal(); this.loadData(); });
    }
  }

  confirmDelete(t: SubscriptionType): void { this.deleteTarget.set(t); this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); this.deleteTarget.set(null); }
  doDelete(): void {
    if (!this.deleteTarget()) return;
    this.subscriptionsService.delete(this.deleteTarget()!.id).subscribe(() => { this.cancelDelete(); this.loadData(); });
  }

  get f() { return this.priceForm.controls; }

  durationLabel(days: number): string {
    if (days >= 365) return `${days / 365} año${days / 365 > 1 ? 's' : ''}`;
    if (days >= 30)  return `${days / 30} mes${days / 30 > 1 ? 'es' : ''}`;
    return `${days} días`;
  }
}
