self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body || '',
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        data: data.data || {}
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'New Notification', options)
      );
    } catch (e) {
      console.error('Error parsing push payload', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    const targetUrl = event.notification.data.url;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // If a window is already open to the URL, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        if (clientList.length > 0) {
          return clientList[0].focus();
        } else if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
