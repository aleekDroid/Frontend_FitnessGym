// src/app/core/services/users.service.ts
import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";
import {
  UserWithMembership,
  UpdateUserDto,
  PaginatedUsersResponse,
} from "../models/user.model";
import { AuthService } from "./auth.service";
import { environment } from "../../../environments/environment";

export interface HistoryMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface SubscriptionHistoryItem {
  id: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  suscriptions_types: {
    id: number;
    name: string;
    description: string;
    price: number;
    duration: number;
  };
  subscription_sales: {
    id: number;
    quantity: number;
    subtotal: number;
    transactions: {
      id: number;
      transaction_type: string;
      payment_method: string;
      total: number;
    } | null;
  } | null;
}

export interface UserDetailsResponse {
  user: {
    id: number;
    number: string;
    name: string;
    last_name: string;
    role: string;
    status: string;
    created_at: string;
  };
  subscriptionHistory: SubscriptionHistoryItem[];
  historyMeta: HistoryMeta;
}

@Injectable({ providedIn: "root" })
export class UsersService {
  // Removed mock data

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });
  }

  // ── GET all users (Paginated) ──
  getUsers(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    status?: "active" | "inactive",
    role?: "admin" | "member" | "superadmin",
    hasActiveSubscription?: "true" | "false" | "all",
  ): Observable<PaginatedUsersResponse> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString());

    if (role) {
      params = params.set("role", role);
    }

    if (search.trim()) {
      params = params.set("search", search.trim());
    }

    if (status) {
      params = params.set("status", status);
    }

    if (hasActiveSubscription && hasActiveSubscription !== "all") {
      params = params.set("hasActiveSubscription", hasActiveSubscription);
    }

    return this.http
      .get<PaginatedUsersResponse>(`${environment.apiUrl}/user`, { params })
      .pipe(
        map((response) => {
          const items = response.data.map((user: any) => {
            const activeSub = user.activeSubscription;
            let membership_status: 'active' | 'expiring' | 'expired' | 'none';

            if (activeSub) {
              // Detect 'expiring': active sub with 3 or fewer days remaining
              const msLeft = new Date(activeSub.end_date).getTime() - Date.now();
              const daysLeft = msLeft / (1000 * 60 * 60 * 24);
              membership_status = daysLeft <= 3 ? 'expiring' : 'active';
            } else {
              membership_status = user.has_subscription_history ? 'expired' : 'none';
            }

            return {
              ...user,
              // has_subscription_history already comes from backend via spread above
              membership_end: activeSub?.end_date,
              membership_status,
              attended_today: false,
            };
          });
          return { data: items, meta: response.meta };
        }),
      );
  }

  // ── GET today's attendances ──
  getTodayAttendances(): Observable<UserWithMembership[]> {
    // REAL: return this.http.get<UserWithMembership[]>(`${environment.apiUrl}/attendances/today`, { headers: this.getHeaders() });
    return of([]);
  }

  // ── GET single user (with payment history) ──
  getById(
    id: number,
    historyPage: number = 1,
    historyLimit: number = 10,
  ): Observable<UserDetailsResponse> {
    let params = new HttpParams()
      .set("historyPage", historyPage.toString())
      .set("historyLimit", historyLimit.toString());

    return this.http.get<UserDetailsResponse>(
      `${environment.apiUrl}/user/${id}`,
      { headers: this.getHeaders(), params },
    );
  }

  // ── POST create user ──
  create(dto: any): Observable<{ message: string; qrBase64?: string }> {
    const payload: any = {
      number: dto.number,
      name: dto.name,
      lastName: dto.last_name,
    };
    if (dto.role) {
      payload.role = dto.role;
    }

    return this.http.post<{ message: string; qrBase64?: string }>(
      `${environment.apiUrl}/user/create`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ── PUT update user profile (Full Details API) ──
  updateProfile(data: {
    id: number;
    name: string;
    lastName: string;
    number: string;
  }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/user/profile`, data, {
      headers: this.getHeaders(),
    });
  }

  // ── PATCH update user ──
  update(id: number, dto: UpdateUserDto): Observable<UserWithMembership> {
    return this.http.patch<UserWithMembership>(
      `${environment.apiUrl}/user/${id}`,
      dto,
      { headers: this.getHeaders() },
    );
  }

  // ── PATCH toggle user status (logical delete) ──
  toggleUserStatus(id: number, status: "active" | "inactive"): Observable<any> {
    return this.http.patch<any>(
      `${environment.apiUrl}/user/status`,
      { id, status },
      { headers: this.getHeaders() },
    );
  }

  // ── POST reset password (Admin) ──
  resetPasswordAdmin(
    userId: number,
  ): Observable<{ message: string; qrBase64: string }> {
    return this.http.post<{ message: string; qrBase64: string }>(
      `${environment.apiUrl}/user/reset-password-admin`,
      { userId },
      { headers: this.getHeaders() },
    );
  }

  // ── POST verify reset token (Pública, sin auth) ──
  verifyResetToken(
    token: string,
    phoneNumber: string,
  ): Observable<{ valid: boolean; userName: string }> {
    return this.http.post<{ valid: boolean; userName: string }>(
      `${environment.apiUrl}/user/verify-reset-token`,
      { token, phoneNumber },
    );
  }

  // ── POST confirm reset password (Pública, sin auth) ──
  confirmResetPassword(
    token: string,
    phoneNumber: string,
    password: string,
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/user/confirm-reset-password`,
      { token, phoneNumber, password },
    );
  }
}
