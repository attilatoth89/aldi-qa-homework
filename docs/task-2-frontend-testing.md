# Task 2 – Frontend testing: Playwright E2E tests for the Angular "Login" feature

- [1. What is delivered](#1-what-is-delivered)
- [2. Acceptance criteria (test basis)](#2-acceptance-criteria-test-basis)
- [3. Setup steps](#3-setup-steps)
- [4. Framework structure and design](#4-framework-structure-and-design)
- [5. The test script](#5-the-test-script)
- [6. Running and debugging](#6-running-and-debugging)

## 1. What is delivered

| Part | Location |
| --- | --- |
| The Angular web application under test (Angular 21, standalone components, signals, reactive forms, route guards) | [`app-under-test/task-manager-web`](../app-under-test/task-manager-web) |
| Playwright + TypeScript test project | [`playwright-tests`](../playwright-tests) |
| Login E2E specification: 14 tests, 2 of them tagged `@smoke` | [`playwright-tests/tests/e2e/login.spec.ts`](../playwright-tests/tests/e2e/login.spec.ts) |
| Page objects and fixtures | [`playwright-tests/src/pages`](../playwright-tests/src/pages), [`playwright-tests/src/fixtures/ui-fixtures.ts`](../playwright-tests/src/fixtures/ui-fixtures.ts) |

No application was supplied with the assignment, so the repository contains a small Angular app
with a real login flow backed by the REST API of Task 3. The tests are therefore executable:
`playwright.config.ts` starts the API and the Angular dev server automatically. To run the same
suite against another environment, set `BASE_URL` (and `API_URL`).

## 2. Acceptance criteria (test basis)

| ID | Acceptance criterion | Covered by |
| --- | --- | --- |
| AC-1 | Valid credentials sign the user in and open the task list. The header shows the user's name. | `signs in with valid credentials…` (@smoke), `submits the form with the Enter key` |
| AC-2 | An invalid password shows **"Invalid email or password."**. The user stays on the login page, the email is kept, the password is cleared and no session is stored. | `rejects an invalid password…` (@smoke), `lets the user sign in after a failed attempt` |
| AC-3 | An unknown email gets the same generic message, so it is impossible to tell which accounts exist. | `shows the same error for an unknown email…` |
| AC-4 | Required fields and the email format are validated in the browser, and no request is sent while the form is invalid. | 3 data-driven `validates on the client…` tests |
| AC-5 | While the request runs, the submit button is disabled and reads "Signing in…" (no double submit). | `disables the submit button while signing in…` |
| AC-6 | A server or network error shows "Something went wrong. Please try again later." | `shows a friendly message when the login service is unavailable` |
| AC-7 | Protected pages redirect to the login page and return to the requested page after sign-in. The session survives a reload and is removed on sign out. | `sends a signed-out user to the login page…`, `keeps the session after a reload…` |
| AC-8 | Security: the password field is masked, and `returnUrl` only accepts paths inside the app (no open redirect). | `masks the password input`, `ignores a returnUrl that points to another site…` |

The REST contract of `POST /auth/login` (200 / 400 / 401) is covered more cheaply on the API
level in [`auth.api.spec.ts`](../playwright-tests/tests/api/auth.api.spec.ts). The UI suite
focuses on what only the browser can show: the user journey, messages, redirects and state.

## 3. Setup steps

### 3.1 Running this repository

Prerequisites: **Node.js 22 LTS** (or 20.19+) with npm, and Git.

```bash
git clone <repository-url> && cd aldi-qa-homework

# 1. Install the Angular app (the system under test) exactly as locked in package-lock.json
cd app-under-test/task-manager-web
npm ci
cd ../..

# 2. Install the test project and the browsers
cd playwright-tests
npm ci
npx playwright install --with-deps   # --with-deps also installs the Linux OS libraries

# 3. Run the login tests (Chromium). The API and the Angular app are started automatically.
npm run test:e2e
```

The root `package.json` wraps these steps: `npm run setup` followed by `npm test`.
The installs run inside each folder on purpose: on Windows, a known npm bug
([npm/cli#6960](https://github.com/npm/cli/issues/6960)) can make `npm install --prefix` add the
current folder to `package.json` as a `file:` dependency.

### 3.2 Setting up Playwright in an Angular project from scratch

These are the steps that produced this framework, so they can be repeated in a real project.

1. **Initialise Playwright** in the Angular workspace (or in a separate test repository):

   ```bash
   npm init playwright@latest
   # TypeScript, tests folder "e2e", add a GitHub Actions workflow, install the browsers
   ```

   Alternatively, `ng add playwright-ng-schematics` (the Playwright option that `ng e2e` offers)
   wires the suite into the Angular CLI, so the team can keep running `ng e2e`.
2. **Configure `playwright.config.ts`:**
   - `use.baseURL`, so tests navigate with relative paths (`page.goto('/login')`);
   - `webServer` runs `ng serve` (and the backend) before the tests and waits for the URL.
     `reuseExistingServer: !process.env.CI` reuses a server that is already running locally;
   - `projects` for Chromium, Firefox and WebKit (plus a browserless `api` project);
   - `retries: 2`, `trace: 'on-first-retry'`, screenshots and video only on failure, the HTML
     reporter locally and the JUnit + GitHub reporters on CI.
3. **Agree on test hooks with the developers.** Prefer accessible roles and labels, and add
   `data-testid` only where an element has no stable accessible name. `use.testIdAttribute`
   makes the attribute name configurable.
4. **Create the structure:** page objects, fixtures, test data and an environment config.
   Keep the credentials in environment variables or CI secrets, never in the code of a real
   project (see `.env.example`).
5. **Add npm scripts** (`test:e2e`, `test:smoke`, `report`, `typecheck`) and the CI job
   (see [bonus-ci.md](bonus-ci.md)).

#### Angular-specific notes

- No `waitForAngular()` as in Protractor: Playwright waits until elements are actionable, and
  its web-first assertions (`await expect(locator).toHaveText()`) retry until they pass. The same
  tests work with zone.js and with zoneless, signal-based change detection; this app is zoneless
  with `OnPush` components.
- Assert what the user perceives: messages, `aria-invalid`, URL, title. The Angular CSS classes
  (`ng-invalid`, `ng-touched`) are implementation details.
- The Angular dev server needs some seconds for the first build. `webServer.timeout` is 180 s,
  and the analytics prompt is disabled (`"analytics": false`, `NG_CLI_ANALYTICS=false`), so the
  server never waits for input on CI.
- The app calls the API under `/api` on its own origin, and `proxy.conf.json` forwards it to the
  backend during `ng serve`. Tests therefore see the same URLs locally, in Docker and in CI.

## 4. Framework structure and design

```text
playwright-tests/
├── playwright.config.ts      projects (api, chromium, firefox, webkit), webServer, reporters, retries, trace
├── src/
│   ├── config/env.ts         BASE_URL / API_URL with local defaults
│   ├── data/users.ts         test accounts (overridable via environment variables)
│   ├── pages/                page objects: LoginPage, TasksPage
│   └── fixtures/ui-fixtures.ts   injects page objects + a login-request counter into tests
└── tests/e2e/login.spec.ts   the Login specification
```

| Decision | Reason |
| --- | --- |
| **Page Object Model + fixtures** | Locators live in one place; tests read as user journeys. Fixtures create the page objects, so the tests contain no setup code. |
| **Locators: role/label first, `data-testid` second** | `getByRole` and `getByLabel` follow what the user sees and catch accessibility regressions. The submit button uses a test id because its text changes to "Signing in…". |
| **Web-first assertions, no fixed waits** | No `waitForTimeout`. Every `expect` retries until its condition holds, which removes the main source of flakiness. |
| **Deterministic network control** | `page.route` simulates a 503 and holds back a response to observe the loading state. `page.waitForResponse` checks that the backend answered 401. |
| **Isolation** | Every test runs in a fresh browser context (clean localStorage and cookies) and does not depend on any other test, so tests can run in parallel and in any order. |
| **Security in scope** | Generic error message (no account enumeration), no session after a failure, masked password, open-redirect protection. |
| **Data-driven tests** | One test body for the three invalid-input cases; adding a case means adding one row. |
| **Tags** | `@smoke` runs on every pull request in seconds; everything else is regression. |

## 5. The test script

The full file is [`tests/e2e/login.spec.ts`](../playwright-tests/tests/e2e/login.spec.ts).
Expected texts, URLs and query parameters, test data, status codes and assertion messages are
constants at the top of the file, so a change in the app means a one-line change in the tests.
The two core scenarios of the assignment are:

```ts
test('signs in with valid credentials and opens the task list', { tag: '@smoke' }, async ({ page, loginPage, tasksPage }) => {
  await loginPage.login(users.demo.email, users.demo.password);
  await expect(page).toHaveURL(TASKS_URL_PATTERN);
  await expect(tasksPage.heading).toBeVisible();
  await expect(tasksPage.signedInUser).toHaveText(SIGNED_IN_TEXT);
  await expect(page).toHaveTitle(TASKS_PAGE_TITLE);
  await expect
    .poll(() => loginPage.storedSession(), { message: ASSERTION_MESSAGES.sessionStored })
    .toMatchObject({ tokenType: EXPECTED_TOKEN_TYPE, user: { email: users.demo.email } });
});

test('rejects an invalid password: generic error, no session, user stays on the page', { tag: '@smoke' }, async ({ page, loginPage }) => {
  const loginResponse = page.waitForResponse((response) => response.url().endsWith(LOGIN_API_PATH));
  await loginPage.login(users.demo.email, WRONG_PASSWORD);
  expect((await loginResponse).status()).toBe(UNAUTHORIZED_STATUS);
  await expect(loginPage.errorAlert).toHaveText(GENERIC_LOGIN_ERROR);
  await expect(page).toHaveURL(LOGIN_URL_PATTERN);
  await expect(loginPage.emailInput).toHaveValue(users.demo.email); // the user does not have to retype it
  await expect(loginPage.passwordInput).toBeEmpty(); // the wrong password is cleared
  await expect(loginPage.submitButton).toBeEnabled();
  await expect.poll(() => loginPage.storedSession(), { message: ASSERTION_MESSAGES.noSessionAfterFailedLogin }).toBeNull();
});
```

**Assertion styles used, and why:**

| Style | Used for | Example |
| --- | --- | --- |
| Web-first assertion | Anything on the page: elements, texts, values, URL, title. Playwright retries it until it passes or times out. | `await expect(loginPage.errorAlert).toHaveText(GENERIC_LOGIN_ERROR)` |
| `toHaveURL` with a predicate | A URL detail that a pattern cannot express well (a query parameter) | `await expect(page).toHaveURL((url) => url.searchParams.get(RETURN_URL_PARAM) === TASKS_PATH)` |
| `expect.poll` with a message | Browser state without a locator (localStorage), retried like a web-first assertion. The message names the check in the report if it fails. | `await expect.poll(() => loginPage.storedSession(), { message: ASSERTION_MESSAGES.sessionRemovedOnSignOut }).toBeNull()` |
| Plain `expect` | Final values that can no longer change: a response that has arrived, a request counter | `expect((await loginResponse).status()).toBe(UNAUTHORIZED_STATUS)` |

The page object behind them ([`login-page.ts`](../playwright-tests/src/pages/login-page.ts)):

```ts
export class LoginPage {
  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Sign in' });
    this.emailInput = page.getByLabel('Email', { exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByTestId('login-submit'); // label changes to "Signing in…" while submitting
    this.errorAlert = page.getByRole('alert');
    // ...
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submitButton.click();
  }
}
```

## 6. Running and debugging

| Command (in `playwright-tests/`) | What it does |
| --- | --- |
| `npm run test:e2e` | Login tests in Chromium |
| `npm run test:cross-browser` | All projects: API + Chromium, Firefox, WebKit |
| `npm run test:smoke` | Only the `@smoke` tests (API + Chromium) |
| `npx playwright test --project=chromium --headed` | Watch the browser |
| `npm run test:ui` | Playwright UI mode: time-travel through every step |
| `npx playwright test --debug -g "invalid password"` | Step through one test with the inspector |
| `npm run report` | Open the HTML report (`reports/html`) |
| `npx playwright show-trace test-results/<test>/trace.zip` | Trace of a failed or retried test: DOM snapshots, network, console |
| `BASE_URL=https://staging.example.com API_URL=https://staging.example.com/api npm run test:e2e` | Same suite against another environment, without starting the local servers |
