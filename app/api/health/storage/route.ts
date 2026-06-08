import { NextResponse } from 'next/server';
import { isPersistentStorageAvailable } from '@/lib/storage-config';

export async function GET() {
  const redis = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
  const auth = Boolean(process.env.AUTH_SECRET);

  return NextResponse.json({
    ok: isPersistentStorageAvailable() && auth,
    storage: isPersistentStorageAvailable() ? 'ready' : 'missing_upstash',
    authSecret: auth ? 'set' : 'missing',
    redisConfigured: redis,
    hint:
      !auth || !isPersistentStorageAvailable()
        ? 'Add AUTH_SECRET and Upstash Redis on Vercel, then redeploy.'
        : undefined,
  });
}
