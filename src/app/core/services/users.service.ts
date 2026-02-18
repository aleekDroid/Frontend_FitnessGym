// src/app/core/services/users.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { User, UserWithMembership, CreateUserDto, UpdateUserDto } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersService {

  // ── Mock Data (remove when backend ready) ──
  private mockUsers: UserWithMembership[] = [
    { id: 1,  number: '4421001001', name: 'Carlos',   last_name: 'Ramírez',    role: 'member', status: 'active', membership_end: this.daysFromNow(15),  membership_status: 'active',   attended_today: true  },
    { id: 2,  number: '4421002002', name: 'Sofía',    last_name: 'Hernández',  role: 'member', status: 'active', membership_end: this.daysFromNow(-3),  membership_status: 'expired',  attended_today: true  },
    { id: 3,  number: '4421003003', name: 'Miguel',   last_name: 'Torres',     role: 'member', status: 'active', membership_end: this.daysFromNow(2),   membership_status: 'expiring', attended_today: true  },
    { id: 4,  number: '4421004004', name: 'Valeria',  last_name: 'López',      role: 'member', status: 'active', membership_end: this.daysFromNow(22),  membership_status: 'active',   attended_today: true  },
    { id: 5,  number: '4421005005', name: 'Diego',    last_name: 'Morales',    role: 'member', status: 'active', membership_end: this.daysFromNow(-10), membership_status: 'expired',  attended_today: false },
    { id: 6,  number: '4421006006', name: 'Andrea',   last_name: 'Gutiérrez',  role: 'member', status: 'active', membership_end: this.daysFromNow(1),   membership_status: 'expiring', attended_today: false },
    { id: 7,  number: '4421007007', name: 'Roberto',  last_name: 'Sánchez',    role: 'member', status: 'active', membership_end: this.daysFromNow(45),  membership_status: 'active',   attended_today: false },
    { id: 8,  number: '4421008008', name: 'Paola',    last_name: 'Medina',     role: 'member', status: 'active', membership_end: this.daysFromNow(3),   membership_status: 'expiring', attended_today: true  },
    { id: 9,  number: '4421009009', name: 'Luis',     last_name: 'Castro',     role: 'member', status: 'active', membership_end: this.daysFromNow(-1),  membership_status: 'expired',  attended_today: true  },
    { id: 10, number: '4421010010', name: 'Fernanda', last_name: 'Romero',     role: 'member', status: 'active', membership_end: this.daysFromNow(60),  membership_status: 'active',   attended_today: false },
    { id: 11, number: '4421011011', name: 'Jorge',    last_name: 'Vázquez',    role: 'member', status: 'active', membership_end: this.daysFromNow(8),   membership_status: 'active',   attended_today: false },
    { id: 12, number: '4421012012', name: 'Mariana',  last_name: 'Flores',     role: 'member', status: 'active', membership_end: this.daysFromNow(2),   membership_status: 'expiring', attended_today: true  },
  ];

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  // ── GET all users ──
  getAll(): Observable<UserWithMembership[]> {
    /* REAL: return this.http.get<UserWithMembership[]>(`${environment.apiUrl}/users`, { headers: this.getHeaders() }); */
    return of([...this.mockUsers]).pipe(delay(300));
  }

  // ── GET today's attendances ──
  getTodayAttendances(): Observable<UserWithMembership[]> {
    /* REAL: return this.http.get<UserWithMembership[]>(`${environment.apiUrl}/attendances/today`, { headers: this.getHeaders() }); */
    return of(this.mockUsers.filter(u => u.attended_today)).pipe(delay(300));
  }

  // ── GET single user ──
  getById(id: number): Observable<UserWithMembership> {
    /* REAL: return this.http.get<UserWithMembership>(`${environment.apiUrl}/users/${id}`, { headers: this.getHeaders() }); */
    const user = this.mockUsers.find(u => u.id === id)!;
    return of(user).pipe(delay(200));
  }

  // ── POST create user ──
  create(dto: CreateUserDto): Observable<UserWithMembership> {
    /* REAL: return this.http.post<UserWithMembership>(`${environment.apiUrl}/users`, dto, { headers: this.getHeaders() }); */
    const newUser: UserWithMembership = {
      id: Date.now(),
      number: dto.number,
      name: dto.name,
      last_name: dto.last_name,
      role: 'member',
      status: 'active',
      membership_end: this.daysFromNow(30),
      membership_status: 'active',
      attended_today: false,
    };
    this.mockUsers.push(newUser);
    return of(newUser).pipe(delay(400));
  }

  // ── PATCH update user ──
  update(id: number, dto: UpdateUserDto): Observable<UserWithMembership> {
    /* REAL: return this.http.patch<UserWithMembership>(`${environment.apiUrl}/users/${id}`, dto, { headers: this.getHeaders() }); */
    const idx = this.mockUsers.findIndex(u => u.id === id);
    if (idx !== -1) Object.assign(this.mockUsers[idx], dto);
    return of(this.mockUsers[idx]).pipe(delay(300));
  }

  // ── DELETE user ──
  delete(id: number): Observable<void> {
    /* REAL: return this.http.delete<void>(`${environment.apiUrl}/users/${id}`, { headers: this.getHeaders() }); */
    this.mockUsers = this.mockUsers.filter(u => u.id !== id);
    return of(undefined).pipe(delay(300));
  }

  private daysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
