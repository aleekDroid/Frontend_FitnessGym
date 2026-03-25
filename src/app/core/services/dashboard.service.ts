import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardMonthlyData {
  month: string;
  suscripciones: number;
  productos: number;
  total: number;
}

export interface DashboardDistribution {
  subscriptions: number;
  products: number;
}

export interface DashboardReportItem {
  transactionId: number;
  date: string;
  type: string;
  paymentMethod: string;
  description: string;
  client: string;
  total: number;
}

export interface DashboardSummary {
  totalIncome: number;
  activeMembers: number;
  subscriptionsSold: number;
  productsSold: number;
  distribution: DashboardDistribution;
  monthlyChartData: DashboardMonthlyData[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private readonly http: HttpClient) {}

  getSummary(startDate?: string, endDate?: string): Observable<DashboardSummary> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<DashboardSummary>(`${environment.apiUrl}/dashboard/summary`, {
      params,
      withCredentials: true
    });
  }

  getReportDetails(startDate?: string, endDate?: string): Observable<DashboardReportItem[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<DashboardReportItem[]>(`${environment.apiUrl}/dashboard/report-details`, {
      params,
      withCredentials: true
    });
  }
}
