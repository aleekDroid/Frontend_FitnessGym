import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MemberService } from "../../../core/services/member.service";
import { NotificationService } from "../../../core/services/notification.service";

@Component({
  selector: "app-change-password-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./change-password-modal.component.html",
  styleUrls: ["./change-password-modal.component.scss"],
})
export class ChangePasswordModalComponent {
  private readonly memberService = inject(MemberService);
  private readonly notificationService = inject(NotificationService);

  @Output() success = new EventEmitter<void>();

  // Form signals
  oldPassword = signal("");
  newPassword = signal("");
  confirmPassword = signal("");

  loading = signal(false);
  showOldPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Validation Signals
  hasMinLength = computed(() => this.newPassword().length >= 8);
  hasUpperCase = computed(() => /[A-Z]/.test(this.newPassword()));
  hasLowerCase = computed(() => /[a-z]/.test(this.newPassword()));
  hasNumber = computed(() => /\d/.test(this.newPassword()));
  hasSpecialChar = computed(() =>
    /[!@#$%^&*(),.?":{}|<>]/.test(this.newPassword()),
  );

  passwordsMatch = computed(
    () =>
      this.newPassword() !== "" &&
      this.newPassword() === this.confirmPassword(),
  );

  isValid = computed(
    () =>
      this.hasMinLength() &&
      this.hasUpperCase() &&
      this.hasLowerCase() &&
      this.hasNumber() &&
      this.hasSpecialChar() &&
      this.passwordsMatch() &&
      this.oldPassword() !== "",
  );

  // Strength Level (0-100)
  strengthScore = computed(() => {
    let score = 0;
    const pwd = this.newPassword();
    if (!pwd) return 0;

    if (this.hasMinLength()) score += 20;
    if (this.hasUpperCase()) score += 20;
    if (this.hasLowerCase()) score += 20;
    if (this.hasNumber()) score += 20;
    if (this.hasSpecialChar()) score += 20;

    // Bonus for length
    if (pwd.length >= 12) score += 10;
    if (pwd.length >= 16) score += 10;

    return Math.min(100, score);
  });

  strengthLabel = computed(() => {
    const s = this.strengthScore();
    if (s < 40) return "Débil";
    if (s < 70) return "Media";
    if (s < 100) return "Fuerte";
    return "Excelente";
  });

  strengthClass = computed(() => {
    const s = this.strengthScore();
    if (s < 40) return "weak";
    if (s < 70) return "medium";
    if (s < 100) return "strong";
    return "excellent";
  });

  toggleOldPasswordVisibility(): void {
    this.showOldPassword.update((v) => !v);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (!this.isValid() || this.loading()) return;

    this.loading.set(true);
    this.memberService
      .changePassword(this.oldPassword(), this.newPassword())
      .subscribe({
        next: () => {
          this.notificationService.show(
            "¡Contraseña actualizada con éxito!",
            "success",
          );
          this.loading.set(false);
          this.success.emit();
        },
        error: (err) => {
          console.error("Error changing password", err);
          this.notificationService.show(
            err.error?.message ||
              "Error al cambiar la contraseña. Verifica tu contraseña actual.",
            "error",
          );
          this.loading.set(false);
        },
      });
  }
}
