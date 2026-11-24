import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

/**
 * Login page. Acceptance criteria covered by the Playwright suite (docs/task-2-frontend-testing.md):
 * valid credentials -> task list (or returnUrl); invalid credentials -> generic error, password cleared,
 * email kept; client-side validation without an API call; submit disabled while the request is running.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal<string | null>(null);

  emailError(): string | null {
    const control = this.form.controls.email;
    if (!this.showErrors(control)) return null;
    if (control.hasError('required')) return 'Email is required.';
    if (control.hasError('email')) return 'Enter a valid email address.';
    return null;
  }

  passwordError(): string | null {
    const control = this.form.controls.password;
    if (!this.showErrors(control)) return null;
    return control.hasError('required') ? 'Password is required.' : null;
  }

  submit(): void {
    if (this.submitting()) return;
    this.submitted.set(true);
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email.trim(), password).subscribe({
      next: () => void this.router.navigateByUrl(this.safeReturnUrl()),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.submitted.set(false);
        this.form.controls.password.reset();
        this.serverError.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Invalid email or password.'
            : 'Something went wrong. Please try again later.',
        );
      },
    });
  }

  private showErrors(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  /** Only paths inside the app are accepted, so returnUrl cannot be abused as an open redirect. */
  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/tasks';
  }
}
