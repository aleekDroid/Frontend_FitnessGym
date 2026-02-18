// src/app/core/services/products.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Product, CreateProductDto, UpdateProductDto } from '../models/product.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductsService {

  private mockProducts: Product[] = [
    { id: 1,  name: 'Proteína Whey 2kg',      serial_number: 'PRO-001', price: 650,  stock: 12, status: 'active', description: 'Proteína de suero de leche sabor chocolate' },
    { id: 2,  name: 'Creatina 300g',           serial_number: 'CRE-001', price: 350,  stock: 8,  status: 'active', description: 'Creatina monohidratada pura' },
    { id: 3,  name: 'Pre-entreno C4',          serial_number: 'PRE-001', price: 480,  stock: 5,  status: 'active', description: 'Pre-entreno C4 original 30 servicios' },
    { id: 4,  name: 'Guantes de entrenamiento',serial_number: 'GUA-001', price: 220,  stock: 15, status: 'active', description: 'Guantes acolchados talla M/L' },
    { id: 5,  name: 'Banda de resistencia',    serial_number: 'BAN-001', price: 120,  stock: 20, status: 'active', description: 'Set de 3 bandas resistencia variable' },
    { id: 6,  name: 'Botella 1L acero',        serial_number: 'BOT-001', price: 280,  stock: 10, status: 'active', description: 'Botella térmica acero inoxidable' },
    { id: 7,  name: 'Cuerda para saltar',       serial_number: 'CUE-001', price: 85,   stock: 18, status: 'active', description: 'Cuerda ajustable con manijas ergonómicas' },
    { id: 8,  name: 'Cinturón de levantamiento',serial_number: 'CIN-001', price: 390,  stock: 6,  status: 'active', description: 'Cinturón neopreno ajustable' },
    { id: 9,  name: 'Aminoácidos BCAA',        serial_number: 'BCA-001', price: 310,  stock: 9,  status: 'active', description: 'BCAA 2:1:1 sabor sandía 30 servicios' },
    { id: 10, name: 'Toalla microfibra',        serial_number: 'TOA-001', price: 95,   stock: 25, status: 'active', description: 'Toalla deportiva secado rápido' },
  ];

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getAll(): Observable<Product[]> {
    /* REAL: return this.http.get<Product[]>(`${environment.apiUrl}/products`, { headers: this.getHeaders() }); */
    return of([...this.mockProducts]).pipe(delay(300));
  }

  getById(id: number): Observable<Product> {
    /* REAL: return this.http.get<Product>(`${environment.apiUrl}/products/${id}`, { headers: this.getHeaders() }); */
    return of(this.mockProducts.find(p => p.id === id)!).pipe(delay(200));
  }

  create(dto: CreateProductDto): Observable<Product> {
    /* REAL: return this.http.post<Product>(`${environment.apiUrl}/products`, dto, { headers: this.getHeaders() }); */
    const newProduct: Product = { id: Date.now(), ...dto, status: 'active' };
    this.mockProducts.push(newProduct);
    return of(newProduct).pipe(delay(400));
  }

  update(id: number, dto: UpdateProductDto): Observable<Product> {
    /* REAL: return this.http.patch<Product>(`${environment.apiUrl}/products/${id}`, dto, { headers: this.getHeaders() }); */
    const idx = this.mockProducts.findIndex(p => p.id === id);
    if (idx !== -1) Object.assign(this.mockProducts[idx], dto);
    return of(this.mockProducts[idx]).pipe(delay(300));
  }

  delete(id: number): Observable<void> {
    /* REAL: return this.http.delete<void>(`${environment.apiUrl}/products/${id}`, { headers: this.getHeaders() }); */
    this.mockProducts = this.mockProducts.filter(p => p.id !== id);
    return of(undefined).pipe(delay(300));
  }
}
