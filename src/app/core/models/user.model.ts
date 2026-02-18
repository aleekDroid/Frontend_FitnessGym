// src/app/core/models/user.model.ts

export interface User {
  id: number;
  number: string;           // WhatsApp number
  name: string;
  last_name: string;
  role: 'member' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  routine?: any;
  created_at?: string;
  updated_at?: string;
  // Joined from subscription
  subscription?: UserSubscription;
}

export interface UserSubscription {
  id: number;
  suscription_type_id: number;
  suscription_type_name?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
}

export interface UserWithMembership extends User {
  membership_end?: string;
  membership_status?: 'active' | 'expiring' | 'expired';
  attended_today?: boolean;
}

export interface CreateUserDto {
  name: string;
  last_name: string;
  number: string;
  suscription_type_id: number;
  payment_method: 'efectivo' | 'transferencia' | 'tarjeta';
}

export interface UpdateUserDto {
  name?: string;
  last_name?: string;
  number?: string;
  status?: 'active' | 'inactive' | 'suspended';
}
