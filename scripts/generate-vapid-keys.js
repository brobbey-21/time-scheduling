const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const webpush = require('web-push');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');
const examplePath = path.join(root, '.env.example');

const keys = webpush.generateVAPIDKeys();
const cronSecret = crypto.randomBytes(24).toString('hex');

const envContent = `# VAPID keys for Web Push — regenerate: node scripts/generate-vapid-keys.js
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
VAPID_SUBJECT=mailto:isaac@umat.edu.gh

# Vercel cron auth (auto-sent as Bearer token when set)
CRON_SECRET=${cronSecret}

# Production push storage — add after creating Upstash Redis on Vercel
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
`;

const exampleContent = envContent
  .replace(keys.publicKey, 'your-public-key-here')
  .replace(keys.privateKey, 'your-private-key-here')
  .replace(cronSecret, 'your-random-secret');

fs.writeFileSync(envPath, envContent);
fs.writeFileSync(examplePath, exampleContent);

console.log('✓ Wrote .env.local (VAPID + CRON_SECRET)');
console.log('✓ Wrote .env.example');
console.log('\nPublic key (also in .env.local):');
console.log(keys.publicKey);
console.log('\n→ Copy ALL vars from .env.local to Vercel → Settings → Environment Variables');
