import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { TasksPage } from '../pages/tasks-page';

type PageFixtures = {
  loginPage: LoginPage;
  tasksPage: TasksPage;
  /** Number of POST /api/auth/login requests sent by the page during the test. */
  loginRequestCount: () => number;
};

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  tasksPage: async ({ page }, use) => {
    await use(new TasksPage(page));
  },

  loginRequestCount: async ({ page }, use) => {
    let count = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/auth/login')) count += 1;
    });
    await use(() => count);
  },
});

export { expect };
