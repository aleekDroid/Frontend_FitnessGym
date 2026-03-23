// src/app/core/models/product.model.ts

export interface Product {
  id: number;
  name: string;
  serialNumber: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductDto {
  name: string;
  serialNumber: string;
  price: number;
  stock: number;
  description?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  status?: 'active' | 'inactive';
}

export interface PaginatedProductsResponse {
  data: Product[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface SaleItemDto {
  id: number;
  quantity: number;
}

export interface RegisterSaleDto {
  products: SaleItemDto[];
  payment_method: string;
}
