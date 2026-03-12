export interface RoutineDay {
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  isRestDay: boolean;
}

export interface Routine {
  streak: number;
  comodines_usados: number;
  isStreakActive: boolean;
  lastAttendance: string | null;
  days: RoutineDay[];
}

export interface MemberUser {
  id: number;
  name: string;
  last_name: string;
  number: string;
  routine: Routine;
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
  payment_method: "efectivo" | "transferencia" | "tarjeta" | string;
  total: number;
}

export interface MemberDashboardResponse {
  user: MemberUser;
  activeSubscription: ActiveSubscription | null;
  recentAttendances: AttendanceRecord[];
  paymentHistory: PaymentRecord[];
}
