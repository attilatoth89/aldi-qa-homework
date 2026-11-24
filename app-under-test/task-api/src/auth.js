import { randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http.js';

/**
 * Seeded demo accounts. Demo only: a real system would store salted password hashes.
 * The second account exists so the tests can verify that users cannot see each other's tasks.
 */
const USERS = [
  { id: 'u-1001', email: 'demo@example.com', password: 'Demo123!', name: 'Demo User' },
  { id: 'u-1002', email: 'other@example.com', password: 'Other123!', name: 'Other User' },
];

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

export class AuthService {
  /** @param {{ tokenTtlSeconds?: number }} [options] */
  constructor({ tokenTtlSeconds = 3600 } = {}) {
    this.tokenTtlMs = tokenTtlSeconds * 1000;
    /** @type {Map<string, { userId: string, expiresAt: number }>} */
    this.sessions = new Map();
  }

  /** Validates the login payload and returns a new session, or throws 400 / 401. */
  login(body) {
    const details = [];
    if (typeof body.email !== 'string' || body.email.trim() === '') {
      details.push({ field: 'email', message: 'Email is required.' });
    }
    if (typeof body.password !== 'string' || body.password === '') {
      details.push({ field: 'password', message: 'Password is required.' });
    }
    if (details.length) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.', { details });
    }

    const email = body.email.trim().toLowerCase();
    const user = USERS.find((candidate) => candidate.email === email);
    // Same response for "unknown email" and "wrong password" so accounts cannot be enumerated.
    if (!user || !safeEqual(user.password, body.password)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = Date.now() + this.tokenTtlMs;
    this.sessions.set(token, { userId: user.id, expiresAt });

    return {
      token,
      tokenType: 'Bearer',
      expiresAt: new Date(expiresAt).toISOString(),
      user: publicUser(user),
    };
  }

  /** Returns the user behind the Bearer token of the request, or throws 401. */
  authenticate(req) {
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+([A-Za-z0-9._~+/-]+=*)$/i.exec(header.trim());
    const session = match ? this.sessions.get(match[1]) : undefined;

    if (!session || session.expiresAt <= Date.now()) {
      if (session) this.sessions.delete(match[1]);
      throw new HttpError(401, 'UNAUTHORIZED', 'Missing or invalid access token.', {
        headers: { 'WWW-Authenticate': 'Bearer' },
      });
    }

    const user = USERS.find((candidate) => candidate.id === session.userId);
    return publicUser(user);
  }
}
