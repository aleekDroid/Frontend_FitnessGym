import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MemberService } from "../../../core/services/member.service";
import { AuthService } from "../../../core/services/auth.service";
import {
  MemberDashboardResponse,
  RoutineDay,
} from "../../../core/models/member-dashboard.model";

const QUOTES = [
  "El dolor que sientes hoy será la fuerza que sientes mañana.",
  "No pares cuando estés cansado. Para cuando hayas terminado.",
  "Cada rep te acerca más a quien quieres ser.",
  "Tu único competidor eres tú mismo de ayer.",
];

const DAY_LABELS: Record<string, string> = {
  Monday: "Lun",
  Tuesday: "Mar",
  Wednesday: "Mié",
  Thursday: "Jue",
  Friday: "Vie",
  Saturday: "Sáb",
  Sunday: "Dom",
};

@Component({
  selector: "app-member-dashboard",
  standalone: true,
  imports: [CommonModule],
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
  streak = computed(() => this.routine()?.streak ?? 0);
  isStreakActive = computed(() => this.routine()?.isStreakActive ?? false);
  jokers = computed(() => this.routine()?.comodines_usados ?? 0);
  lastAttendance = computed(() => this.routine()?.lastAttendance ?? null);

  days = computed<RoutineDay[]>(() => this.routine()?.days ?? []);

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
    this.memberService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => { // Modified error handling
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
      return (
        d >= weekStart &&
        d.toLocaleDateString("en-US", { weekday: "long" }) === dayName
      );
    });
  }

  get todayName(): string {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
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

  getJokersArray(total = 5): { used: boolean }[] {
    const used = this.jokers();
    return Array.from({ length: total }, (_, i) => ({
      used: i >= total - used,
    }));
  }

  toggleDay(index: number): void {
    const current = this.days();
    if (!current.length) return;

    const updated = current.map((d, i) =>
      i === index ? { ...d, isRestDay: !d.isRestDay } : d,
    );

    this.data.update((d) => {
      if (!d) return d;
      return {
        ...d,
        user: {
          ...d.user,
          routine: { ...d.user.routine, days: updated },
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
              routine: { ...d.user.routine, days: current },
            },
          };
        });
        this.savingRoutine.set(false);
      },
    });
  }
}
