// src/app/core/services/notification.service.ts
import { Injectable, signal } from '@angular/core';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly activeNotification = signal<AppNotification | null>(null);
  private timeoutId: any = null;

  get currentNotification() {
    return this.activeNotification.asReadonly();
  }

  show(message: string, type: NotificationType = 'success', durationMs = 4000): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.activeNotification.set({ id: Date.now(), type, message });

    if (durationMs > 0) {
      this.timeoutId = setTimeout(() => this.dismiss(), durationMs);
    }
  }

  dismiss(): void {
    this.activeNotification.set(null);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /** @deprecated Use currentNotification and dismiss() */
  readonly notifications = signal<AppNotification[]>([]);
}
