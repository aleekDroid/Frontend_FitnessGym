import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  MemberDashboardResponse,
  FullRoutine,
  RoutineDay,
} from '../models/member-dashboard.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getDashboard(): Observable<MemberDashboardResponse> {
    return this.http.get<MemberDashboardResponse>(`${this.base}/user/me`);
  }

  getQrCode(qrCodeId: string): Observable<Blob> {
    return this.http.get(`${this.base}/user/qr/${qrCodeId}`, {
      responseType: 'blob'
    });
  }

  /**
   * GET /api/user/routine
   * Carga la rutina detallada con ejercicios para el modal de edición.
   * Si el backend responde 404, devuelve una rutina vacía de 6 días.
   */
  getFullRoutine(): Observable<FullRoutine> {
    return this.http
      .get<FullRoutine>(`${this.base}/user/routine`)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of({ days: this.buildEmptyRoutine() });
          }
          throw err;
        })
      );
  }

  /**
   * POST /api/user/routine
   * Crea o actualiza la rutina completa.
   * Payload: exactamente 6 días (Lunes–Sábado).
   */
  saveRoutine(days: RoutineDay[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/user/routine`, { days });
  }

  /**
   * PATCH parcial de isRestDay de los días — usado desde la vista principal
   * sin abrir el modal.
   */
  updateRoutine(days: { day: string; isRestDay: boolean }[]): Observable<void> {
    return this.http.post<void>(`${this.base}/user/routine`, { days });
  }

  /** Genera los 6 días con isRestDay=false y exercises=[] */
  private buildEmptyRoutine(): RoutineDay[] {
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return names.map((day) => ({
      day,
      description: '',
      isRestDay: false,
      exercises: [],
    }));
  }
}
