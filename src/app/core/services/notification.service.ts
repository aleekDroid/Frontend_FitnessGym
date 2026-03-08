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
  private _counter = 0;
  readonly notifications = signal<AppNotification[]>([]);

  show(message: string, type: NotificationType = 'error', durationMs = 4000): void {
    const id = ++this._counter;
    this.notifications.update(list => [...list, { id, type, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }
}
