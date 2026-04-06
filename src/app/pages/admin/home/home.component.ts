import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { SocketService } from '../../../core/services/socket.service';
import { AttendanceResultModalComponent } from '../../../shared/components/attendance-result-modal/attendance-result-modal.component';
import { QrScannerModalComponent } from '../../../shared/components/qr-scanner-modal/qr-scanner-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceResultModalComponent, QrScannerModalComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  attendances = signal<any[]>([]);
  loading = signal<boolean>(true);
  totalItems = signal<number>(0);
  totalPagesCount = signal<number>(1);
  todayDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Filtros
  searchQuery = signal<string>('');
  filterStatus = signal<string>('');
  filterDate = signal<string>(new Date().toISOString().split('T')[0]);
  limit = signal<number>(10);
  currentPage = signal<number>(1);

  // ── MODAL & SCANNER STATES ──
  showScanner = signal<boolean>(false);
  unsupervisedMode = signal<boolean>(false);
  currentScanStatus = signal<'idle' | 'success' | 'error'>('idle');
  processingScan = signal<boolean>(false);
  scanResult = signal<any>(null);
  showResult = signal<boolean>(false);

  private readonly attendanceService = inject(AttendanceService);
  private readonly socketService = inject(SocketService);

  ngOnInit(): void {
    this.connectSocket();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect('attendances');
  }

  // ── WEBSOCKET ──

  private async connectSocket(): Promise<void> {
    this.loading.set(true);
    try {
      const socket = await this.socketService.connect('attendances', this.buildFilters());

      // Datos iniciales enviados por Gateway al conectarse
      socket.on('initial_data', (res: any) => {
        this.attendances.set(res.data ?? []);
        this.totalItems.set(res.meta?.total ?? 0);
        this.totalPagesCount.set(res.meta?.lastPage ?? 1);
        this.loading.set(false);
      });

      // Nuevas asistencias en tiempo real (broadcast tras cada escaneo)
      socket.on('new_attendance', (att: any) => {
        this.attendances.update(list => [att, ...list].slice(0, this.limit()));
        this.totalItems.update(n => n + 1);
      });

      socket.on('connect_error', () => this.loading.set(false));
    } catch {
      this.loading.set(false);
    }
  }

  private buildFilters() {
    const f: Record<string, any> = {
      page: this.currentPage(),
      limit: this.limit(),
      date: this.filterDate(),
    };
    if (this.searchQuery()) f['search'] = this.searchQuery();
    if (this.filterStatus()) f['status'] = this.filterStatus();
    return f;
  }

  /** Emite 'update_filters' al Gateway para que reconsulte con los nuevos filtros */
  private emitFilters(): void {
    const socket = this.socketService.getSocket('attendances');
    if (socket?.connected) {
      this.loading.set(true);
      socket.emit('update_filters', this.buildFilters());
    } else {
      this.socketService.disconnect('attendances');
      this.connectSocket();
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.emitFilters();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.emitFilters();
  }

  onLimitChange(newLimit: number): void {
    this.limit.set(newLimit);
    this.currentPage.set(1);
    this.emitFilters();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.emitFilters();
  }

  totalPages(): number {
    return this.totalPagesCount();
  }

  // ── UTILIDADES ──

  getDaysLeft(endDate: string | undefined): number {
    if (!endDate) return 0;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateOnly(dateStr: string): string {
    return this.formatDate(dateStr);
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  getSubscriptionColorClass(days: number): string {
    if (days <= 0) return 'text-danger';
    if (days < 3) return 'text-warning';
    return 'text-success';
  }

  viewUser(_userId: string): void {
    // TODO: abrir modal de detalle de usuario
  }

  // ── SCANNER LOGIC ──

  openScanner(): void {
    this.showScanner.set(true);
  }

  onScanSuccess(qrCodeId: string): void {
    if (!this.unsupervisedMode()) {
      this.showScanner.set(false);
    }

    this.processingScan.set(true);
    this.currentScanStatus.set('idle');

    this.attendanceService.registerAttendance(qrCodeId).subscribe({
      next: (res: any) => {
        this.processingScan.set(false);
        this.scanResult.set(res);

        if (this.unsupervisedMode()) {
          // 'authorized' → verde; cualquier otro valor (denied, etc.) → rojo
          const isAllowed = res?.status === 'authorized';
          this.currentScanStatus.set(isAllowed ? 'success' : 'error');
          setTimeout(() => this.currentScanStatus.set('idle'), 3000);
        } else {
          this.showResult.set(true);
        }
      },
      error: (err: any) => {
        this.processingScan.set(false);

        if (this.unsupervisedMode()) {
          this.currentScanStatus.set('error');
          setTimeout(() => this.currentScanStatus.set('idle'), 3000);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error de Asistencia',
            text: err.error?.message || 'El usuario no existe, está inactivo o no tiene suscripción vigente.',
            timer: 3500,
            background: '#1a1a1a',
            color: '#eee',
            confirmButtonColor: '#d32f2f',
          });
        }
      },
    });
  }
}
