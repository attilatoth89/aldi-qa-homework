import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Task } from './models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);

  list(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks');
  }

  create(title: string): Observable<Task> {
    return this.http.post<Task>('/api/tasks', { title });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/tasks/${encodeURIComponent(id)}`);
  }
}
