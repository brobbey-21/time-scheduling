function redisRestUrl(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.KV_URL
  );
}

function redisRestToken(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.KV_REST_API_READ_ONLY_TOKEN
  );
}

export function isUpstashConfigured(): boolean {
  return Boolean(redisRestUrl() && redisRestToken());
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
