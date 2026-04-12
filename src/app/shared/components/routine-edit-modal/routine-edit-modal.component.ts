import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RoutineDay,
  Exercise,
} from '../../../core/models/member-dashboard.model';

// Orden canónico de los días — el backend exige exactamente estos nombres en este orden
const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_ABBR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Component({
  selector: 'app-routine-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './routine-edit-modal.component.html',
  styleUrls: ['./routine-edit-modal.component.scss'],
})
export class RoutineEditModalComponent implements OnChanges {
  // ─── Inputs ───
  @Input() visible = false;
  @Input() streak = 0;
  @Input() jokers = 0;
  @Input() initialRoutine: RoutineDay[] = [];
  @Input() loading = false;        // true mientras el padre hace el GET
  @Input() isSetupPending = false; // true = primera configuración, no hay racha que proteger

  // ─── Outputs ───
  @Output() saved = new EventEmitter<RoutineDay[]>();
  @Output() closed = new EventEmitter<void>();

  // ─── Estado interno ───
  activeDay = signal(0);
  saving = signal(false);
  showConfirm = signal(false); // diálogo de confirmación de reset de racha

  // Copia mutable de la rutina que se edita — se reinicia cada vez que el modal se abre
  editableDays = signal<RoutineDay[]>([]);

  // ─── Computed ───

  /** Si algún isRestDay cambió respecto al original */
  restDayChanged = computed(() => {
    const original = this.initialRoutine;
    const edited = this.editableDays();
    if (!original.length || !edited.length) return false;
    return edited.some((d, i) => d.isRestDay !== (original[i]?.isRestDay ?? false));
  });

  /**
   * Determina si se debe mostrar la advertencia de reset de racha.
   * Reglas:
   *  1. Si isSetupPending=true → NO avisar (es la primera configuración).
   *  2. Si streak=0           → NO avisar (reiniciar 0→0 no afecta nada).
   *  3. Solo aplica cuando realmente cambiaron días de descanso.
   */
  shouldWarnStreakReset = computed(() =>
    this.restDayChanged() && !this.isSetupPending && this.streak > 0
  );

  /**
   * Determina el modo de riesgo de la racha.
   * 'NONE'  = Sin riesgo.
   * 'JOKER' = Se usará un comodín.
   * 'RESET' = Se reiniciará a 0.
   */
  streakRiskMode = computed(() => {
    if (!this.shouldWarnStreakReset()) return 'NONE';
    return this.jokers > 0 ? 'JOKER' : 'RESET';
  });

  /** Nombre abreviado de cada pestaña */
  dayAbbrs = DAY_ABBR;

  /** Día activo completo */
  currentDay = computed(() => this.editableDays()[this.activeDay()] ?? null);

  // ─── Ciclo de vida ───

  ngOnChanges(): void {
    // Cada vez que se abre el modal (visible pasa a true) o llegan nuevos datos,
    // reinicializar la copia editable.
    if (this.visible) {
      if (this.initialRoutine && this.initialRoutine.length > 0) {
        this.editableDays.set(
          this.initialRoutine.map((d) => ({
            ...d,
            exercises: (d.exercises ?? []).map((e) => ({ ...e })),
          }))
        );
      } else {
        // Si no hay rutina previa (usuario nuevo), inicializar una vacía de 6 días
        this.editableDays.set(this.initializeDefaultDays());
      }
      this.activeDay.set(0);
      this.showConfirm.set(false);
      this.saving.set(false);
    }
  }

  private initializeDefaultDays(): RoutineDay[] {
    return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => ({
      day,
      description: '',
      isRestDay: false,
      exercises: [],
    }));
  }

  // ─── Acciones de día ───

  selectDay(index: number): void {
    this.activeDay.set(index);
  }

  toggleRestDay(index: number): void {
    this.editableDays.update((days) =>
      days.map((d, i) =>
        i === index
          ? { ...d, isRestDay: !d.isRestDay, exercises: d.isRestDay ? d.exercises : [] }
          : d
      )
    );
  }

  updateDescription(index: number, value: string): void {
    this.editableDays.update((days) =>
      days.map((d, i) => (i === index ? { ...d, description: value } : d))
    );
  }

  // ─── Acciones de ejercicios ───

  addExercise(dayIndex: number): void {
    const day = this.editableDays()[dayIndex];
    if (!day || (day.exercises ?? []).length >= 10) return;
    
    const blank: Exercise = { name: '', sets: 3, reps: 10, machine: '', note: '' };
    this.editableDays.update((days) =>
      days.map((d, i) =>
        i === dayIndex ? { ...d, exercises: [...(d.exercises ?? []), blank] } : d
      )
    );
  }

  removeExercise(dayIndex: number, exIndex: number): void {
    this.editableDays.update((days) =>
      days.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: (d.exercises ?? []).filter((_, ei) => ei !== exIndex) }
          : d
      )
    );
  }

  updateExercise(
    dayIndex: number,
    exIndex: number,
    field: keyof Exercise,
    value: string | number
  ): void {
    this.editableDays.update((days) =>
      days.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              exercises: (d.exercises ?? []).map((e, ei) =>
                ei === exIndex ? { ...e, [field]: value } : e
              ),
            }
          : d
      )
    );
  }

  // ─── Validación ───

  /** Verifica que no haya ejercicios sin nombre */
  isValid(): boolean {
    return this.editableDays().every((day) =>
      day.isRestDay || (day.exercises ?? []).every((ex) => ex.name.trim().length > 0)
    );
  }

  /** Construye el payload final con exactamente 6 días en el orden canónico */
  buildPayload(): RoutineDay[] {
    const days = this.editableDays();
    return DAY_ORDER.map((dayName, i) => ({
      day: dayName,
      description: days[i]?.description ?? '',
      isRestDay: days[i]?.isRestDay ?? false,
      exercises: days[i]?.isRestDay ? [] : (days[i]?.exercises ?? []),
    }));
  }

  // ─── Flujo de guardado ───

  /**
   * Punto de entrada del botón "Guardar".
   * Si hubo cambio de isRestDay → mostrar confirmación.
   * Si no → guardar directo.
   */
  onSaveClick(): void {
    if (!this.isValid()) return;
    if (this.shouldWarnStreakReset()) {
      this.showConfirm.set(true);
    } else {
      this.confirmSave();
    }
  }

  /** Confirma desde el diálogo — se llama cuando el usuario acepta perder la racha */
  confirmSave(): void {
    this.showConfirm.set(false);
    this.saving.set(true);
    this.saved.emit(this.buildPayload());
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
  }

  onClose(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  // ─── Helpers de template ───

  trackByIndex(index: number): number {
    return index;
  }

  stepExerciseValue(dayIndex: number, exIndex: number, field: 'sets' | 'reps', step: number): void {
    const day = this.editableDays()[dayIndex];
    if (!day?.exercises) return;
    const ex = day.exercises[exIndex];
    if (!ex) return;

    let newVal = (Number(ex[field]) || 0) + step;
    
    // Bounds
    if (field === 'sets') {
      if (newVal < 1) newVal = 1;
      if (newVal > 20) newVal = 20;
    } else {
      if (newVal < 1) newVal = 1;
      if (newVal > 100) newVal = 100;
    }

    this.updateExercise(dayIndex, exIndex, field, newVal);
  }
}
