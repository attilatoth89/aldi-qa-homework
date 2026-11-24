import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task, TaskStatus } from '../core/models';
import { TaskService } from '../core/task.service';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

/**
 * Task list with "add" and "delete". Deleting asks for confirmation in a dialog;
 * the Selenium + JUnit suite (selenium-junit-tests/) covers this "Delete Task" feature.
 */
@Component({
  selector: 'app-tasks',
  imports: [ReactiveFormsModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancelDelete()' },
})
export class TasksComponent {
  private readonly taskService = inject(TaskService);

  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly statusMessage = signal('');
  readonly adding = signal(false);
  readonly pendingDelete = signal<Task | null>(null);
  readonly deleting = signal(false);

  readonly addForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
  });

  constructor() {
    this.taskService.list().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load your tasks. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  statusLabel(status: TaskStatus): string {
    return STATUS_LABELS[status];
  }

  addTask(): void {
    const title = this.addForm.controls.title.value.trim();
    if (!title || this.adding()) return;

    this.adding.set(true);
    this.taskService.create(title).subscribe({
      next: (task) => {
        this.tasks.update((tasks) => [...tasks, task]);
        this.addForm.reset();
        this.adding.set(false);
        this.statusMessage.set('Task added.');
      },
      error: () => {
        this.adding.set(false);
        this.statusMessage.set('Could not add the task. Please try again.');
      },
    });
  }

  askDelete(task: Task): void {
    this.statusMessage.set('');
    this.pendingDelete.set(task);
  }

  cancelDelete(): void {
    if (!this.deleting()) this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const task = this.pendingDelete();
    if (!task || this.deleting()) return;

    this.deleting.set(true);
    this.taskService.delete(task.id).subscribe({
      next: () => this.finishDelete(task, 'Task deleted.'),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.finishDelete(task, 'Task was already deleted.');
          return;
        }
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.statusMessage.set('Could not delete the task. Please try again.');
      },
    });
  }

  private finishDelete(task: Task, message: string): void {
    this.tasks.update((tasks) => tasks.filter((candidate) => candidate.id !== task.id));
    this.deleting.set(false);
    this.pendingDelete.set(null);
    this.statusMessage.set(message);
  }
}
