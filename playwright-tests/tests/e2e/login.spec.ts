import { test, expect } from '../../src/fixtures/ui-fixtures';
import { UNKNOWN_EMAIL, WRONG_PASSWORD, users } from '../../src/data/users';

// URLs and routes
const LOGIN_API_ROUTE = '**/api/auth/login';
const LOGIN_API_PATH = '/api/auth/login';
const TASKS_PATH = '/tasks';
const LOGIN_URL_PATTERN = /\/login$/;
const TASKS_URL_PATTERN = /\/tasks$/;
const RETURN_URL_PARAM = 'returnUrl';
const EXTERNAL_RETURN_URL = `/login?${RETURN_URL_PARAM}=//evil.example.com/phishing`;

// Texts expected in the UI
const TASKS_PAGE_TITLE = 'My tasks | Task Manager';
const SIGNED_IN_TEXT = `Signed in as ${users.demo.name}`;
const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const SERVICE_ERROR_MESSAGE = 'Something went wrong. Please try again later.';
const SIGNING_IN_LABEL = 'Signing in…';
const EMAIL_REQUIRED_ERROR = 'Email is required.';
const INVALID_EMAIL_ERROR = 'Enter a valid email address.';
const PASSWORD_REQUIRED_ERROR = 'Password is required.';

// Expected attributes of the password field
const PASSWORD_INPUT_TYPE = 'password';
const PASSWORD_AUTOCOMPLETE = 'current-password';

// Test data
const MALFORMED_EMAIL = 'not-an-email';
const ANY_PASSWORD = 'any-password';
const EXPECTED_TOKEN_TYPE = 'Bearer';

// HTTP responses
const UNAUTHORIZED_STATUS = 401;
const SERVICE_UNAVAILABLE_STATUS = 503;
const SERVICE_UNAVAILABLE_BODY = { error: 'SERVICE_UNAVAILABLE', message: 'Maintenance' };

// Messages shown in the report when a check fails
const ASSERTION_MESSAGES = {
  sessionStored: 'the session is stored in localStorage',
  noSessionAfterFailedLogin: 'no session after a failed login',
  noSessionAfterServiceError: 'no session when the service fails',
  sessionRemovedOnSignOut: 'the session is removed on sign out',
  noRequestForInvalidForm: 'no login request for an invalid form',
};

// Client-side validation cases: one test is generated for each row
const INVALID_INPUTS = [
  {
    scenario: 'both fields empty',
    email: '',
    password: '',
    emailError: EMAIL_REQUIRED_ERROR,
    passwordError: PASSWORD_REQUIRED_ERROR,
  },
  {
    scenario: 'malformed email address',
    email: MALFORMED_EMAIL,
    password: ANY_PASSWORD,
    emailError: INVALID_EMAIL_ERROR,
    passwordError: null,
  },
  {
    scenario: 'missing password',
    email: users.demo.email,
    password: '',
    emailError: null,
    passwordError: PASSWORD_REQUIRED_ERROR,
  },
];

test.describe('Login', () => {
  test.describe('on the login page', () => {
    test.beforeEach(async ({ loginPage }) => {
      await loginPage.goto();
    });

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

    test('shows the same error for an unknown email (no account enumeration)', async ({ loginPage }) => {
      await loginPage.login(UNKNOWN_EMAIL, WRONG_PASSWORD);
      await expect(loginPage.errorAlert).toHaveText(GENERIC_LOGIN_ERROR);
    });

    test('lets the user sign in after a failed attempt', async ({ page, loginPage, tasksPage }) => {
      await loginPage.login(users.demo.email, WRONG_PASSWORD);
      await expect(loginPage.errorAlert).toBeVisible();
      await loginPage.passwordInput.fill(users.demo.password);
      await loginPage.submitButton.click();
      await expect(page).toHaveURL(TASKS_URL_PATTERN);
      await expect(tasksPage.heading).toBeVisible();
    });

    for (const input of INVALID_INPUTS) {
      test(`validates on the client without calling the API: ${input.scenario}`, async ({ page, loginPage, loginRequestCount }) => {
        await loginPage.login(input.email, input.password);
        if (input.emailError) {
          await expect(loginPage.emailError).toHaveText(input.emailError);
          await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
        } else {
          await expect(loginPage.emailError).toBeHidden();
        }
        if (input.passwordError) {
          await expect(loginPage.passwordError).toHaveText(input.passwordError);
          await expect(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'true');
        } else {
          await expect(loginPage.passwordError).toBeHidden();
        }
        await expect(page).toHaveURL(LOGIN_URL_PATTERN);
        expect(loginRequestCount(), ASSERTION_MESSAGES.noRequestForInvalidForm).toBe(0);
      });
    }

    test('submits the form with the Enter key', async ({ page, loginPage }) => {
      await loginPage.fillCredentials(users.demo.email, users.demo.password);
      await loginPage.passwordInput.press('Enter');
      await expect(page).toHaveURL(TASKS_URL_PATTERN);
    });

    test('masks the password input', async ({ loginPage }) => {
      await expect(loginPage.passwordInput).toHaveAttribute('type', PASSWORD_INPUT_TYPE);
      await expect(loginPage.passwordInput).toHaveAttribute('autocomplete', PASSWORD_AUTOCOMPLETE);
    });

    test('disables the submit button while signing in (no double submit)', async ({ page, loginPage, loginRequestCount }) => {
      let releaseResponse!: () => void;
      const responseReleased = new Promise<void>((resolve) => (releaseResponse = resolve));
      await page.route(LOGIN_API_ROUTE, async (route) => {
        await responseReleased;
        await route.continue();
      });
      await loginPage.login(users.demo.email, users.demo.password);
      await expect(loginPage.submitButton).toBeDisabled();
      await expect(loginPage.submitButton).toHaveText(SIGNING_IN_LABEL);
      await loginPage.passwordInput.press('Enter'); // a second submit attempt must be ignored
      releaseResponse();
      await expect(page).toHaveURL(TASKS_URL_PATTERN);
      expect(loginRequestCount()).toBe(1);
    });

    test('shows a friendly message when the login service is unavailable', async ({ page, loginPage }) => {
      await page.route(LOGIN_API_ROUTE, (route) =>
        route.fulfill({
          status: SERVICE_UNAVAILABLE_STATUS,
          contentType: 'application/json',
          body: JSON.stringify(SERVICE_UNAVAILABLE_BODY),
        }),
      );
      await loginPage.login(users.demo.email, users.demo.password);
      await expect(loginPage.errorAlert).toHaveText(SERVICE_ERROR_MESSAGE);
      await expect(page).toHaveURL(LOGIN_URL_PATTERN);
      await expect.poll(() => loginPage.storedSession(), { message: ASSERTION_MESSAGES.noSessionAfterServiceError }).toBeNull();
    });
  });


  test.describe('session handling', () => {
    test('sends a signed-out user to the login page and back to the requested page', async ({ page, loginPage, tasksPage }) => {
      await tasksPage.goto();
      await expect(loginPage.heading).toBeVisible();
      await expect(page).toHaveURL((url) => url.searchParams.get(RETURN_URL_PARAM) === TASKS_PATH);
      await loginPage.login(users.demo.email, users.demo.password);
      await expect(page).toHaveURL(TASKS_URL_PATTERN);
      await expect(tasksPage.heading).toBeVisible();
    });

    test('keeps the session after a reload and ends it on sign out', async ({ page, loginPage, tasksPage }) => {
      await loginPage.goto();
      await loginPage.login(users.demo.email, users.demo.password);
      await expect(tasksPage.heading).toBeVisible();
      await page.reload();
      await expect(tasksPage.heading).toBeVisible();
      await tasksPage.signOutButton.click();
      await expect(loginPage.heading).toBeVisible();
      await expect.poll(() => loginPage.storedSession(), { message: ASSERTION_MESSAGES.sessionRemovedOnSignOut }).toBeNull();
      await tasksPage.goto();
      await expect(loginPage.heading).toBeVisible(); // the task list is protected again
    });

    test('ignores a returnUrl that points to another site (no open redirect)', async ({ page, loginPage, baseURL }) => {
      await page.goto(EXTERNAL_RETURN_URL);
      await expect(loginPage.heading).toBeVisible();
      await loginPage.login(users.demo.email, users.demo.password);
      await expect(page).toHaveURL(`${new URL(baseURL!).origin}${TASKS_PATH}`);
    });
  });
});
