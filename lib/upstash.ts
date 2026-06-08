function redisRestUrl(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_URL ||
    process.env.STORAGE_REST_API_URL
  );
}

function redisRestToken(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN
  );
}

export function isUpstashConfigured(): boolean {
  return Boolean(redisRestUrl() && redisRestToken());
}

export function getRedisEnvStatus(): Record<string, boolean> {
  return {
    UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
    KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
    STORAGE_URL: Boolean(process.env.STORAGE_URL),
    STORAGE_TOKEN: Boolean(process.env.STORAGE_TOKEN),
  };
}

export async function upstashCommand(command: string[]): Promise<unknown | null> {
  const url = redisRestUrl();
  const token = redisRestToken();
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(command),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
