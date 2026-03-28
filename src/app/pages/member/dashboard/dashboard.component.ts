import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MemberService } from "../../../core/services/member.service";
import { AuthService } from "../../../core/services/auth.service";
import {
  MemberDashboardResponse,
  RoutineDay,
} from "../../../core/models/member-dashboard.model";
import { RoutineEditModalComponent } from "../../../shared/components/routine-edit-modal/routine-edit-modal.component";
import { DayRoutineModalComponent } from "../../../shared/components/day-routine-modal/day-routine-modal.component";

const QUOTES = [
  "El dolor que sientes hoy será la fuerza que sientes mañana.",
  "No pares cuando estés cansado. Para cuando hayas terminado.",
  "Cada rep te acerca más a quien quieres ser.",
  "Tu único competidor eres tú mismo de ayer.",
];

const DAY_LABELS: Record<string, string> = {
  // English keys (real API)
  Monday: "Lun",
  Tuesday: "Mar",
  Wednesday: "Mié",
  Thursday: "Jue",
  Friday: "Vie",
  Saturday: "Sáb",
  Sunday: "Dom",
  // Spanish keys (simulated API fallback)
  Lunes: "Lun",
  Martes: "Mar",
  Miércoles: "Mié",
  Jueves: "Jue",
  Viernes: "Vie",
  Sábado: "Sáb",
  Domingo: "Dom",
};

// Maps English weekday names to Spanish, to unify comparisons
const ENG_TO_SPA: Record<string, string> = {
  Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles",
  Thursday: "Jueves", Friday: "Viernes", Saturday: "Sábado", Sunday: "Domingo",
};

@Component({
  selector: "app-member-dashboard",
  standalone: true,
  imports: [CommonModule, RoutineEditModalComponent, DayRoutineModalComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class MemberDashboardComponent implements OnInit {
  private readonly memberService = inject(MemberService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(true);
  error = signal<boolean>(false);
  data = signal<MemberDashboardResponse | null>(null);
  savingRoutine = signal(false);

  // Modal state
  showRoutineModal = signal(false);
  modalLoading = signal(false);
  fullRoutine = signal<RoutineDay[]>([]);
  showDayRoutineModal = signal(false);
  selectedDayForView = signal<RoutineDay | null>(null);

  // QR Modal state
  showQrModal = signal(false);
  qrImageUrl = signal<string | null>(null);
  qrLoading = signal(false);
  qrError = signal(false);

  quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Mapeamos los días base de inglés (rutina) a español para UI
  daysOfWeek = [
    { eng: 'Monday', spa: 'Lunes' },
    { eng: 'Tuesday', spa: 'Martes' },
    { eng: 'Wednesday', spa: 'Miércoles' },
    { eng: 'Thursday', spa: 'Jueves' },
    { eng: 'Friday', spa: 'Viernes' },
    { eng: 'Saturday', spa: 'Sábado' },
    { eng: 'Sunday', spa: 'Domingo' }
  ];

  user = computed(() => this.data()?.user ?? null);
  subscription = computed(() => this.data()?.activeSubscription ?? null);
  attendances = computed(() => this.data()?.recentAttendances ?? []);
  payments = computed(() => this.data()?.paymentHistory ?? []);

  routine = computed(() => this.user()?.routine ?? null);
  qrCodeId = computed(() => this.user()?.qr_code_id ?? null);
  streak = computed(() => this.routine()?.streak ?? 0);
  isStreakActive = computed(() => this.routine()?.isStreakActive ?? false);
  attendedToday = computed(() => this.routine()?.attendedToday ?? false);
  jokers = computed(() => this.routine()?.comodines_usados ?? 0);
  lastAttendance = computed(() => this.routine()?.lastAttendance ?? null);

  days = computed<RoutineDay[]>(() => this.routine()?.days ?? []);

  nextJokerIn = computed(() => {
    const s = this.streak();
    if (s === 0) return 10;
    return 10 - (s % 10);
  });

  jokerWarning = computed(() => this.jokers() === 0 && this.isStreakActive());

  /** Determinamos el estado visual de la racha */
  streakStatus = computed(() => {
    const s = this.streak();
    const attended = this.attendedToday();

    if (s === 0) return 'NONE';
    if (attended) return 'COMPLETED';
    return 'PENDING';
  });

  /** Warning de riesgo si no hay comodines y falta ir hoy */
  isStreakAtRisk = computed(() => {
    return this.jokers() === 0 && this.streakStatus() === 'PENDING';
  });

  hasRoutine = computed(() => this.routine() !== null && (this.routine()?.days?.length ?? 0) > 0);

  /** true = usuario no ha guardado su primera rutina — la racha está en modo protegido */
  isSetupPending = computed(() => this.user()?.isSetupPending ?? false);


  daysLeft = computed(() => {
    const sub = this.subscription();
    if (!sub?.end_date) return null;
    const diff = new Date(sub.end_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  membershipProgress = computed(() => {
    const sub = this.subscription();
    if (!sub) return 0;
    const total =
      new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime();
    const elapsed = Date.now() - new Date(sub.start_date).getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  });

  progressClass = computed(() => {
    const left = this.daysLeft();
    if (left === null) return "";
    if (left <= 5) return "danger";
    if (left <= 10) return "warn";
    return "";
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /** Carga (o refresca) todos los datos del dashboard desde el servidor */
  private loadDashboardData(): void {
    this.memberService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching dashboard data', err);
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  // Added logout method
  logout(): void {
    this.authService.logout();
  }

  getDayLabel(day: string): string {
    return DAY_LABELS[day] ?? day.slice(0, 3);
  }

  isAttendedThisWeek(dayName: string): boolean {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    return this.attendances().some((a) => {
      const d = new Date(a.created_at);
      const engName = d.toLocaleDateString("en-US", { weekday: "long" }); // e.g. 'Monday'
      const spaName = ENG_TO_SPA[engName] ?? engName; // e.g. 'Lunes'
      return (
        d >= weekStart &&
        (engName === dayName || spaName === dayName)
      );
    });
  }

  get todayName(): string {
    const engName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    // Return both so matching works whether API uses English or Spanish day names
    return engName;
  }

  isTodayCard(dayName: string): boolean {
    const engName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return dayName === engName || dayName === (ENG_TO_SPA[engName] ?? engName);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  }

  getJokersArray(total = 3): { used: boolean }[] {
    const used = this.jokers();
    return Array.from({ length: total }, (_, i) => ({
      used: i >= used,
    }));
  }

  toggleDay(index: number): void {
    const current = this.days();
    const routine = this.routine();
    if (!current.length || !routine) return;

    const updated = current.map((d, i) =>
      i === index ? { ...d, isRestDay: !d.isRestDay } : d,
    );

    this.data.update((d) => {
      if (!d) return d;
      return {
        ...d,
        user: {
          ...d.user,
          routine: { ...routine, days: updated },
        },
      };
    });

    this.savingRoutine.set(true);
    this.memberService.updateRoutine(updated).subscribe({
      next: () => this.savingRoutine.set(false),
      error: () => {
        this.data.update((d) => {
          if (!d) return d;
          return {
            ...d,
            user: {
              ...d.user,
              routine: { ...routine, days: current },
            },
          };
        });
        this.savingRoutine.set(false);
      },
    });
  }

  // ─── Modal methods ───

  openRoutineModal(): void {
    this.showRoutineModal.set(true);
    this.modalLoading.set(true);
    this.memberService.getFullRoutine().subscribe({
      next: (res) => {
        this.fullRoutine.set(res.days);
        this.modalLoading.set(false);
      },
      error: () => this.modalLoading.set(false),
    });
  }

  onRoutineSaved(days: RoutineDay[]): void {
    this.memberService.saveRoutine(days).subscribe({
      next: () => {
        this.showRoutineModal.set(false);
        // Refrescar todos los datos para asegurar que flags (isSetupPending) y racha estén al día
        this.loadDashboardData();
      },
      error: () => {
        this.showRoutineModal.set(false);
      },
    });
  }

  onRoutineModalClosed(): void {
    this.showRoutineModal.set(false);
  }

  // ─── Day Routine View methods ───

  openDayRoutine(day: RoutineDay): void {
    this.selectedDayForView.set(day);
    this.showDayRoutineModal.set(true);
  }

  closeDayRoutine(): void {
    this.showDayRoutineModal.set(false);
    this.selectedDayForView.set(null);
  }

  // ─── QR Modal methods ───
  openQrModal(): void {
    const codeId = this.qrCodeId();
    this.showQrModal.set(true);
    if (!codeId) {
      this.qrError.set(true);
      return;
    }
    this.qrError.set(false);
    this.qrLoading.set(true);
    this.memberService.getQrCode(codeId).subscribe({
      next: (blob) => {
        // Blob must be created into URL for img src
        const url = URL.createObjectURL(blob);
        this.qrImageUrl.set(url);
        this.qrLoading.set(false);
      },
      error: () => {
        this.qrError.set(true);
        this.qrLoading.set(false);
      }
    });
  }

  closeQrModal(): void {
    this.showQrModal.set(false);
    // free memory
    const url = this.qrImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.qrImageUrl.set(null);
    this.qrError.set(false);
  }
}
