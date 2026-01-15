// Custom Service Worker for StateLink Push Notifications
// This file extends the auto-generated PWA service worker

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data')
    return
  }

  try {
    const payload = event.data.json()
    
    const options = {
      body: payload.body || 'Time for a vibe check!',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: payload.url || '/check-in',
        dateOfArrival: Date.now(),
      },
      actions: [
        {
          action: 'check-in',
          title: 'Check In Now',
        },
        {
          action: 'dismiss',
          title: 'Later',
        },
      ],
      requireInteraction: true, // Keep notification visible until user interacts
      tag: 'vibe-check', // Replace previous vibe check notifications
      renotify: true, // Vibrate even if replacing existing notification
    }

    event.waitUntil(
      self.registration.showNotification(payload.title || 'Vibe Check!', options)
    )
  } catch (error) {
    console.error('Error parsing push payload:', error)
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/check-in'
  
  if (event.action === 'dismiss') {
    // User clicked "Later", just close the notification
    return
  }

  // Open the check-in page or focus if already open
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

self.addEventListener('notificationclose', function(event) {
  // Track notification dismissal if needed
  console.log('Notification closed without action')
})
