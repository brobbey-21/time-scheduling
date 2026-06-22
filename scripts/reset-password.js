/**
 * Reset a bootstrap admin password (production Redis or local .data/users.json).
 *
 * Usage:
 *   node scripts/reset-password.js your@email.com NewPassword123
 *
 * Requires KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_*) in .env.local
 * for production, or uses .data/users.json locally.
 */

const fs = require('fs');
const path = require('path');
const { hash } = require('bcryptjs');

const PRIMARY_OWNER = 'mn-oiseibrobbey6423@gmail.com';
const REDIS_KEY = 'auth:users';
const DATA_FILE = path.join(__dirname, '..', '.data', 'users.json');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function redisUrl() {
  return (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_URL
  );
}

function redisToken() {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN
  );
}

function bootstrapEmails() {
  const fromEnv = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([PRIMARY_OWNER, ...fromEnv]));
}

async function readStore() {
  const url = redisUrl();
  const token = redisToken();
  if (url && token) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(['GET', REDIS_KEY]),
    });
    if (!res.ok) throw new Error(`Redis GET failed (${res.status})`);
    const data = await res.json();
    if (!data.result) return { users: [], updatedAt: 0 };
    return JSON.parse(data.result);
  }
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  throw new Error('No user store found. Add Redis vars to .env.local or run locally with .data/users.json');
}

async function writeStore(store) {
  const payload = { ...store, updatedAt: Date.now() };
  const url = redisUrl();
  const token = redisToken();
  if (url && token) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(['SET', REDIS_KEY, JSON.stringify(payload)]),
    });
    if (!res.ok) throw new Error(`Redis SET failed (${res.status})`);
    return;
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
}

async function main() {
  loadEnvLocal();

  const email = (process.argv[2] ?? '').trim().toLowerCase();
  const password = process.argv[3] ?? '';

  if (!email || password.length < 6) {
    console.error('Usage: node scripts/reset-password.js your@email.com NewPassword123');
    process.exit(1);
  }

  const allowed = bootstrapEmails();
  if (!allowed.includes(email)) {
    console.error(`Only bootstrap admin emails can be reset: ${allowed.join(', ')}`);
    process.exit(1);
  }

  const store = await readStore();
  const index = store.users.findIndex((u) => u.email === email);
  if (index === -1) {
    console.error(`No account found for ${email}. Use Create Account on the login page first.`);
    process.exit(1);
  }

  store.users[index].passwordHash = await hash(password, 10);
  await writeStore(store);

  console.log(`Password updated for ${email}. Sign in at /login with the new password.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
