// Shared test helper: mint a valid session so tests can talk to the guarded API.
//
// Inserts the user + session rows directly instead of going through
// /api/auth/register, so it works regardless of SMTP config or the
// CGE_ALLOW_REGISTRATION flag.

import { randomUUID } from 'node:crypto';
import { getDb } from '../src/database.js';

/**
 * @param {number} ttlSeconds session lifetime; pass a negative value for an
 *                            already-expired session.
 * @returns {{authorization: string}} headers to spread into app.inject()
 */
export function authHeaders(ttlSeconds = 3600) {
  const db = getDb();
  const userId = randomUUID();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, confirmed) VALUES (?, ?, ?, 1)'
  ).run(userId, `${userId}@test.local`, 'not-a-real-hash');

  const token = randomUUID();
  db.prepare('INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, Math.floor(Date.now() / 1000) + ttlSeconds);

  return { authorization: `Bearer ${token}` };
}
