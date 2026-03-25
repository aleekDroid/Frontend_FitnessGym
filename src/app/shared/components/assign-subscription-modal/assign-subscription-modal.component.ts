import { Component, OnInit, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UsersService } from '../../../core/services/users.service';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { UserWithMembership } from '../../../core/models/user.model';
import { SubscriptionType } from '../../../core/models/subscription.model';

@Component({
  selector: 'app-assign-subscription-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './assign-subscription-modal.component.html',
  styleUrls: ['./assign-subscription-modal.component.scss']
})
export class AssignSubscriptionModalComponent implements OnInit {
  @Input() prefilledUser: UserWithMembership | null = null;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() successEvent = new EventEmitter<void>();

  assignForm: FormGroup;
  subscriptionTypes = signal<SubscriptionType[]>([]);
  saving = signal(false);

  // Autocomplete
  assignSearchQuery = signal('');
  assignSearchResults = signal<UserWithMembership[]>([]);
  selectedAssignUsers = signal<UserWithMembership[]>([]);
  assignPlanLimit = signal<number>(1);
  assignSearching = signal(false);
  private assignSearchSubject = new Subject<string>();

  // ALERTS (Users with active subscriptions)
  usersWithActiveSub = computed(() => {
    return this.selectedAssignUsers()
      .filter(u => {
        if (!u.membership_end) return false;
        const diff = new Date(u.membership_end).getTime() - new Date().getTime();
        return diff > 0 && (u.membership_status === 'active' || u.membership_status === 'expiring');
      })
      .map(u => {
        const diffIntime = new Date(u.membership_end!).getTime() - new Date().getTime();
        const days = Math.ceil(diffIntime / (1000 * 3600 * 24));
        return { name: `${u.name} ${u.last_name}`, days };
      });
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService
  ) {
    this.assignForm = this.fb.group({
      subscription_id: ['', [Validators.required]],
      payment_method: ['efectivo', [Validators.required]]
    });
    
    // Listen to changes in prefilledUser to initialize selected list
    effect(() => {
      const user = this.prefilledUser;
      if (user) {
        // Find existing membership data if not completely passed (often it is via user-details)
        this.selectedAssignUsers.set([user]);
      } else {
        this.selectedAssignUsers.set([]);
      }
    }, { allowSignalWrites: true });
  }

  get af() { return this.assignForm.controls; }

  ngOnInit(): void {
    // Load plans
    this.subscriptionsService.getAll(1, 10, '','active').subscribe(res => {
      this.subscriptionTypes.set(res.data.filter(t => t.status === 'active'));
    });

    // Setup debounced search for Autocomplete in Assignment Modal
    this.assignSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.assignSearchQuery.set(query);
      if (!query.trim()) {
        this.assignSearchResults.set([]);
        this.assignSearching.set(false);
        return;
      }
      this.assignSearching.set(true);
      // We search users globally, limit to 10 based on req
      this.usersService.getUsers(1, 10, query, 'active', 'member', 'true').subscribe({
        next: (res) => {
          // Exclude already selected users
          const currentSelectedIds = this.selectedAssignUsers().map(u => u.id);
          const filteredResults = res.data.filter(u => !currentSelectedIds.includes(u.id));
          this.assignSearchResults.set(filteredResults);
          this.assignSearching.set(false);
        },
        error: () => {
          this.assignSearchResults.set([]);
          this.assignSearching.set(false);
        }
      });
    });
  }

  closeModal(): void {
    this.closeEvent.emit();
  }

  onAssignPlanChange(event: Event): void {
    const idStr = (event.target as HTMLSelectElement).value;
    if (!idStr) {
      this.assignPlanLimit.set(1);
      return;
    }
    
    // Fetch details to know limit
    this.subscriptionsService.getSubscriptionTypeById(Number(idStr)).subscribe({
      next: (plan) => {
        this.assignPlanLimit.set(plan.person_per_suscription || 1);
        
        // Trim users if plan allows less people than currently selected
        if (this.selectedAssignUsers().length > this.assignPlanLimit()) {
          this.selectedAssignUsers.update(list => list.slice(0, this.assignPlanLimit()));
        }
      },
      error: (err) => console.error('Failed to load plan details', err)
    });
  }

  onAssignSearchInput(val: string): void {
    this.assignSearchSubject.next(val);
  }

  selectUserForAssign(user: UserWithMembership): void {
    if (this.selectedAssignUsers().length >= this.assignPlanLimit()) {
      return; // Reached limit
    }
    this.selectedAssignUsers.update(list => [...list, user]);
    
    // Clear search correctly
    this.assignSearchQuery.set('');
    this.assignSearchResults.set([]);
    
    const inputEl = document.getElementById('assignUserSearchComponent') as HTMLInputElement;
    if (inputEl) inputEl.value = '';
  }

  removeAssignUser(user: UserWithMembership): void {
    this.selectedAssignUsers.update(list => list.filter(u => u.id !== user.id));
  }

  submitAssign(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }
    
    const selectedUsers = this.selectedAssignUsers();
    if (selectedUsers.length === 0) {
      alert('Debes seleccionar al menos un usuario.');
      return;
    }

    this.saving.set(true);
    const val = this.assignForm.value;
    const userIds = selectedUsers.map(u => u.id);

    let mappedPayment = 'cash';
    if (val.payment_method === 'tarjeta') mappedPayment = 'card';
    if (val.payment_method === 'transferencia') mappedPayment = 'transfer';

    this.subscriptionsService.assignSubscription(val.subscription_id, userIds, mappedPayment).subscribe({
      next: () => {
        this.saving.set(false);
        this.successEvent.emit(); // Emits signal to reload parent data and show toast
      },
      error: (err) => {
        console.error('Error assigning subscription:', err);
        alert('Ocurrió un error al procesar la venta. Inténtalo de nuevo.');
        this.saving.set(false);
      }
    });
  }
}
