export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  machine: string;
  note?: string;
}

export interface RoutineDay {
  day: string; // flexible: 'Monday' | 'Lunes' etc. depending on API
  isRestDay: boolean;
  description?: string;
  exercises: Exercise[];
}

export interface FullRoutine {
  days: RoutineDay[];
}

export interface Routine {
  streak: number;
  comodines_usados: number;
  isStreakActive: boolean;
  attendedToday: boolean;
  lastAttendance: string | null;
  days: RoutineDay[];
}

export interface MemberUser {
  id?: number;
  name: string;
  last_name: string;
  number: string;
  qr_code_id?: string;
  isSetupPending: boolean;
  routine: Routine | null;
}

export interface ActiveSubscription {
  id: number;
  status: "active" | "expiring" | "expired";
  start_date: string;
  end_date: string;
  suscriptions_types: {
    name: string;
    description: string;
    duration: number;
    price: number;
  };
}

export interface AttendanceRecord {
  id: number;
  created_at: string;
}

export interface PaymentRecord {
  transaction_id: number;
  plan_name: string;
  created_at: string;
  payment_method: string;
  total: number;
}

export interface MemberDashboardResponse {
  user: MemberUser;
  activeSubscription: ActiveSubscription | null;
  recentAttendances: AttendanceRecord[];
  paymentHistory: PaymentRecord[];
}
