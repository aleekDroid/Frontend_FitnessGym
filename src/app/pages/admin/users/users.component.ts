// src/app/pages/admin/users/users.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { UserWithMembership, CreateUserDto } from '../../../core/models/user.model';
import { SubscriptionType } from '../../../core/models/subscription.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  allUsers = signal<UserWithMembership[]>([]);
  subscriptionTypes = signal<SubscriptionType[]>([]);
  searchQuery = signal('');
  loading = signal(true);
  saving = signal(false);

  // Modal
  showModal = signal(false);
  editUser = signal<UserWithMembership | null>(null);
  deleteTarget = signal<UserWithMembership | null>(null);
  showDeleteConfirm = signal(false);

  userForm: FormGroup;

  constructor(
    private usersService: UsersService,
    private subscriptionsService: SubscriptionsService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      name:                 ['', [Validators.required]],
      last_name:            ['', [Validators.required]],
      number:               ['', [Validators.required]],
      suscription_type_id:  ['', [Validators.required]],
      payment_method:       ['efectivo', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.subscriptionsService.getAll().subscribe(types => {
      this.subscriptionTypes.set(types.filter(t => t.status === 'active'));
    });
  }

  loadData(): void {
    this.loading.set(true);
    this.usersService.getAll().subscribe(users => {
      this.allUsers.set(users.filter(u => u.role === 'member'));
      this.loading.set(false);
    });
  }

  get filteredUsers(): UserWithMembership[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allUsers();
    return this.allUsers().filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.number.includes(q)
    );
  }

  onSearch(val: string): void { this.searchQuery.set(val); }

  openCreate(): void {
    this.editUser.set(null);
    this.userForm.reset({ payment_method: 'efectivo' });
    this.showModal.set(true);
  }

  openEdit(user: UserWithMembership): void {
    this.editUser.set(user);
    this.userForm.patchValue({
      name: user.name,
      last_name: user.last_name,
      number: user.number,
      suscription_type_id: '',
      payment_method: 'efectivo',
    });
    this.showModal.set(true);
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
      this.usersService.update(this.editUser()!.id, { name: val.name, last_name: val.last_name, number: val.number }).subscribe(() => {
        this.saving.set(false);
        this.closeModal();
        this.loadData();
      });
    } else {
      this.usersService.create(val as CreateUserDto).subscribe(() => {
        this.saving.set(false);
        this.closeModal();
        this.loadData();
      });
    }
  }

  confirmDelete(user: UserWithMembership): void {
    this.deleteTarget.set(user);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTarget.set(null);
  }

  doDelete(): void {
    if (!this.deleteTarget()) return;
    this.usersService.delete(this.deleteTarget()!.id).subscribe(() => {
      this.cancelDelete();
      this.loadData();
    });
  }

  get f() { return this.userForm.controls; }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getMembershipBadge(u: UserWithMembership): { label: string; cls: string } {
    switch (u.membership_status) {
      case 'expired':  return { label: 'Vencida',     cls: 'badge-danger'  };
      case 'expiring': return { label: 'Por vencer',  cls: 'badge-warning' };
      default:         return { label: 'Activa',      cls: 'badge-success' };
    }
  }
}
