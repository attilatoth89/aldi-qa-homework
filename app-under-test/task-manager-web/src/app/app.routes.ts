import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { LoginComponent } from './login/login.component';
import { TasksComponent } from './tasks/tasks.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Sign in | Task Manager' },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard], title: 'My tasks | Task Manager' },
  { path: '**', redirectTo: 'tasks' },
];
