// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet />

    <!-- Global toast notifications -->
    <div class="toast-container">
      @for (n of notifySvc.notifications(); track n.id) {
        <div class="toast toast--{{ n.type }}" (click)="notifySvc.dismiss(n.id)">
          <span class="toast__icon">
            @if (n.type === 'warning') { ⚠️ }
            @else if (n.type === 'success') { ✅ }
            @else { ❌ }
          </span>
          <span class="toast__msg">{{ n.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1.2rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      pointer-events: all;
      animation: slideIn 0.25s ease;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      max-width: 360px;
    }
    .toast--error   { background: rgba(239,68,68,0.9);  color: #fff; }
    .toast--warning { background: rgba(245,158,11,0.9); color: #fff; }
    .toast--success { background: rgba(34,197,94,0.9);  color: #fff; }
    .toast--info    { background: rgba(59,130,246,0.9); color: #fff; }
    .toast__icon { font-size: 1.1rem; }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AppComponent {
  constructor(readonly notifySvc: NotificationService) {}
}

