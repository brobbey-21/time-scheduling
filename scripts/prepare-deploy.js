const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredIcons = [
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/icons/apple-touch-icon.png',
  'app/icon.png',
];
const requiredFiles = [
  'vercel.json',
  'public/manifest.json',
  'public/sw.js',
  '.env.local',
];

let ok = true;

console.log('Deployment readiness check\n');

for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(root, file));
  console.log(`${exists ? '✓' : '✗'} ${file}`);
  if (!exists) ok = false;
}

for (const file of requiredIcons) {
  const exists = fs.existsSync(path.join(root, file));
  console.log(`${exists ? '✓' : '✗'} ${file}`);
  if (!exists) ok = false;
}

const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const envVars = [
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'CRON_SECRET',
];

console.log('\nEnvironment variables:');
for (const key of envVars) {
  const set = new RegExp(`^${key}=.+`, 'm').test(env);
  console.log(`${set ? '✓' : '✗'} ${key}`);
  if (!set) ok = false;
}

const hasUpstash = /UPSTASH_REDIS_REST_URL=\S+/.test(env);
console.log(`${hasUpstash ? '✓' : '○'} UPSTASH_REDIS_REST_URL (add on Vercel for production push)`);

console.log('\nVercel checklist:');
console.log('  1. Push repo to GitHub');
console.log('  2. Import project on vercel.com');
console.log('  3. Paste .env.local vars into Environment Variables');
console.log('  4. Add Upstash Redis (Storage → Upstash, free tier)');
console.log('  5. Deploy (Vercel Hobby: no built-in minute cron — see push note below)');
console.log('  6. Optional background push: cron-job.org → GET /api/cron/reminders every minute');
console.log('     Header: Authorization: Bearer <CRON_SECRET>');
console.log('  7. On iPhone: Safari → Share → Add to Home Screen');

if (!ok) {
  console.log('\n✗ Not ready — fix items above');
  process.exit(1);
}

console.log('\n✓ Ready to deploy');
process.exit(0);
