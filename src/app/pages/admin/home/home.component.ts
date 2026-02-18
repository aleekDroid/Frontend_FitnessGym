// src/app/pages/admin/home/home.component.ts
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { UserWithMembership } from '../../../core/models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  allAttendances = signal<UserWithMembership[]>([]);
  searchQuery = signal('');
  loading = signal(true);
  todayDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {
    this.usersService.getTodayAttendances().subscribe(users => {
      this.allAttendances.set(users);
      this.loading.set(false);
    });
  }

  get filteredAttendances(): UserWithMembership[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allAttendances();
    return this.allAttendances().filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.number.includes(q)
    );
  }

  get expiredUsers(): UserWithMembership[] {
    return this.filteredAttendances.filter(u => u.membership_status === 'expired');
  }

  get expiringUsers(): UserWithMembership[] {
    return this.filteredAttendances.filter(u => u.membership_status === 'expiring');
  }

  get activeUsers(): UserWithMembership[] {
    return this.filteredAttendances.filter(u => u.membership_status === 'active');
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }
}
