// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  name: string;
  last_name: string;
  number: string;
  role: 'admin' | 'member';
}

export interface LoginResponse {
  accessToken: string;
  firstLogin?: boolean;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_KEY  = 'fg_user';

  private readonly currentToken = signal<string | null>(null);
  
  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(number: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${environment.apiUrl}/auth/login`, 
      { number, password },
      { withCredentials: true } 
    ).pipe(
      tap(res => this.saveSession(res)),
      catchError(err => throwError(() => new Error(err.error?.message || 'Error al conectar con el servidor')))
    );
  }

  refreshToken(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${environment.apiUrl}/auth/refresh-access-token`,
      {},
      { withCredentials: true } // Enviar la cookie del refresh token.
    ).pipe(
      tap(res => {
        this.currentToken.set(res.accessToken);
        
        if (res.user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  logout(): void {
    // Consumimos el endpoint de logout para invalidar la cookie en el backend.
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession() // Limpiamos el front incluso si la red falla.
    });
  }

  private clearSession(): void {
    localStorage.removeItem(this.USER_KEY);
    this.currentToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.currentToken();
  }

  isLoggedIn(): boolean {
    return !!this.currentToken();
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  private saveSession(res: LoginResponse): void {
    this.currentToken.set(res.accessToken); 
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}