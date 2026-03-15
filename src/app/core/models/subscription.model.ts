// src/app/core/models/subscription.model.ts

export interface SubscriptionType {
  id: number;
  name: string;
  price: number;
  duration: number;       // días
  status: 'active' | 'inactive' | 'suspended';
  person_per_suscription: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubscriptionTypeDto {
  name: string;
  price: number;
  duration: number;
  person_per_suscription: number;
  description?: string;
}

export interface DashboardStats {
  total_revenue_month: number;
  total_subscriptions_month: number;
  total_products_sold_month: number;
  active_members: number;
  monthly_revenue: MonthlyRevenue[];
}

export interface MonthlyRevenue {
  month: string;        // 'Jan', 'Feb', ...
  subscriptions: number;
  products: number;
  total: number;
}
export interface TransactionUser {
  id: number;
  name: string;
  last_name: string;
  number: string;
  status: string;
  subscription_id: number;
  subscription_status: string;
  start_date: string;
  end_date: string;
}

export interface TransactionDetail {
  transaction_id: number;
  transaction_type: string;
  payment_method: string;
  total: number;
  created_at: string;
  subscription_type: SubscriptionType;
  start_date: string;
  end_date: string;
  users: TransactionUser[];
}
