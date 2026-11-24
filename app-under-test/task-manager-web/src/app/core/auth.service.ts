import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Session } from './models';

/** localStorage key of the session; the Selenium tests use it to sign in without the UI. */
export const SESSION_STORAGE_KEY = 'tm.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionState = signal<Session | null>(readStoredSession());

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  login(email: string, password: string): Observable<Session> {
    return this.http.post<Session>('/api/auth/login', { email, password }).pipe(
      tap((session) => {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        this.sessionState.set(session);
      }),
    );
  }

  /** Clears the session and opens the login page (optionally remembering where the user was). */
  logout(returnUrl?: string): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.sessionState.set(null);
    void this.router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : {});
  }

  token(): string | null {
    return this.sessionState()?.token ?? null;
  }
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (Date.parse(session.expiresAt) > Date.now()) return session;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}
