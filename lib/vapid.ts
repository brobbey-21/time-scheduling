import webpush from 'web-push';

export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:isaac@umat.edu.gh';

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function isVapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendWebPush(
  subscription: PushSubscriptionJSON,
  payload: {
    title: string;
    body: string;
    url: string;
    tag?: string;
    requireInteraction?: boolean;
  }
): Promise<void> {
  if (!configureWebPush()) {
    throw new Error('VAPID keys are not configured');
  }

  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify(payload),
    {
      TTL: 60 * 60 * 24,
      urgency: 'high',
    }
  );
}

export { webpush };
