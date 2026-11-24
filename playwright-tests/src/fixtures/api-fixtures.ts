import { test as base, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';
import { AuthApi, type Session } from '../api/auth-api';
import { TasksApi } from '../api/tasks-api';
import { env } from '../config/env';
import { buildTask, type Task } from '../data/task-factory';
import { users } from '../data/users';

type WorkerFixtures = {
  /** Logged in once per worker: fast, and workers stay isolated from each other. */
  demoSession: Session;
  otherUserSession: Session;
};

type TestFixtures = {
  authApi: AuthApi;
  /** Tasks API as the demo user. Tasks created through it are deleted after the test. */
  tasksApi: TasksApi;
  /** Tasks API as a second user, for authorization (ownership) checks. */
  otherUserTasksApi: TasksApi;
  /** Tasks API without an Authorization header. */
  anonymousTasksApi: TasksApi;
  /** Tasks API with a syntactically valid but unknown token. */
  invalidTokenTasksApi: TasksApi;
  /** A task created (and later cleaned up) for tests that need existing data. */
  createdTask: Task;
};

function newApiContext(playwright: PlaywrightWorkerArgs['playwright'], token?: string): Promise<APIRequestContext> {
  return playwright.request.newContext({
    baseURL: env.apiUrl,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function provideTasksApi(
  playwright: PlaywrightWorkerArgs['playwright'],
  token: string | undefined,
  use: (api: TasksApi) => Promise<void>,
): Promise<void> {
  const context = await newApiContext(playwright, token);
  const api = new TasksApi(context);
  await use(api);
  await api.cleanup();
  await context.dispose();
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  demoSession: [
    async ({ playwright }, use) => {
      const context = await newApiContext(playwright);
      await use(await new AuthApi(context).loginAs(users.demo));
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  otherUserSession: [
    async ({ playwright }, use) => {
      const context = await newApiContext(playwright);
      await use(await new AuthApi(context).loginAs(users.other));
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  authApi: async ({ playwright }, use) => {
    const context = await newApiContext(playwright);
    await use(new AuthApi(context));
    await context.dispose();
  },

  tasksApi: async ({ playwright, demoSession }, use) => {
    await provideTasksApi(playwright, demoSession.token, use);
  },

  otherUserTasksApi: async ({ playwright, otherUserSession }, use) => {
    await provideTasksApi(playwright, otherUserSession.token, use);
  },

  anonymousTasksApi: async ({ playwright }, use) => {
    await provideTasksApi(playwright, undefined, use);
  },

  invalidTokenTasksApi: async ({ playwright }, use) => {
    await provideTasksApi(playwright, 'f'.repeat(48), use);
  },

  createdTask: async ({ tasksApi }, use) => {
    const response = await tasksApi.create(buildTask());
    expect(response.status(), 'test data setup: create task').toBe(201);
    await use((await response.json()) as Task);
    // tasksApi.cleanup() removes it after the test
  },
});

export { expect };
