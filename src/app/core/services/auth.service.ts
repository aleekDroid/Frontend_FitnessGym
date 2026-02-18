// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
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
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'fg_token';
  private readonly USER_KEY  = 'fg_user';

  // Reactive signal for current user
  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());

  constructor(private http: HttpClient, private router: Router) {}

  // ── Real API call (comment out mock below to use) ──
  login(number: string, password: string): Observable<LoginResponse> {
    /* REAL BACKEND:
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { number, password }).pipe(
      tap(res => this.saveSession(res)),
      catchError(err => throwError(() => err))
    );
    */

    // ── MOCK (remove when backend ready) ──
    const mockAdmin: LoginResponse = {
      token: 'mock-jwt-token-admin-xyz',
      user: { id: 1, name: 'Admin', last_name: 'Fitness', number: '123456789', role: 'admin' }
    };
    const mockMember: LoginResponse = {
      token: 'mock-jwt-token-member-xyz',
      user: { id: 2, name: 'Carlos', last_name: 'Ramírez', number: '1234567890', role: 'member' }
    };

    if (number === '123456789' && password === 'admin123') {
      this.saveSession(mockAdmin);
      return of(mockAdmin);
    } else if (number === '1234567890' && password === 'member123') {
      this.saveSession(mockMember);
      return of(mockMember);
    } else {
      return throwError(() => new Error('Número o contraseña incorrectos'));
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  private saveSession(res: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
