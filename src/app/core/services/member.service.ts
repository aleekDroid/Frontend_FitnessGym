import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MemberDashboardResponse } from '../models/member-dashboard.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDashboard(): Observable<MemberDashboardResponse> {
    return this.http.get<MemberDashboardResponse>(
      `${this.base}/user/me`
    );
  }

  updateRoutine(days: { day: string; isRestDay: boolean }[]): Observable<void> {
    return this.http.post<void>(`${this.base}/user/routine`, { days });
  }
}
