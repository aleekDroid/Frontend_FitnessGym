import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserWithMembership } from '../../../core/models/user.model';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-confirm-status-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-status-modal.component.html',
  styleUrls: ['./confirm-status-modal.component.scss'] /* Using global styles from parent generally, isolated here if needed */
})
export class ConfirmStatusModalComponent {
  @Input() user: UserWithMembership | null = null;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() confirmEvent = new EventEmitter<UserWithMembership>();

  constructor(private usersService: UsersService) {}

  closeModal(): void {
    this.closeEvent.emit();
  }

  doToggleStatus(): void {
    if (!this.user) return;
    
    const newStatus = this.user.status === 'active' ? 'inactive' : 'active';
    
    this.usersService.toggleUserStatus(this.user.id, newStatus).subscribe({
      next: () => {
        // Emit success back to parent to locally patch state or refresh
        this.confirmEvent.emit({ ...this.user!, status: newStatus });
      },
      error: (err) => {
        console.error('Error toggling status:', err);
        alert('Hubo un error al cambiar el estado del usuario.');
        this.closeModal();
      }
    });
  }
}
