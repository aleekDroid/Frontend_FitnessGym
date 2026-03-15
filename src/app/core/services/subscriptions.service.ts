// src/app/core/services/subscriptions.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { SubscriptionType, CreateSubscriptionTypeDto, DashboardStats, MonthlyRevenue, TransactionDetail } from '../models/subscription.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  
  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getAll(): Observable<SubscriptionType[]> {
    return this.http.get<any>(`${environment.apiUrl}/subscription/types?limit=100`).pipe(
      map(response => {
        return response.data || [];
      })
    );
  }

  // ── GET single subscription type ──
  getSubscriptionTypeById(id: number): Observable<SubscriptionType> {
    return this.http.get<SubscriptionType>(`${environment.apiUrl}/subscription/types/${id}`, { headers: this.getHeaders() });
  }

  create(dto: any): Observable<any> {
    const payload = {
      name: dto.name,
      price: Number(dto.price),
      duration: Number(dto.duration),
      person_per_suscription: Number(dto.person_per_suscription),
      description: dto.description || '',
      status: 'active'
    };

    return this.http.post<any>(`${environment.apiUrl}/subscription/type`, payload);
  }

  update(id: number, dto: Partial<CreateSubscriptionTypeDto>): Observable<SubscriptionType> {
    return this.http.patch<SubscriptionType>(`${environment.apiUrl}/subscription/type/${id}`, dto, { headers: this.getHeaders() });
  }
  delete(id: number): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/subscription/type/status/${id}`, { status: 'inactive' });
  }

  // ── POST assign subscription to user ──
  assignSubscription(subscriptionId: number, userIds: number[], paymentMethod: string): Observable<any> {
    const payload = {
      subscription_id: Number(subscriptionId),
      users_id: userIds,
      payment_method: paymentMethod
    };

    return this.http.post<any>(`${environment.apiUrl}/subscription/user`, payload);
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

  // ── GET transaction detail ──
  getTransactionDetail(id: number): Observable<TransactionDetail> {
    return this.http.get<TransactionDetail>(`${environment.apiUrl}/subscription/transaction/${id}`, { headers: this.getHeaders() });
  }
}
