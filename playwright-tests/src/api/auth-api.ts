import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { TestUser } from '../data/users';

/** Response body of POST /auth/login. */
export interface Session {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: { id: string; email: string; name: string };
}

export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  login(credentials: { email?: unknown; password?: unknown }): Promise<APIResponse> {
    return this.request.post('auth/login', { data: credentials });
  }

  /** Logs in and returns the session; fails the test with a clear message if the login does not work. */
  async loginAs(user: TestUser): Promise<Session> {
    const response = await this.login({ email: user.email, password: user.password });
    await expect(response, `login as ${user.email} should succeed`).toBeOK();
    return (await response.json()) as Session;
  }
}
