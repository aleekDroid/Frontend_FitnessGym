import { Component, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { UsersService } from '../../../core/services/users.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-manual-attendance-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manual-attendance-modal.component.html',
  styleUrls: ['./manual-attendance-modal.component.css']
})
export class ManualAttendanceModalComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() attendanceSuccess = new EventEmitter<any>();

  searchQuery = signal<string>('');
  searchResults = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  processingUserId = signal<number | null>(null);

  private readonly searchSubject = new Subject<string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          return of({ data: [] });
        }
        this.isLoading.set(true);
        // Traemos usuarios, máximo 10.
        return this.usersService.getUsers(1, 10, query, 'active', 'member', 'all').pipe(
          catchError(() => of({ data: [] }))
        );
      })
    ).subscribe(response => {
      this.isLoading.set(false);
      this.searchResults.set(response.data);
    });
  }

  onSearch(event: any): void {
    const query = event.target.value;
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  registerAttendance(user: any): void {
    if (user.activeSubscription?.status !== 'active') {
      return; // Disabled in UI, double check here
    }

    this.isProcessing.set(true);
    this.processingUserId.set(user.id);
    this.attendanceService.registerAttendanceAdmin(user.id).subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        this.processingUserId.set(null);
        this.attendanceSuccess.emit(res);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.processingUserId.set(null);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'Hubo un error al registrar la asistencia manual',
          background: '#1a1a1a',
          color: '#eee',
          confirmButtonColor: '#d32f2f'
        });
      }
    });
  }
}
