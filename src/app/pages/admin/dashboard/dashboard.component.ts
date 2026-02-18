// src/app/pages/admin/dashboard/dashboard.component.ts
import { Component, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { DashboardStats, MonthlyRevenue } from '../../../core/models/subscription.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  dateFrom = signal('');
  dateTo   = signal('');

  constructor(private subscriptionsService: SubscriptionsService) {}

  ngOnInit(): void {
    // Default: current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateFrom.set(this.toInputDate(firstDay));
    this.dateTo.set(this.toInputDate(now));
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.subscriptionsService.getStats(this.dateFrom(), this.dateTo()).subscribe(s => {
      this.stats.set(s);
      this.loading.set(false);
    });
  }

  applyFilter(): void { this.loadStats(); }

  resetFilter(): void {
    const now = new Date();
    this.dateFrom.set(this.toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
    this.dateTo.set(this.toInputDate(now));
    this.loadStats();
  }

  get maxRevenue(): number {
    const data = this.stats()?.monthly_revenue ?? [];
    return Math.max(...data.map(m => m.total), 1);
  }

  barHeight(val: number): number {
    return Math.round((val / this.maxRevenue) * 100);
  }

  private toInputDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
