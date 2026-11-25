import { test, expect } from '../../src/fixtures/api-fixtures';
import { TasksApi } from '../../src/api/tasks-api';
import { env } from '../../src/config/env';
import { UNKNOWN_EMAIL, WRONG_PASSWORD, users } from '../../src/data/users';
import { expectError } from '../../src/utils/api-assertions';

// HTTP status codes
const OK_STATUS = 200;
const BAD_REQUEST_STATUS = 400;
const UNAUTHORIZED_STATUS = 401;

// Error codes and messages in the response body
const INVALID_CREDENTIALS_CODE = 'INVALID_CREDENTIALS';
const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

// Expected session
const EXPECTED_TOKEN_TYPE = 'Bearer';
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/-]{32,}=*$/; // bearer token syntax (RFC 6750), at least 32 characters

// Test data
const PADDED_UPPERCASE_EMAIL = `  ${users.demo.email.toUpperCase()} `;
const BLANK_EMAIL = '  ';
const ANY_PASSWORD = 'any-password';

// Invalid login payloads: one test is generated for each row
const INVALID_PAYLOADS = [
  { scenario: 'an empty body', payload: {}, invalidFields: ['email', 'password'] },
  { scenario: 'a missing password', payload: { email: users.demo.email }, invalidFields: ['password'] },
  { scenario: 'a blank email', payload: { email: BLANK_EMAIL, password: ANY_PASSWORD }, invalidFields: ['email'] },
  { scenario: 'non-string credentials', payload: { email: 123, password: true }, invalidFields: ['email', 'password'] },
];

// Messages shown in the report when a check fails
const ASSERTION_MESSAGES = {
  tokenNotExpired: 'the token expires in the future',
  sameResponseForUnknownEmail: 'an unknown email gets the same response as a wrong password',
};

/**
 * API-level checks of the login endpoint used by the Angular app.
 * They are fast and pin down the contract, so the UI tests only need to cover the user journey.
 */
test.describe('POST /auth/login', () => {
  test('returns 200 and a bearer token for valid credentials', { tag: '@smoke' }, async ({ authApi }) => {
    const response = await authApi.login({ email: users.demo.email, password: users.demo.password });
    expect(response.status()).toBe(OK_STATUS);
    const session = await response.json();
    expect(session).toEqual({
      token: expect.stringMatching(TOKEN_PATTERN),
      tokenType: EXPECTED_TOKEN_TYPE,
      expiresAt: expect.any(String),
      user: { id: expect.any(String), email: users.demo.email, name: users.demo.name },
    });
    expect(Date.parse(session.expiresAt), ASSERTION_MESSAGES.tokenNotExpired).toBeGreaterThan(Date.now());
  });

  test('accepts the email case-insensitively and ignores surrounding spaces', async ({ authApi }) => {
    const response = await authApi.login({ email: PADDED_UPPERCASE_EMAIL, password: users.demo.password });
    expect(response.status()).toBe(OK_STATUS);
    expect(await response.json()).toMatchObject({ user: { email: users.demo.email } }); // signed in to the right account
  });

  test('returns 401 for a wrong password', async ({ authApi }) => {
    const response = await authApi.login({ email: users.demo.email, password: WRONG_PASSWORD });
    const body = await expectError(response, UNAUTHORIZED_STATUS, INVALID_CREDENTIALS_CODE);
    expect(body.message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  test('returns the same 401 for an unknown email (no account enumeration)', async ({ authApi }) => {
    const wrongPassword = await expectError(
      await authApi.login({ email: users.demo.email, password: WRONG_PASSWORD }),
      UNAUTHORIZED_STATUS,
      INVALID_CREDENTIALS_CODE,
    );
    const unknownEmail = await expectError(
      await authApi.login({ email: UNKNOWN_EMAIL, password: WRONG_PASSWORD }),
      UNAUTHORIZED_STATUS,
      INVALID_CREDENTIALS_CODE,
    );
    expect(unknownEmail, ASSERTION_MESSAGES.sameResponseForUnknownEmail).toEqual(wrongPassword);
  });

  test('does not accept the password of another account', async ({ authApi }) => {
    const response = await authApi.login({ email: users.demo.email, password: users.other.password });
    await expectError(response, UNAUTHORIZED_STATUS, INVALID_CREDENTIALS_CODE);
  });

  for (const { scenario, payload, invalidFields } of INVALID_PAYLOADS) {
    test(`returns 400 for ${scenario}`, async ({ authApi }) => {
      const response = await authApi.login(payload);
      await expectError(response, BAD_REQUEST_STATUS, VALIDATION_ERROR_CODE, invalidFields);
    });
  }

  test('issues a token that grants access to the tasks API', async ({ authApi, playwright }) => {
    const session = await authApi.loginAs(users.demo);
    const context = await playwright.request.newContext({
      baseURL: env.apiUrl,
      extraHTTPHeaders: { Authorization: `${session.tokenType} ${session.token}` },
    });
    const response = await new TasksApi(context).list();
    expect(response.status()).toBe(OK_STATUS);
    expect(await response.json()).toEqual(expect.any(Array));
    await context.dispose();
  });
});
