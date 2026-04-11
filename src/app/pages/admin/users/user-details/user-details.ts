// src/app/pages/admin/users/user-details/user-details.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService, UserDetailsResponse, SubscriptionHistoryItem } from '../../../../core/services/users.service';
import { AttendanceService, AttendanceHistoryItem } from '../../../../core/services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserWithMembership } from '../../../../core/models/user.model';
import { AssignSubscriptionModalComponent } from '../../../../shared/components/assign-subscription-modal/assign-subscription-modal.component';
import { StatusConfirmModalComponent } from '../../../../shared/components/status-confirm-modal/status-confirm-modal.component';
import { TransactionDetailModalComponent } from '../../../../shared/components/transaction-detail-modal/transaction-detail-modal.component';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AssignSubscriptionModalComponent, StatusConfirmModalComponent, TransactionDetailModalComponent],
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
  userForm: FormGroup;

  showStatusConfirm = signal(false);
  showAssignModal = signal(false);
  
  showTransactionDetail = signal(false);
  selectedTransactionId = signal<number | null>(null);

  // Password Reset Signals
  showResetConfirm = signal(false);
  showPasswordModal = signal(false);
  generatedPassword = signal('');
  resettingPassword = signal(false);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService,
    private readonly notificationService: NotificationService,
    private readonly fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      number: ['', [Validators.required, Validators.minLength(10), Validators.pattern('^[0-9]*$')]]
    });
  }

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
    
    this.loading.set(true);
    this.usersService.getById(this.userId, this.currentPage(), this.limit()).subscribe({
      next: (res) => {
        this.user.set(res.user);
        this.history.set(res.subscriptionHistory);
        this.totalPages.set(res.historyMeta.totalPages);
        this.totalItems.set(res.historyMeta.totalItems);
        this.currentPage.set(res.historyMeta.currentPage);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching user details:', err);
        alert('No se pudo cargar la información del usuario.');
        this.loading.set(false);
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

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  // ─── EDIT MODAL ───
  get f() { return this.userForm.controls; }

  openEditModal(): void {
    const u = this.user();
    if (!u) return;
    this.userForm.patchValue({
      name: u.name,
      last_name: u.last_name,
      number: u.number
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  onSubmitEdit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    if (!this.userId) return;

    this.saving.set(true);
    const val = this.userForm.value;
    const payload = {
      id: this.userId,
      name: val.name,
      lastName: val.last_name,
      number: val.number
    };
    
    this.usersService.updateProfile(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEditModal();
        this.notificationService.show('Perfil actualizado correctamente.', 'success');
        this.loadData();
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        this.saving.set(false);
        if (err.status === 400 && err.error?.message?.includes('already in use')) {
             this.userForm.controls['number'].setErrors({ phoneInUse: true });
             this.userForm.controls['number'].markAsTouched();
        } else if (err.status === 400 && err.error?.message?.includes('not found')) {
             alert('El usuario no existe.');
        } else {
             alert('Hubo un error al actualizar los datos.');
        }
      }
    });
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

  /** Returns the current user shaped as UserWithMembership for the modal's prefilledUser input */
  get prefilledUserForModal(): UserWithMembership | null {
    const u = this.user();
    if (!u) return null;
    const activeSub = this.history().find(h => h.status === 'active' || h.status === 'expiring');
    return {
      ...u,
      membership_end: activeSub?.end_date,
      membership_status: activeSub?.status
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
        this.generatedPassword.set(res.password);
        this.showPasswordModal.set(true);
        this.notificationService.show('Contraseña reseteada exitosamente.', 'success');
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
    this.generatedPassword.set('');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.show('Contraseña copiada al portapapeles', 'success');
    }).catch(err => {
      console.error('Error al copiar:', err);
      this.notificationService.show('No se pudo copiar la contraseña', 'error');
    });
  }
}

