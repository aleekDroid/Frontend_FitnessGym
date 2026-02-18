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
