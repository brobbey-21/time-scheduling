/* eslint-disable no-restricted-globals */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url =
    (event.notification.data && event.notification.data.url) || '/';
  const isExternal = /^https?:\/\//i.test(url);

  event.waitUntil(
    (async () => {
      if (isExternal && self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          await client.navigate(url);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })()
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_EXPIRED' });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = { title: 'Class reminder', body: '', url: '/' };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: payload.tag || 'push',
      requireInteraction: Boolean(payload.requireInteraction),
      vibrate: payload.requireInteraction ? [200, 100, 200, 100, 200] : [120, 60, 120],
      data: { url: payload.url || '/' },
    })
  );
});
