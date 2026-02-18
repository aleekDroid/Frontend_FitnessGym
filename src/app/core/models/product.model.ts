// src/app/core/models/product.model.ts

export interface Product {
  id: number;
  name: string;
  serial_number: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductDto {
  name: string;
  serial_number: string;
  price: number;
  stock: number;
  description?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  status?: 'active' | 'inactive';
}
