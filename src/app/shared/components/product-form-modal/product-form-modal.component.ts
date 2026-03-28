import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form-modal.component.html',
  styleUrls: ['./product-form-modal.component.scss']
})
export class ProductFormModalComponent implements OnInit {
  @Input() product: Product | null = null;
  @Input() isLoading: boolean = false;
  
  @Output() closeEvent = new EventEmitter<void>();
  @Output() saveEvent = new EventEmitter<any>();

  productForm: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      serialNumber: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      stock: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (this.product) {
      this.productForm.patchValue({
        name: this.product.name,
        serialNumber: this.product.serialNumber,
        price: this.product.price,
        description: this.product.description,
        stock: this.product.stock // Will be hidden in template if editing
      });
      // Stock is not editable via this form if product exists
      this.productForm.get('stock')?.disable();
    }
  }

  get f() { return this.productForm.controls; }

  closeModal(): void {
    this.closeEvent.emit();
  }

  stepValue(controlName: string, step: number): void {
    const control = this.productForm.get(controlName);
    if (control && !control.disabled) {
      let currentVal = Number.parseFloat(control.value) || 0;
      let newVal = currentVal + step;
      if (newVal < 0) newVal = 0;
      control.setValue(newVal);
      control.markAsDirty();
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const val = this.productForm.getRawValue();
    this.saveEvent.emit(val);
  }
}
