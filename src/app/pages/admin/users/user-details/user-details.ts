// src/app/pages/admin/users/user-details/user-details.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UsersService, UserDetailsResponse, SubscriptionHistoryItem } from '../../../../core/services/users.service';
import { AttendanceService, AttendanceHistoryItem } from '../../../../core/services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserWithMembership } from '../../../../core/models/user.model';
import { AssignSubscriptionModalComponent } from '../../../../shared/components/assign-subscription-modal/assign-subscription-modal.component';
import { StatusConfirmModalComponent } from '../../../../shared/components/status-confirm-modal/status-confirm-modal.component';
import { TransactionDetailModalComponent } from '../../../../shared/components/transaction-detail-modal/transaction-detail-modal.component';
import { UserFormModalComponent } from '../../../../shared/components/user-form-modal/user-form-modal.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AssignSubscriptionModalComponent,
    StatusConfirmModalComponent,
    TransactionDetailModalComponent,
    UserFormModalComponent
  ],
  templateUrl: './user-details.html',
  styleUrls: ['./user-details.css']
})
export class UserDetails implements OnInit {
  userId: number | null = null;
  loading = signal(true);
  
  // Data Signals
  user = signal<UserDetailsResponse['user'] | null>(null);
  history = signal<SubscriptionHistoryItem[]>([]);
  lastAttendances = signal<AttendanceHistoryItem[]>([]);
  
  // Pagination Signals
  currentPage = signal(1);
  limit = signal(10);
  totalPages = signal(0);
  totalItems = signal(0);

  // Modals & Forms
  showEditModal = signal(false);
  saving = signal(false);
  loadingTable = signal(false);

  showStatusConfirm = signal(false);
  showAssignModal = signal(false);
  
  showTransactionDetail = signal(false);
  selectedTransactionId = signal<number | null>(null);

  // Password Reset Signals
  showResetConfirm = signal(false);
  showPasswordModal = signal(false);
  qrBase64 = signal('');
  resettingPassword = signal(false);
  downloadingQr = signal(false);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService,
    private readonly notificationService: NotificationService,
    public readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    // Escuchamos cambios en los parámetros de la ruta para permitir navegar entre usuarios
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.userId = +idParam;
        this.loadData();
      } else {
        this.goBack();
      }
    });
  }

  loadData(): void {
    if (!this.userId) return;
    
    const isFirstLoad = !this.user();
    if (isFirstLoad) {
      this.loading.set(true);
    } else {
      this.loadingTable.set(true);
    }
    
    this.usersService.getById(this.userId, this.currentPage(), this.limit()).subscribe({
      next: (res) => {
        this.user.set(res.user);
        this.history.set(res.subscriptionHistory);
        this.totalPages.set(res.historyMeta.totalPages);
        this.totalItems.set(res.historyMeta.totalItems);
        this.currentPage.set(res.historyMeta.currentPage);
        this.loading.set(false);
        this.loadingTable.set(false);
      },
      error: (err) => {
        console.error('Error fetching user details:', err);
        this.notificationService.show('No se pudo cargar la información del usuario.', 'error');
        this.loading.set(false);
        this.loadingTable.set(false);
        this.goBack();
      }
    });

    this.attendanceService.getLastAttendances(this.userId).subscribe({
      next: (attendances) => {
        this.lastAttendances.set(attendances);
      },
      error: (err) => {
        console.error('Error fetching last attendances:', err);
      }
    });
  }

  onLimitChange(newLimit: number): void {
    this.limit.set(newLimit);
    this.currentPage.set(1);
    this.loadData();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadData();
    }
  }

  canEditProfile(): boolean {
    const target = this.user();
    if (!target) return false;
    return this.authService.canEditProfile(target.id, target.role);
  }

  canToggleStatus(): boolean {
    const target = this.user();
    if (!target) return false;
    return this.authService.canToggleStatus(target.id, target.role);
  }

  canResetPassword(): boolean {
    const target = this.user();
    if (!target) return false;
    return this.authService.canResetPassword(target.id, target.role);
  }

  canAssignSubscription(): boolean {
    const target = this.user();
    if (!target) return false;
    return this.authService.canAssignSubscription(target.role);
  }

  goBack(): void {
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'home') {
      this.router.navigate(['/admin/home']);
    } else {
      this.router.navigate(['/admin/users']);
    }
  }

  // ─── EDIT MODAL ───
  get userToEdit(): UserWithMembership | null {
    const u = this.user();
    if (!u) return null;
    return u as any;
  }

  openEditModal(): void {
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  onSaveSuccess(res: any): void {
    this.closeEditModal();
    this.loadData();
  }

  togglingStatus = signal(false);

  // ─── TOGGLE STATUS MODAL ───
  confirmToggleStatus(): void {
    this.showStatusConfirm.set(true);
  }

  cancelToggleStatus(): void {
    if (this.togglingStatus()) return;
    this.showStatusConfirm.set(false);
  }

  doStatusToggle(): void {
    const user = this.user();
    if (!user) return;

    this.togglingStatus.set(true);
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    this.usersService.toggleUserStatus(user.id, newStatus).subscribe({
      next: () => {
        this.user.update(u => u ? { ...u, status: newStatus } : u);
        this.notificationService.show(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} correctamente.`, 'success');
        this.togglingStatus.set(false);
        this.cancelToggleStatus();
      },
      error: (err) => {
        console.error('Error toggling status:', err);
        this.notificationService.show('No se pudo cambiar el estado del usuario.', 'error');
        this.togglingStatus.set(false);
      }
    });
  }

  onStatusConfirm(updatedUser: UserWithMembership): void {
    // Legacy support for old modal if needed, but we use doStatusToggle now
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  }

  // ── ASSIGN SUBSCRIPTION ──

  get prefilledUserForModal(): UserWithMembership | null {
    const u = this.user();
    if (!u) return null;
    
    // Find active subscription that is NOT a visita and NOT expired dynamically
    const activeSub = this.history().find(h => {
      const isExpired = h.status === 'active' && new Date(h.end_date).getTime() < Date.now();
      return (h.status === 'active' || h.status === 'expiring') && 
             !isExpired &&
             !h.suscriptions_types?.name?.toLowerCase().includes('visita');
    });

    const hasHistory = this.history().some(h => !h.suscriptions_types?.name?.toLowerCase().includes('visita'));
    
    return {
      ...u,
      membership_end: activeSub?.end_date,
      membership_status: activeSub?.status || (hasHistory ? 'expired' : 'none'),
      has_subscription_history: hasHistory
    } as UserWithMembership;
  }

  openAssignModal(): void {
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
  }

  onAssignSuccess(): void {
    this.showAssignModal.set(false);
    this.notificationService.show('Suscripción asignada exitosamente.', 'success');
    this.loadData();
  }

  // ── TRANSACTION DETAIL ──
  openTransactionDetail(transactionId: number): void {
    this.selectedTransactionId.set(transactionId);
    this.showTransactionDetail.set(true);
  }

  closeTransactionDetail(): void {
    this.showTransactionDetail.set(false);
    this.selectedTransactionId.set(null);
  }

  // ── PASSWORD RESET ──
  confirmResetPassword(): void {
    this.showResetConfirm.set(true);
  }

  cancelResetPassword(): void {
    if (this.resettingPassword()) return;
    this.showResetConfirm.set(false);
  }

  doResetPassword(): void {
    const user = this.user();
    if (!user) return;

    this.resettingPassword.set(true);
    this.usersService.resetPasswordAdmin(user.id).subscribe({
      next: (res) => {
        this.resettingPassword.set(false);
        this.showResetConfirm.set(false);
        this.qrBase64.set(res.qrBase64);
        this.showPasswordModal.set(true);
        this.notificationService.show('QR de restablecimiento generado.', 'success');
      },
      error: (err) => {
        console.error('Error resetting password:', err);
        this.notificationService.show('No se pudo resetear la contraseña.', 'error');
        this.resettingPassword.set(false);
      }
    });
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
    this.qrBase64.set('');
  }

  downloadQr(): void {
    const base64 = this.qrBase64();
    if (!base64 || this.downloadingQr()) return;

    this.downloadingQr.set(true);
    
    const link = document.createElement('a');
    link.href = 'data:image/png;base64,' + base64;
    link.download = 'qr-reset-password.png';
    link.click();

    setTimeout(() => {
      this.downloadingQr.set(false);
    }, 1000);
  }
}

