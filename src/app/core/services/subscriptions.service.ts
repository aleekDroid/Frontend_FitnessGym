// src/app/core/services/subscriptions.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SubscriptionType, CreateSubscriptionTypeDto, DashboardStats, MonthlyRevenue } from '../models/subscription.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {

  private mockTypes: SubscriptionType[] = [
    { id: 1, name: 'Mensual Básico',    price: 420,  duration: 30,  person_per_suscription: 1, status: 'active', description: 'Acceso ilimitado al gym por 30 días' },
    { id: 2, name: 'Anual Premium',     price: 3800, duration: 365, person_per_suscription: 1, status: 'active', description: 'Acceso completo + nutricionista' },
    { id: 3, name: 'Mensual Pareja',    price: 700,  duration: 30,  person_per_suscription: 2, status: 'active', description: 'Membresía para 2 personas' },
    { id: 4, name: 'Anual Básico',      price: 3200, duration: 365, person_per_suscription: 1, status: 'active', description: 'Acceso ilimitado al gym por 1 año' },
    { id: 5, name: 'Anual 4 personas',  price: 4500, duration: 365, person_per_suscription: 4, status: 'active', description: 'Membresía familiar 4 integrantes' },
    { id: 6, name: 'Estudiante UTEQ',   price: 350,  duration: 30,  person_per_suscription: 1, status: 'active', description: 'Tarifa especial estudiantes UTEQ' },
  ];

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getAll(): Observable<SubscriptionType[]> {
    /* REAL: return this.http.get<SubscriptionType[]>(`${environment.apiUrl}/suscriptions-types`, { headers: this.getHeaders() }); */
    return of([...this.mockTypes]).pipe(delay(300));
  }

  create(dto: CreateSubscriptionTypeDto): Observable<SubscriptionType> {
    /* REAL: return this.http.post<SubscriptionType>(`${environment.apiUrl}/suscriptions-types`, dto, { headers: this.getHeaders() }); */
    const newType: SubscriptionType = { id: Date.now(), ...dto, status: 'active' };
    this.mockTypes.push(newType);
    return of(newType).pipe(delay(400));
  }

  update(id: number, dto: Partial<CreateSubscriptionTypeDto>): Observable<SubscriptionType> {
    /* REAL: return this.http.patch<SubscriptionType>(`${environment.apiUrl}/suscriptions-types/${id}`, dto, { headers: this.getHeaders() }); */
    const idx = this.mockTypes.findIndex(t => t.id === id);
    if (idx !== -1) Object.assign(this.mockTypes[idx], dto);
    return of(this.mockTypes[idx]).pipe(delay(300));
  }

  delete(id: number): Observable<void> {
    /* REAL: return this.http.delete<void>(`${environment.apiUrl}/suscriptions-types/${id}`, { headers: this.getHeaders() }); */
    this.mockTypes = this.mockTypes.filter(t => t.id !== id);
    return of(undefined).pipe(delay(300));
  }

  // ── Dashboard stats ──
  getStats(from?: string, to?: string): Observable<DashboardStats> {
    /* REAL: return this.http.get<DashboardStats>(`${environment.apiUrl}/dashboard/stats`, { headers: this.getHeaders(), params: { from, to } }); */
    const monthly: MonthlyRevenue[] = [
      { month: 'Jul', subscriptions: 18200, products: 3100, total: 21300 },
      { month: 'Ago', subscriptions: 21000, products: 4200, total: 25200 },
      { month: 'Sep', subscriptions: 19500, products: 3800, total: 23300 },
      { month: 'Oct', subscriptions: 23800, products: 5100, total: 28900 },
      { month: 'Nov', subscriptions: 22100, products: 4600, total: 26700 },
      { month: 'Dic', subscriptions: 26500, products: 6800, total: 33300 },
      { month: 'Ene', subscriptions: 24200, products: 5500, total: 29700 },
      { month: 'Feb', subscriptions: 27800, products: 6200, total: 34000 },
    ];
    return of({
      total_revenue_month: 34000,
      total_subscriptions_month: 67,
      total_products_sold_month: 42,
      active_members: 148,
      monthly_revenue: monthly,
    }).pipe(delay(500));
  }
}
