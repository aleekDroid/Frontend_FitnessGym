import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService, UserDetailsResponse, SubscriptionHistoryItem } from '../../../../core/services/users.service';
import { UserWithMembership } from '../../../../core/models/user.model';
import { AssignSubscriptionModalComponent } from '../../../../shared/components/assign-subscription-modal/assign-subscription-modal.component';
import { ConfirmStatusModalComponent } from '../../../../shared/components/confirm-status-modal/confirm-status-modal.component';
import { TransactionDetailModalComponent } from '../../../../shared/components/transaction-detail-modal/transaction-detail-modal.component';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AssignSubscriptionModalComponent, ConfirmStatusModalComponent, TransactionDetailModalComponent],
  templateUrl: './user-details.html',
  styleUrls: ['./user-details.css']
})
export class UserDetails implements OnInit {
  userId: number | null = null;
  loading = signal(true);
  
  // Data Signals
  user = signal<UserDetailsResponse['user'] | null>(null);
  history = signal<SubscriptionHistoryItem[]>([]);
  
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

  // TOAST STATE
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      number: ['', [Validators.required]]
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

  // ─── TOGGLE STATUS MODAL ───
  confirmToggleStatus(): void {
    this.showStatusConfirm.set(true);
  }

  cancelToggleStatus(): void {
    this.showStatusConfirm.set(false);
  }

  onStatusConfirm(updatedUser: UserWithMembership): void {
    // Patch the local user status without a network reload
    this.user.update(u => u ? { ...u, status: updatedUser.status } : u);
    this.cancelToggleStatus();
    this.showToast('Estado del usuario actualizado correctamente.', 'success');
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => { this.toastMessage.set(null); }, 3500);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
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
    this.showToast('Suscripción asignada exitosamente.', 'success');
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
}

