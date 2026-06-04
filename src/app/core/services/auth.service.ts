// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, filter, map, take, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  name: string;
  last_name: string;
  number: string;
  role: 'admin' | 'member' | 'superadmin';
}

export interface LoginResponse {
  accessToken: string;
  firstLogin?: boolean;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_KEY  = 'fg_user';
  private readonly TOKEN_KEY = 'fg_token';

  private readonly currentToken = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());

  // Control de concurrencia para refresh token
  private isRefreshing = false;
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

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
        this.saveSession(res);
      })
    );
  }

  /**
   * Garantiza que hay una sesión válida antes de continuar.
   * - Si el access token está vigente → resuelve true de inmediato.
   * - Si está expirado → intenta refresh silencioso con la cookie httpOnly.
   * - Protege contra race conditions: solo se hace UNA petición a la vez;
   *   las demás llamadas concurrentes esperan el resultado en el BehaviorSubject.
   */
  ensureValidSession(): Observable<boolean> {
    const token = this.getToken();

    // Token aún válido, no hacer nada
    if (token && !this.isTokenExpired(token)) {
      return of(true);
    }

    // Ya hay un refresh en curso, esperar a que termine
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(t => t !== null),
        take(1),
        map(() => true),
      );
    }

    // Iniciar el refresh
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.refreshToken().pipe(
      tap(res => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(res.accessToken);
      }),
      map(() => true),
      catchError(() => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        return of(false);
      }),
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
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.currentToken();
  }

  isLoggedIn(): boolean {
    return !!this.currentToken() && !this.isTokenExpired(this.currentToken()!);
  }

  isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      // b64 decode payload (replacing url-safe chars)
      const payload = JSON.parse(atob(parts[1].replaceAll('-', '+').replaceAll('_', '/')));
      if (!payload.exp) return false;
      // date in seconds
      const now = Math.floor(Date.now() / 1000);
      return now >= payload.exp;
    } catch (_e) {
      // Token con formato inválido → se trata como expirado
      return true;
    }
  }

  isAdmin(): boolean {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'superadmin';
  }

  isSuperAdmin(): boolean {
    return this.currentUser()?.role === 'superadmin';
  }

  get currentUserId(): number | null {
    return this.currentUser()?.id ?? null;
  }

  isSelf(targetUserId: number): boolean {
    return this.currentUser()?.id === targetUserId;
  }

  canEditProfile(targetUserId: number, targetRole: string): boolean {
    const me = this.currentUser();
    if (!me) return false;
    if (this.isSelf(targetUserId)) return true;
    if (me.role === 'admin' && (targetRole === 'admin' || targetRole === 'superadmin')) return false;
    return true;
  }

  canToggleStatus(targetUserId: number, targetRole: string): boolean {
    const me = this.currentUser();
    if (!me) return false;
    if (this.isSelf(targetUserId)) return false;
    if (targetRole === 'superadmin') return false;
    if (me.role === 'admin' && targetRole === 'admin') return false;
    return true;
  }

  canResetPassword(targetUserId: number, targetRole: string): boolean {
    const me = this.currentUser();
    if (!me) return false;
    if (this.isSelf(targetUserId)) return false;
    if (me.role === 'admin' && (targetRole === 'admin' || targetRole === 'superadmin')) return false;
    return true;
  }

  canAssignSubscription(targetRole: string): boolean {
    if (targetRole !== 'member') return false;
    return this.isAdmin();
  }

  canAssignSubscriptionGlobal(): boolean {
    return this.isAdmin();
  }

  canChangeRole(targetRole: string): boolean {
    if (!this.isSuperAdmin()) return false;
    if (targetRole === 'superadmin') return false;
    return true;
  }

  private saveSession(res: LoginResponse): void {
    this.currentToken.set(res.accessToken); 
    localStorage.setItem(this.TOKEN_KEY, res.accessToken);
    if (res.user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
      this.currentUser.set(res.user);
    }
  }

  private loadUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}