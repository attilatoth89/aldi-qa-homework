import { expect, type Locator, type Page } from '@playwright/test';

/** localStorage key where the Angular app keeps the session (token + user). */
export const SESSION_STORAGE_KEY = 'tm.session';

/**
 * Page object of /login.
 * Locator strategy: user-facing roles and labels first (they also guard accessibility),
 * data-testid only where the text changes (submit button) or there is no accessible name.
 */
export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Sign in' });
    this.emailInput = page.getByLabel('Email', { exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByTestId('login-submit'); // label changes to "Signing in…" while submitting
    this.errorAlert = page.getByRole('alert');
    this.emailError = page.getByTestId('email-error');
    this.passwordError = page.getByTestId('password-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.heading).toBeVisible();
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submitButton.click();
  }

  /** The stored session, or null when the user is not signed in. */
  async storedSession(): Promise<unknown> {
    const raw = await this.page.evaluate((key) => window.localStorage.getItem(key), SESSION_STORAGE_KEY);
    return raw === null ? null : JSON.parse(raw);
  }
}
