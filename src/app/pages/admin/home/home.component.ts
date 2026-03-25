import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SocketService } from '../../../core/services/socket.service';
import { AttendanceService, AttendanceResponse } from '../../../core/services/attendance.service';
import { QrScannerModalComponent } from '../../../shared/components/qr-scanner-modal/qr-scanner-modal.component';
import { AttendanceResultModalComponent } from '../../../shared/components/attendance-result-modal/attendance-result-modal.component';
import Swal from 'sweetalert2';

interface WsAttendanceUser {
  user_id: number;
  user_name: string;
  user_last_name: string;
  user_phone: string;
}

interface WsAttendanceSubscription {
  suscripcion_id: number;
  suscripcion_type_name: string;
  status: string;
  end_date?: string;
}

interface WsAttendance {
  attendance_id: number | null;
  created_at: string;
  user: WsAttendanceUser;
  suscripcion: WsAttendanceSubscription | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, QrScannerModalComponent, AttendanceResultModalComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  attendances = signal<WsAttendance[]>([]);
  loading = signal(true);
  todayDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Scanner Modals State
  showScanner = signal(false);
  showResult = signal(false);
  scanResult = signal<AttendanceResponse | null>(null);
  processingScan = signal(false);

  // Filtros
  currentPage = signal(1);
  limit = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);
  searchQuery = signal('');
  
  // By default, filter by today's date in YYYY-MM-DD format
  filterDate = signal(new Date().toLocaleDateString('en-CA')); // 'en-CA' gives YYYY-MM-DD
  filterUserId = signal('');


  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  constructor(
    private readonly socketService: SocketService,
    private readonly attendanceService: AttendanceService,
    private readonly router: Router
  ) {}


  ngOnInit(): void {
    const socket = this.socketService.connect('attendances', {
      page: this.currentPage(),
      limit: this.limit(),
      date: this.filterDate(),
      search: this.searchQuery() || undefined,
      userId: this.filterUserId() || undefined
    });


    socket.on('initial_data', (payload: any) => {
      this.attendances.set(payload.data || []);
      if (payload.meta) {
        this.totalItems.set(payload.meta.total || 0);
        this.totalPages.set(payload.meta.lastPage || Math.ceil((payload.meta.total || 0) / this.limit()));
        this.currentPage.set(payload.meta.page || 1);
      }
      this.loading.set(false);
    });

    socket.on('new_attendance', (newAtt: WsAttendance) => {
      // Add new attendance to the top (if we are on the first page and filter matches, etc.)
      // Typically we just unshift if search is empty or matches roughly. 
      // A simple unshift works for a live dashboard.
      this.attendances.update((list: WsAttendance[]) => {
        const newList = [newAtt, ...list];
        if (newList.length > this.limit()) {
          newList.pop();
        }
        return newList;
      });
      this.totalItems.update((t: number) => t + 1);

    });

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.updateFilters();
    });

    // Forced initial load: if the socket was already connected, 
    // the server connection event might have already fired.
    // We emit update_filters to get the fresh data.
    this.updateFilters();

    // In case of reconnection, we should also request data again
    socket.on('connect', () => {
      this.updateFilters();
    });
  }

  ngOnDestroy(): void {
    const socket = this.socketService.getSocket('attendances');
    if (socket) {
      socket.off('initial_data');
      socket.off('new_attendance');
      socket.off('connect');
    }
    this.searchSub?.unsubscribe();
  }

  updateFilters(): void {
    const socket = this.socketService.getSocket('attendances');
    if (socket) {
      this.loading.set(true);
      socket.emit('update_filters', {
        page: this.currentPage(),
        limit: this.limit(),
        search: this.searchQuery() || undefined,
        date: this.filterDate() || undefined,
        userId: this.filterUserId() || undefined
      });

    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.updateFilters();
  }

  onSearchChange(val: string): void {
    this.searchSubject.next(val);
  }

  onLimitChange(newLimit: number): void {
    this.limit.set(newLimit);
    this.currentPage.set(1);
    this.updateFilters();
  }


  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.updateFilters();
    }
  }

  viewUser(userId: number): void {
    this.router.navigate(['/admin/users', userId]);
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

  getSubscriptionColorClass(daysLeft: number): string {
    if (daysLeft <= 0) return 'text-danger';
    if (daysLeft < 3) return 'text-warning';
    return 'text-success';
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateOnly(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── SCANNER LOGIC ──

  openScanner(): void {
    this.showScanner.set(true);
  }

  onScanSuccess(qrCodeId: string): void {
    this.showScanner.set(false);
    this.processingScan.set(true);
    
    this.attendanceService.registerAttendance(qrCodeId).subscribe({
      next: (res) => {
        this.processingScan.set(false);
        this.scanResult.set(res);
        this.showResult.set(true);
        // Note: The websocket will update the table automatically because 
        // the backend emits the event on success.
      },
      error: (err) => {
        this.processingScan.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error de Asistencia',
          text: err.error?.message || 'El usuario no existe, está inactivo o no tiene suscripción vigente.',
          timer: 3500,
          background: '#1a1a1a',
          color: '#eee',
          confirmButtonColor: '#d32f2f'
        });
      }
    });
  }
}

