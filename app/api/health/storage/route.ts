import { NextResponse } from 'next/server';
import { isPersistentStorageAvailable } from '@/lib/storage-config';
import { isUpstashConfigured } from '@/lib/upstash';

export async function GET() {
  const auth = Boolean(process.env.AUTH_SECRET);
  const redisVars = {
    UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
    KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
  };

  return NextResponse.json({
    ok: isPersistentStorageAvailable() && auth,
    storage: isPersistentStorageAvailable() ? 'ready' : 'missing_upstash',
    authSecret: auth ? 'set' : 'missing',
    redisConfigured: isUpstashConfigured(),
    redisVars,
    hint:
      !auth || !isPersistentStorageAvailable()
        ? 'Connect Upstash Redis to the project, then redeploy. Vercel may use KV_REST_API_URL/KV_REST_API_TOKEN — both are supported now.'
        : undefined,
  });
}
