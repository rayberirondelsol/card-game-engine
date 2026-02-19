import { randomUUID } from 'crypto';
import { timingSafeEqual } from 'crypto';

// In-memory session store (resets on server restart)
const sessions = new Set();

function safeCompare(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
      // Still compare to avoid timing differences
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function validateToken(token) {
  return token && sessions.has(token);
}

export async function authRoutes(fastify) {
  fastify.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required' });
    }

    const validEmail = process.env.LOGIN_EMAIL || '';
    const validPassword = process.env.LOGIN_PASSWORD || '';

    const emailOk = safeCompare(email, validEmail);
    const passwordOk = safeCompare(password, validPassword);

    if (!emailOk || !passwordOk) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = randomUUID();
    sessions.add(token);
    return { token };
  });

  fastify.get('/api/auth/check', async (req, reply) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!validateToken(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    return { ok: true };
  });

  fastify.post('/api/auth/logout', async (req, reply) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    sessions.delete(token);
    return { ok: true };
  });
}
