import type { Locator, Page } from '@playwright/test';

/** Page object of /tasks (the landing page after a successful login). */
export class TasksPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly signedInUser: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'My tasks' });
    this.signedInUser = page.getByTestId('signed-in-user');
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/tasks');
  }
}
