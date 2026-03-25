// src/app/pages/admin/dashboard/dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, DashboardSummary } from '../../../core/services/dashboard.service';
import { PdfReportService } from '../../../core/services/pdf-report.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardSummary | null>(null);
  loading = signal(true);
  exportingPdf = signal(false);
  dateFrom = signal('');
  dateTo   = signal('');

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly pdfReportService: PdfReportService,
  ) {}

  ngOnInit(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateFrom.set(this.toInputDate(firstDay));
    this.dateTo.set(this.toInputDate(now));
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.dashboardService.getSummary(this.dateFrom(), this.dateTo()).subscribe(s => {
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
    const data = this.stats()?.monthlyChartData ?? [];
    return Math.max(...data.map(m => m.total), 1);
  }

  barHeight(val: number): number {
    if (val === 0) return 0;
    const pct = Math.round((val / this.maxRevenue) * 100);
    return Math.max(pct, 2);
  }

  exportPDF(): void {
    const s = this.stats();
    if (!s) return;

    this.exportingPdf.set(true);
    this.dashboardService.getReportDetails(this.dateFrom(), this.dateTo()).subscribe(data => {
      this.pdfReportService
        .generateReport(s, data, this.dateFrom(), this.dateTo())
        .finally(() => this.exportingPdf.set(false));
    });
  }

  private toInputDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
