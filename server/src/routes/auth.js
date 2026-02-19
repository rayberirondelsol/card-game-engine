import { randomUUID } from 'crypto';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { getDb } from '../database.js';
import { isEmailConfigured, sendConfirmationEmail } from '../email.js';

const scryptAsync = promisify(scrypt);

// Session duration: 30 days
const SESSION_TTL = 30 * 24 * 60 * 60;

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const hashBuf = Buffer.from(hash, 'hex');
  const derived = await scryptAsync(password, salt, 64);
  return timingSafeEqual(hashBuf, Buffer.from(derived));
}

function createSession(userId) {
  const db = getDb();
  const token = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;
  db.prepare('INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

function getSessionUser(token) {
  if (!token) return null;
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(
    'SELECT u.id, u.email, u.confirmed FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).get(token, now);
  return row || null;
}

export async function authRoutes(fastify) {
  // ── Register ──────────────────────────────────────────────────────────────
  fastify.post('/api/auth/register', async (req, reply) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return reply.status(400).send({ error: 'E-Mail und Passwort erforderlich' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: 'Ungültige E-Mail-Adresse' });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Passwort muss mindestens 8 Zeichen haben' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return reply.status(409).send({ error: 'E-Mail-Adresse bereits registriert' });
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    const useEmail = isEmailConfigured();
    const confirmationToken = useEmail ? randomUUID() : null;
    const confirmationExpires = useEmail ? Math.floor(Date.now() / 1000) + 86400 : null;
    const confirmed = useEmail ? 0 : 1;

    db.prepare(
      'INSERT INTO users (id, email, password_hash, confirmed, confirmation_token, confirmation_expires) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, email.toLowerCase(), passwordHash, confirmed, confirmationToken, confirmationExpires);

    if (useEmail) {
      try {
        await sendConfirmationEmail(email, confirmationToken);
      } catch (err) {
        fastify.log.error('[Auth] Failed to send confirmation email:', err.message);
        // Don't block registration if email fails
      }
      return { status: 'confirm_email', message: 'Bitte bestätige deine E-Mail-Adresse.' };
    }

    // No email configured → auto-confirmed, log in immediately
    const token = createSession(id);
    return { status: 'ok', token };
  });

  // ── Confirm email ─────────────────────────────────────────────────────────
  fastify.get('/api/auth/confirm', async (req, reply) => {
    const { token } = req.query || {};
    if (!token) return reply.status(400).send({ error: 'Token fehlt' });

    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const user = db.prepare(
      'SELECT id FROM users WHERE confirmation_token = ? AND confirmation_expires > ? AND confirmed = 0'
    ).get(token, now);

    if (!user) {
      return reply.status(400).send({ error: 'Ungültiger oder abgelaufener Link' });
    }

    db.prepare('UPDATE users SET confirmed = 1, confirmation_token = NULL, confirmation_expires = NULL WHERE id = ?').run(user.id);

    const sessionToken = createSession(user.id);
    return { status: 'ok', token: sessionToken };
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  fastify.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return reply.status(400).send({ error: 'E-Mail und Passwort erforderlich' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      // Perform dummy hash to prevent timing attacks
      await hashPassword(password);
      return reply.status(401).send({ error: 'E-Mail oder Passwort falsch' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'E-Mail oder Passwort falsch' });
    }

    if (!user.confirmed) {
      return reply.status(403).send({ error: 'confirm_required', message: 'Bitte bestätige zuerst deine E-Mail-Adresse.' });
    }

    const token = createSession(user.id);
    return { status: 'ok', token, email: user.email };
  });

  // ── Check session ─────────────────────────────────────────────────────────
  fastify.get('/api/auth/check', async (req, reply) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    const user = getSessionUser(token);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    return { ok: true, email: user.email };
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  fastify.post('/api/auth/logout', async (req, reply) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (token) {
      getDb().prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    }
    return { ok: true };
  });
}
