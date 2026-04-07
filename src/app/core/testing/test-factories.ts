import { AuthUser, LoginResponse } from '../services/auth.service';

export const getMockAuthUser = (overrides?: Partial<AuthUser>): AuthUser => {
  return {
    id: 1,
    name: 'Admin',
    last_name: 'Gym',
    number: '1234567890',
    role: 'admin',
    ...overrides,
  };
};

export const getMockLoginResponse = (overrides?: Partial<LoginResponse>): LoginResponse => {
  return {
    accessToken: 'dummy_token_for_jest',
    user: getMockAuthUser(),
    ...overrides,
  };
};

export const getMockMember = (overrides?: any): any => {
  return {
    id: 1,
    name: 'Member',
    last_name: 'Test',
    number: '0987654321',
    status: 'active',
    ...overrides,
  };
};

export const getMockAttendanceResponse = (overrides?: any): any => {
  return {
    attendance_id: 1,
    status: 'authorized',
    deny_reason: null,
    created_at: new Date().toISOString(),
    user: {
      user_id: 1,
      user_name: 'Test',
      user_last_name: 'User',
      user_phone: '1234567890'
    },
    suscripcion: {
      suscripcion_id: 1,
      suscripcion_type_name: 'Mensual',
      status: 'active',
      end_date: new Date().toISOString()
    },
    ...overrides,
  };
};

export const getMockAttendanceHistoryItem = (overrides?: any): any => {
  return {
    id: 1,
    user_id: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  };
};
