/* Service Worker — notifications système (Web Push) PSI */

self.addEventListener('install', (event) => {
  // Active le nouveau SW immédiatement
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Réception d'un push → affiche une notification système
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'PSI', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'PSI';
  const options = {
    body: data.body || '',
    icon: '/Logo PSI-new.jpeg',
    badge: '/Logo PSI-new.jpeg',
    tag: data.tag || undefined,      // regroupe les notifs du même sujet
    data: { url: data.url || '/admin/dashboard' },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notif → ouvre/focus l'app sur la bonne page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si une fenêtre de l'app est déjà ouverte → on la focus et on navigue
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url).catch(() => {});
          return;
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
