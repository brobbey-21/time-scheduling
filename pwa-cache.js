'use strict';

const defaultCache = require('next-pwa/cache');

const fasterCache = defaultCache.map((entry) => {
  if (entry.options?.cacheName === 'others') {
    return {
      ...entry,
      options: {
        ...entry.options,
        networkTimeoutSeconds: 2,
      },
    };
  }
  if (entry.options?.cacheName === 'cross-origin') {
    return {
      ...entry,
      options: {
        ...entry.options,
        networkTimeoutSeconds: 2,
      },
    };
  }
  return entry;
});

module.exports = [
  {
    urlPattern: /\/_next\/static\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'next-static-immutable',
      expiration: {
        maxEntries: 256,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: ({ request, url }) =>
      request.mode === 'navigate' && url.origin === self.origin,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'pages-navigate',
      networkTimeoutSeconds: 2,
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: ({ url }) =>
      url.origin === self.origin &&
      (url.pathname === '/manifest.json' ||
        url.pathname.startsWith('/icons/')),
    handler: 'CacheFirst',
    options: {
      cacheName: 'pwa-shell',
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
    },
  },
  ...fasterCache,
];
