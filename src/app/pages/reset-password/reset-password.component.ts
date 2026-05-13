// src/app/pages/reset-password/reset-password.component.ts
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../../core/services/users.service';
import { NotificationService } from '../../core/services/notification.service';

type Step = 'verify' | 'newPassword' | 'success' | 'error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);
  private readonly notificationService = inject(NotificationService);

  // State
  step = signal<Step>('verify');
  token = signal('');
  userName = signal('');
  errorMessage = signal('');
  loading = signal(false);

  // Step 1 — phone verification
  phoneNumber = signal('');

  // Step 2 — new password
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Validations (Step 2)
  hasMinLength = computed(() => this.newPassword().length >= 8);
  hasUpperCase = computed(() => /[A-Z]/.test(this.newPassword()));
  hasLowerCase = computed(() => /[a-z]/.test(this.newPassword()));
  hasNumber = computed(() => /\d/.test(this.newPassword()));
  hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(this.newPassword()));
  passwordsMatch = computed(() => this.newPassword() !== '' && this.newPassword() === this.confirmPassword());

  isPasswordValid = computed(() =>
    this.hasMinLength() &&
    this.hasUpperCase() &&
    this.hasLowerCase() &&
    this.hasNumber() &&
    this.hasSpecialChar() &&
    this.passwordsMatch()
  );

  strengthScore = computed(() => {
    let score = 0;
    if (this.hasMinLength()) score += 20;
    if (this.hasUpperCase()) score += 20;
    if (this.hasLowerCase()) score += 20;
    if (this.hasNumber()) score += 20;
    if (this.hasSpecialChar()) score += 20;
    if (this.newPassword().length >= 12) score += 10;
    if (this.newPassword().length >= 16) score += 10;
    return Math.min(100, score);
  });

  strengthLabel = computed(() => {
    const s = this.strengthScore();
    if (s < 40) return 'Débil';
    if (s < 70) return 'Media';
    if (s < 100) return 'Fuerte';
    return 'Excelente';
  });

  strengthClass = computed(() => {
    const s = this.strengthScore();
    if (s < 40) return 'weak';
    if (s < 70) return 'medium';
    if (s < 100) return 'strong';
    return 'excellent';
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.step.set('error');
      this.errorMessage.set('El enlace no es válido. No se encontró un token de restablecimiento.');
      return;
    }
    this.token.set(token);
  }

  onVerifyPhone(): void {
    const phone = this.phoneNumber().trim();
    if (phone.length < 10 || this.loading()) return;

    this.loading.set(true);
    this.usersService.verifyResetToken(this.token(), phone).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.userName.set(res.userName);
        this.step.set('newPassword');
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'El enlace ha expirado o el número no es correcto.';
        this.notificationService.show(msg, 'error');
      },
    });
  }

  onSetPassword(): void {
    if (!this.isPasswordValid() || this.loading()) return;

    this.loading.set(true);
    this.usersService.confirmResetPassword(this.token(), this.phoneNumber(), this.newPassword()).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('success');
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Ocurrió un error al guardar la contraseña.';
        this.notificationService.show(msg, 'error');
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  toggleNewPassword(): void { this.showNewPassword.update(v => !v); }
  toggleConfirmPassword(): void { this.showConfirmPassword.update(v => !v); }
}

