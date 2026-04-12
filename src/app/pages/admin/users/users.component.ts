import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UsersService } from '../../../core/services/users.service';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserWithMembership } from '../../../core/models/user.model';
import { SubscriptionType } from '../../../core/models/subscription.model';
import { AssignSubscriptionModalComponent } from '../../../shared/components/assign-subscription-modal/assign-subscription-modal.component';
import { StatusConfirmModalComponent } from '../../../shared/components/status-confirm-modal/status-confirm-modal.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AssignSubscriptionModalComponent, StatusConfirmModalComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  users = signal<UserWithMembership[]>([]);
  subscriptionTypes = signal<SubscriptionType[]>([]);
  loading = signal(true);
  saving = signal(false);

  // Pagination & Search
  searchQuery = signal('');
  filterStatus = signal<'active' | 'inactive' | ''>('');
  filterRole = signal<'admin' | 'member' | ''>('');
  filterSubscription = signal<'true' | 'false' | 'all'>('all');
  currentPage = signal(1);
  limit = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);
  private readonly searchSubject = new Subject<string>();

  // Modal
  // Modals
  showModal = signal(false);
  editUser = signal<UserWithMembership | null>(null);
  statusTarget = signal<UserWithMembership | null>(null);
  showStatusConfirm = signal(false);

  // New: Password display after registration
  showPasswordModal = signal(false);
  generatedPassword = signal('');

  // Modal Assign Subscription State
  showAssignModal = signal(false);

  // Mobile Filters Toggle
  showFilters = signal(false);
  isDesktop = signal(false);

  private readonly notificationService = inject(NotificationService);

  userForm: FormGroup;

  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly fb: FormBuilder,
    private readonly router: Router
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      number: ['', [Validators.required, Validators.minLength(10), Validators.pattern('^[0-9]*$')]]
    });
  }

  ngOnInit(): void {
    // Detect desktop resolution
    this.checkIsDesktop();

    // Setup debounced search targeting backend
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.loadData();
    });

    this.loadData();
    this.subscriptionsService.getAll().subscribe(res => {
      this.subscriptionTypes.set(res.data.filter(t => t.status === 'active'));
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkIsDesktop();
  }

  loadData(): void {
    this.loading.set(true);

    const status = this.filterStatus() || undefined;
    const role = this.filterRole() || undefined;
    const hasSub = this.filterSubscription();

    this.usersService.getUsers(
      this.currentPage(), 
      this.limit(), 
      this.searchQuery(),
      status,
      role,
      hasSub
    ).subscribe({
      next: res => {
        this.users.set(res.data);
        this.totalItems.set(res.meta.totalItems);
        this.totalPages.set(res.meta.totalPages);
        this.currentPage.set(res.meta.currentPage);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }


  onSearch(val: string): void {
    this.searchSubject.next(val);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadData();
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

  openCreate(): void {
    this.editUser.set(null);
    this.userForm.reset();
    this.showModal.set(true);
  }

  openEdit(user: UserWithMembership): void {
    this.editUser.set(user);
    this.userForm.patchValue({
      name: user.name,
      last_name: user.last_name,
      number: user.number
    });
    this.showModal.set(true);
  }

  openDetails(user: UserWithMembership): void {
    this.router.navigate(['/admin/users', user.id]);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.userForm.reset();
  }

  onSubmit(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.userForm.value;

    if (this.editUser()) {
      this.usersService.update(this.editUser()!.id, { name: val.name, last_name: val.last_name, number: val.number }).subscribe({
        next: () => {
          this.notificationService.show('Datos del usuario actualizados correctamente', 'success');
          this.saving.set(false);
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.notificationService.show('No se pudo actualizar el usuario', 'error');
          this.saving.set(false);
        }
      });
    } else {
      this.usersService.create(val).subscribe({
        next: (res) => {
          this.notificationService.show('Usuario registrado con éxito', 'success');
          this.saving.set(false);
          this.closeModal();
          this.loadData();
          
          // Show the generated password
          if (res?.password) {
            this.generatedPassword.set(res.password);
            this.showPasswordModal.set(true);
          }
        },
        error: (err) => {
          this.notificationService.show('Hubo un error al registrar el usuario. Revisa los datos.', 'error');
          console.error('Error al crear usuario:', err);
          this.saving.set(false);
        }
      });
    }
  }

  togglingStatus = signal(false);

  confirmToggleStatus(user: UserWithMembership): void {
    this.statusTarget.set(user);
    this.showStatusConfirm.set(true);
  }

  cancelToggleStatus(): void {
    if (this.togglingStatus()) return;
    this.showStatusConfirm.set(false);
    this.statusTarget.set(null);
  }

  doStatusToggle(): void {
    const user = this.statusTarget();
    if (!user) return;

    this.togglingStatus.set(true);
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    this.usersService.toggleUserStatus(user.id, newStatus).subscribe({
      next: () => {
        this.users.update(users => users.map(u => 
          u.id === user.id ? { ...u, status: newStatus } : u
        ));
        this.notificationService.show(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} correctamente`, 'success');
        this.togglingStatus.set(false);
        this.cancelToggleStatus();
      },
      error: (err) => {
        console.error('Error toggling status:', err);
        this.notificationService.show('No se pudo cambiar el estado del usuario', 'error');
        this.togglingStatus.set(false);
      }
    });
  }

  onStatusConfirm(updatedUser: UserWithMembership): void {
    // This was used by the old modal, we might not need it if we use doStatusToggle
  }

  get f() { return this.userForm.controls; }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getMembershipBadge(u: UserWithMembership): { label: string; cls: string } {
    switch (u.membership_status) {
      case 'expired':  return { label: 'Vencida', cls: 'badge-danger' };
      case 'expiring': return { label: 'Por vencer', cls: 'badge-warning' };
      case 'active':   return { label: 'Activa', cls: 'badge-success' };
      case 'none':     return { label: 'Sin suscripción', cls: 'badge-muted' };
      default:         return { label: 'Sin suscripción', cls: 'badge-muted' };
    }
  }

  // ── ASSIGN SUBSCRIPTION LOGIC ──

  openAssignModal(): void {
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
  }

  onAssignSuccess(): void {
    this.showAssignModal.set(false);
    this.notificationService.show('Suscripción asignada exitosamente a los usuarios seleccionados.', 'success');
    this.loadData();
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  private checkIsDesktop(): void {
    if (globalThis.window !== undefined) {
      this.isDesktop.set(globalThis.window.innerWidth > 768);
    }
  }

  closeFilters(): void {
    this.showFilters.set(false);
  }

  // Password Success Modal Actions
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
