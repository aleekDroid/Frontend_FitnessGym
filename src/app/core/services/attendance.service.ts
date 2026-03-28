import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface AttendanceUser {
  user_id: number;
  user_name: string;
  user_last_name: string;
  user_phone: string;
}

export interface AttendanceSubscription {
  suscripcion_id: number;
  suscripcion_type_name: string;
  status: string;
  end_date?: string;
}

export interface AttendanceResponse {
  attendance_id: number | null;
  created_at: string;
  user: AttendanceUser;
  suscripcion: AttendanceSubscription | null;
}

export interface AttendanceHistoryItem {
  id: number;
  user_id: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  constructor(
    private readonly http: HttpClient, 
    private readonly authService: AuthService
  ) {}

  registerAttendance(qrCodeId: string): Observable<AttendanceResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
    
    return this.http.post<AttendanceResponse>(
      `${environment.apiUrl}/attendances`,
      { qrCodeId },
      { headers }
    );
  }

  getLastAttendances(idUser: number): Observable<AttendanceHistoryItem[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
    
    return this.http.get<AttendanceHistoryItem[]>(
      `${environment.apiUrl}/attendances/last/${idUser}`,
      { headers }
    );
  }
}
