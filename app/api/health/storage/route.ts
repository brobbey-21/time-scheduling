import { NextResponse } from 'next/server';
import { isPersistentStorageAvailable } from '@/lib/storage-config';
import { getRedisEnvStatus, isUpstashConfigured } from '@/lib/upstash';

export async function GET() {
  const auth = Boolean(process.env.AUTH_SECRET);

  return NextResponse.json({
    ok: isPersistentStorageAvailable() && auth,
    storage: isPersistentStorageAvailable() ? 'ready' : 'missing_upstash',
    authSecret: auth ? 'set' : 'missing',
    redisConfigured: isUpstashConfigured(),
    redisVars: getRedisEnvStatus(),
    hint:
      !auth || !isPersistentStorageAvailable()
        ? 'Redis is connected but env names may differ. Check redisVars above — STORAGE_URL/STORAGE_TOKEN are now supported. Redeploy after latest push.'
        : undefined,
  });
}
