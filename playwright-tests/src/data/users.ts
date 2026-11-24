export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Test accounts. The defaults match the seeded demo users of the bundled API;
 * real environments inject their own credentials through environment variables / CI secrets.
 */
export const users = {
  demo: {
    email: process.env.TEST_USER_EMAIL ?? 'demo@example.com',
    password: process.env.TEST_USER_PASSWORD ?? 'Demo123!',
    name: process.env.TEST_USER_NAME ?? 'Demo User',
  },
  /** Second account, used to check that users cannot access each other's data. */
  other: {
    email: process.env.TEST_OTHER_USER_EMAIL ?? 'other@example.com',
    password: process.env.TEST_OTHER_USER_PASSWORD ?? 'Other123!',
    name: process.env.TEST_OTHER_USER_NAME ?? 'Other User',
  },
} satisfies Record<string, TestUser>;

export const WRONG_PASSWORD = 'Wrong-Password-123';
export const UNKNOWN_EMAIL = 'nobody@example.com';
