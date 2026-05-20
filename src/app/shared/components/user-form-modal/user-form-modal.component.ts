import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserWithMembership } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-modal.component.html',
  styleUrls: ['./user-form-modal.component.css']
})
export class UserFormModalComponent implements OnInit {
  @Input() userToEdit: UserWithMembership | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveSuccess = new EventEmitter<{ message: string; qrBase64?: string }>();

  userForm: FormGroup;
  saving = signal(false);

  isSelfEdit = computed(() => {
    const me = this.authService.currentUser();
    return this.userToEdit !== null && me !== null && this.userToEdit.id === me.id;
  });

  isTargetSuperAdmin = computed(() => {
    return this.userToEdit?.role === 'superadmin';
  });

  isRoleFieldDisabled = computed(() => {
    return !this.authService.isSuperAdmin() || this.isSelfEdit() || this.isTargetSuperAdmin();
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
    public readonly authService: AuthService
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      number: ['', [Validators.required, Validators.pattern(String.raw`^\+?[0-9\s-]{10,18}$`)]],
      role: ['member']
    });
  }

  ngOnInit(): void {
    if (this.userToEdit) {
      this.userForm.patchValue({
        name: this.userToEdit.name,
        last_name: this.userToEdit.last_name || (this.userToEdit as any).lastName,
        number: this.userToEdit.number,
        role: this.userToEdit.role || 'member'
      });

      if (this.isTargetSuperAdmin() || this.isSelfEdit()) {
        this.userForm.get('number')?.disable();
      }

      if (this.isRoleFieldDisabled()) {
        this.userForm.get('role')?.disable();
      }
    }
  }

  get f() { return this.userForm.controls; }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.userForm.value;

    if (this.userToEdit) {
      // Edición
      const payload: any = {
        id: this.userToEdit.id,
        name: val.name,
        lastName: val.last_name,
        number: val.number
      };
      
      if (this.authService.isSuperAdmin() && val.role && !this.isSelfEdit() && !this.isTargetSuperAdmin()) {
        payload.role = val.role;
      }

      this.usersService.updateProfile(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.notificationService.show('Perfil actualizado correctamente.', 'success');
          this.saveSuccess.emit({ message: 'Perfil actualizado correctamente.' });
        },
        error: (err) => {
          this.saving.set(false);
          if (err.status === 400 && err.error?.message?.includes('already in use')) {
            this.userForm.controls['number'].setErrors({ phoneInUse: true });
            this.userForm.controls['number'].markAsTouched();
          } else {
            this.notificationService.show(err.error?.message || 'Error al actualizar el usuario.', 'error');
          }
        }
      });
    } else {
      // Registro
      this.usersService.create(val).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.notificationService.show('Usuario registrado con éxito.', 'success');
          this.saveSuccess.emit(res);
        },
        error: (err) => {
          this.saving.set(false);
          if (err.status === 400 && err.error?.message?.includes('already in use')) {
            this.userForm.controls['number'].setErrors({ phoneInUse: true });
            this.userForm.controls['number'].markAsTouched();
          } else {
            this.notificationService.show(err.error?.message || 'Error al registrar el usuario.', 'error');
          }
        }
      });
    }
  }
}
