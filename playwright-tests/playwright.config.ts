import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

const isCI = !!process.env.CI;

/** Projects passed with --project on the command line (empty = all projects). */
function selectedProjects(argv: string[]): string[] {
  return argv.flatMap((arg, index) => {
    if (arg.startsWith('--project=')) return [arg.slice('--project='.length)];
    if (arg === '--project' && argv[index + 1]) return [argv[index + 1]];
    return [];
  });
}

// `npm run test:api` only needs the REST API, so the Angular dev server is not started for it.
const projects = selectedProjects(process.argv);
const apiOnlyRun = projects.length > 0 && projects.every((project) => project === 'api');

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: isCI
    ? [
        ['list'],
        ['github'],
        ['html', { outputFolder: 'reports/html', open: 'never' }],
        ['junit', { outputFile: 'reports/junit.xml' }],
      ]
    : [['list'], ['html', { outputFolder: 'reports/html', open: 'never' }]],

  use: {
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: env.apiUrl },
    },
    {
      name: 'chromium',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'], baseURL: env.baseUrl },
    },
    {
      name: 'firefox',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Firefox'], baseURL: env.baseUrl },
    },
    {
      name: 'webkit',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Safari'], baseURL: env.baseUrl },
    },
  ],

  // Starts the bundled system under test, unless BASE_URL / API_URL point to an existing environment.
  webServer: [
    ...(env.startLocalApi
      ? [
          {
            name: 'Task API',
            command: 'npm start',
            cwd: '../app-under-test/task-api',
            url: 'http://localhost:3000/api/health',
            reuseExistingServer: !isCI,
            timeout: 30_000,
          },
        ]
      : []),
    ...(env.startLocalWeb && !apiOnlyRun
      ? [
          {
            name: 'Angular app',
            command: 'npm start',
            cwd: '../app-under-test/task-manager-web',
            url: 'http://localhost:4200',
            reuseExistingServer: !isCI,
            timeout: 180_000,
            env: { NG_CLI_ANALYTICS: 'false' },
          },
        ]
      : []),
  ],
});
