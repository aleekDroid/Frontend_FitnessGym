// src/app/pages/admin/admin-layout.component.ts
import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
})
export class AdminLayoutComponent {
  userMenuOpen = signal(false);
  mobileMenuOpen = signal(false);

  constructor(public authService: AuthService, private router: Router) {}

  toggleUserMenu(): void { this.userMenuOpen.update(v => !v); }
  toggleMobileMenu(): void { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu(): void { this.mobileMenuOpen.set(false); }

  logout(): void {
    this.authService.logout();
  }

  get user() { return this.authService.currentUser(); }
}
