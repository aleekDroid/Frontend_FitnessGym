import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoutineDay } from '../../../core/models/member-dashboard.model';

@Component({
  selector: 'app-day-routine-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './day-routine-modal.component.html',
  styleUrls: ['./day-routine-modal.component.scss']
})
export class DayRoutineModalComponent {
  @Input() visible = false;
  @Input() day: RoutineDay | null = null;
  @Output() closed = new EventEmitter<void>();

  onClose(): void {
    this.closed.emit();
  }

  getDayLabel(dayName: string): string {
    const labels: Record<string, string> = {
      'Lunes': 'Lunes',
      'Martes': 'Martes',
      'Miércoles': 'Miércoles',
      'Jueves': 'Jueves',
      'Viernes': 'Viernes',
      'Sábado': 'Sábado',
      'Domingo': 'Domingo'
    };
    return labels[dayName] || dayName;
  }
}
