import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product, CreateProductDto, PaginatedProductsResponse } from '../models/product.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductsService {

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getProducts(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: 'active' | 'inactive',
    minStock?: number,
    maxStock?: number,
    minPrice?: number,
    maxPrice?: number
  ): Observable<PaginatedProductsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (status) {
      params = params.set('status', status);
    }
    if (minStock !== undefined && minStock !== null) {
      params = params.set('minStock', minStock.toString());
    }
    if (maxStock !== undefined && maxStock !== null) {
      params = params.set('maxStock', maxStock.toString());
    }
    if (minPrice !== undefined && minPrice !== null) {
      params = params.set('minPrice', minPrice.toString());
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      params = params.set('maxPrice', maxPrice.toString());
    }

    return this.http.get<PaginatedProductsResponse>(`${environment.apiUrl}/products`, { headers: this.getHeaders(), params });
  }

  getById(id: number): Observable<Product> {
    return this.http.get<any>(`${environment.apiUrl}/products/${id}`, { headers: this.getHeaders() }).pipe(
      map(res => {
        // Map snake_case to camelCase from backend DTO if necessary
        if (res.serial_number && !res.serialNumber) {
          res.serialNumber = res.serial_number;
        }
        return res as Product;
      })
    );
  }

  create(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/products`, dto, { headers: this.getHeaders() });
  }

  update(dto: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/products`, dto, { headers: this.getHeaders() });
  }

  toggleStatus(id: number, status: 'active' | 'inactive'): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/products/status`, { id, status }, { headers: this.getHeaders() });
  }

  updateStock(id: number, quantity: number, type: string, reason: string): Observable<any> {
    // Backend validation pipe requires id in the body payload
    return this.http.patch(`${environment.apiUrl}/products/${id}/stock`, { id, quantity, type, reason }, { headers: this.getHeaders() });
  }

  getProductHistory(id: number): Observable<{ movements: any[], sales: any[] }> {
    return this.http.get<{ movements: any[], sales: any[] }>(`${environment.apiUrl}/products/${id}/history`, { headers: this.getHeaders() });
  }
}
