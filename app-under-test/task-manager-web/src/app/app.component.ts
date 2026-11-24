import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <span class="brand">Task Manager</span>
      @if (auth.session(); as session) {
        <div class="user-menu">
          <span data-testid="signed-in-user">Signed in as {{ session.user.name }}</span>
          <button type="button" class="link-button" data-testid="sign-out-button" (click)="auth.logout()">Sign out</button>
        </div>
      }
    </header>
    <router-outlet />
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
}
