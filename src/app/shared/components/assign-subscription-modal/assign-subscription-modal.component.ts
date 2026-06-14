import { Component, OnInit, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UsersService } from '../../../core/services/users.service';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
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
  selectedPlan = signal<SubscriptionType | null>(null);

  // Autocomplete
  assignSearchQuery = signal('');
  assignSearchResults = signal<UserWithMembership[]>([]);
  selectedAssignUsers = signal<UserWithMembership[]>([]);
  assignPlanLimit = signal<number>(1);
  assignSearching = signal(false);
  private readonly assignSearchSubject = new Subject<string>();

  // ALERTS (Users with active subscriptions)
  usersWithActiveSub = computed(() => {
    return this.selectedAssignUsers()
      .filter(u => {
        if (!u.membership_end) return false;
        const diff = new Date(u.membership_end).getTime() - Date.now();
        return diff > 0 && (u.membership_status === 'active' || u.membership_status === 'expiring');
      })
      .map(u => {
        const diffIntime = new Date(u.membership_end!).getTime() - Date.now();
        const days = Math.ceil(diffIntime / (1000 * 3600 * 24));
        return { name: `${u.name} ${u.last_name}`, days };
      });
  });

  // Dynamic quote breakdown mapping price and one-time enrollment fee for completely new members.
  // Exemption rule: a user is exempt from the enrollment fee if they have any prior real membership
  // (i.e. any subscription with slug != 'visita'). This is computed by the backend and surfaced
  // as `has_subscription_history`, making it the single authoritative source of truth for both
  // the users-list flow and the modal's own search-results flow.
  quoteBreakdown = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return null;

    const basePrice = plan.price || 0;
    const isVisita = plan.slug === 'visita' || plan.name?.toLowerCase().includes('visita');
    const enrollmentFee = isVisita ? 0 : (plan.enrollment_fee || 0);

    // A user pays the enrollment fee only when they have zero prior real membership history.
    // `has_subscription_history` = true means the backend found at least one subscription
    // linked to a suscriptions_type whose slug is NOT 'visita'.
    const newUsers = this.selectedAssignUsers().filter(u => !u.has_subscription_history);

    const totalEnrollmentFee = newUsers.length * enrollmentFee;
    const subtotal = basePrice;
    const total = subtotal + totalEnrollmentFee;

    return {
      basePrice,
      enrollmentFee,
      newUsers,
      totalEnrollmentFee,
      subtotal,
      total
    };
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationService: NotificationService,
    public readonly authService: AuthService
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

    // Reactively update plan details based on control selection changes
    this.assignForm.get('subscription_id')?.valueChanges.subscribe(id => {
      if (id) {
        this.subscriptionsService.getSubscriptionTypeById(Number(id)).subscribe({
          next: (plan) => {
            this.selectedPlan.set(plan);
            this.assignPlanLimit.set(plan.person_per_suscription || 1);
            
            // Trim users if plan allows less people than currently selected
            if (this.selectedAssignUsers().length > this.assignPlanLimit()) {
              this.selectedAssignUsers.update(list => list.slice(0, this.assignPlanLimit()));
            }
          },
          error: (err) => console.error('Failed to load plan details', err)
        });
      } else {
        this.selectedPlan.set(null);
        this.assignPlanLimit.set(1);
      }
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
      this.usersService.getUsers(1, 10, query, 'active', 'member', 'all').subscribe({
        next: (res) => {
          // Exclude already selected users and the current user
          const currentSelectedIds = new Set(this.selectedAssignUsers().map(u => u.id));
          const currentUserId = this.authService.currentUser()?.id;
          const filteredResults = res.data.filter(u =>
            !currentSelectedIds.has(u.id) && u.id !== currentUserId
          );
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
    // Handled reactively via valueChanges subscription
  }

  onAssignSearchInput(val: string): void {
    this.assignSearchSubject.next(val);
  }

  selectUserForAssign(user: UserWithMembership): void {
    const me = this.authService.currentUser();
    if (me && me.id === user.id) {
      return; // Cannot assign subscription to yourself
    }
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
      this.notificationService.show('Debes seleccionar al menos un usuario.', 'error');
      return;
    }

    this.saving.set(true);
    const val = this.assignForm.value;
    const userIds = selectedUsers.map(u => u.id);

    let mappedPayment = 'cash';
    if (val.payment_method === 'tarjeta') mappedPayment = 'card';
    if (val.payment_method === 'transferencia') mappedPayment = 'transfer';

    this.subscriptionsService.assignSubscription(val.subscription_id, userIds, mappedPayment).subscribe({
      next: (res) => {
        this.saving.set(false);
        
        if (res.visitaGratis) {
          this.notificationService.show('¡Visita Gratuita! Esta visita es por cuenta de la casa.', 'success');
        } else {
          this.notificationService.show('Suscripción asignada exitosamente.', 'success');
        }
        this.successEvent.emit();
      },
      error: (err) => {
        console.error('Error assigning subscription:', err);
        this.notificationService.show(err.error?.message || 'Ocurrió un error al procesar la venta.', 'error');
        this.saving.set(false);
      }
    });
  }
}
