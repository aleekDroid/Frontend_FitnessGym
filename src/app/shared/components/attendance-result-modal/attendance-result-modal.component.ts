import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceResponse } from '../../../core/services/attendance.service';

@Component({
  selector: 'app-attendance-result-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-result-modal.component.html',
  styleUrls: ['./attendance-result-modal.component.scss']
})
export class AttendanceResultModalComponent {
  @Input({ required: true }) attendance!: AttendanceResponse;
  @Output() closeModal = new EventEmitter<void>();
  @Output() viewProfile = new EventEmitter<number>();

  get isSuccess(): boolean {
    return !!this.attendance.attendance_id;
  }


  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getDaysLeft(endDate?: string): number {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    end.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysColorClass(daysLeft: number): string {
    if (daysLeft <= 0) return 'text-danger';
    if (daysLeft < 3) return 'text-warning';
    return 'text-success';
  }
}
