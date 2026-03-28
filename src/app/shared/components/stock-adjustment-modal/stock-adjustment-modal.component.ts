import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-stock-adjustment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stock-adjustment-modal.component.html',
  styleUrl: './stock-adjustment-modal.component.scss'
})
export class StockAdjustmentModalComponent implements OnInit {
  @Input() productId: number | null = null;
  @Input() isSaving: boolean = false;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() confirmEvent = new EventEmitter<any>();

  stockForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.stockForm = this.fb.group({
      quantity: [1, Validators.required],
      type: ['restock', Validators.required],
      reason: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  stepStockValue(step: number): void {
    const control = this.stockForm.get('quantity');
    if (control && !control.disabled) {
      let currentVal = Number.parseFloat(control.value) || 0;
      let newVal = currentVal + step;
      control.setValue(newVal);
      control.markAsDirty();
    }
  }

  closeModal(): void {
    this.closeEvent.emit();
  }

  onSubmit(): void {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }
    this.confirmEvent.emit(this.stockForm.value);
  }
}
