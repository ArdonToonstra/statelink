// Custom Service Worker for StateLink Push Notifications
// This file extends the auto-generated PWA service worker

// ============================================
// Service Worker Lifecycle - Skip waiting for immediate activation
// ============================================
self.addEventListener('install', function (event) {
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  // Claim all clients immediately so the new SW takes control
  event.waitUntil(clients.claim())
})

// ============================================
// Offline Auth Caching - Cache session responses for offline PWA support
// ============================================
const AUTH_CACHE_NAME = 'auth-session-v1'
const AUTH_SESSION_URL = '/api/auth/get-session'

self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url)

  // Only intercept session requests to our origin
  if (url.origin === self.location.origin && url.pathname === AUTH_SESSION_URL) {
    event.respondWith(handleSessionRequest(event.request))
    return
  }
})

async function handleSessionRequest(request) {
  const cache = await caches.open(AUTH_CACHE_NAME)

  try {
    // Try network first
    const response = await fetch(request)

    // Only cache successful session responses
    if (response.ok) {
      // Clone the response since it can only be read once
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    // Network failed, try to return cached session
    console.log('[SW] Network failed for session, trying cache')
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      console.log('[SW] Returning cached session for offline support')
      return cachedResponse
    }

    // No cached session, return a proper error response
    return new Response(JSON.stringify({ session: null, user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// ============================================
// Push Notifications
// ============================================
self.addEventListener('push', function (event) {
  console.log('[SW] Push event received')

  if (!event.data) {
    console.log('[SW] Push event but no data')
    return
  }

  try {
    const payload = event.data.json()
    console.log('[SW] Push payload:', JSON.stringify(payload))

    // iOS-compatible notification options (minimal set)
    // iOS doesn't support: actions, vibrate, badge image, requireInteraction, renotify
    const options = {
      body: payload.body || 'Time for a vibe check!',
      icon: payload.icon || '/icons/icon-192x192.png',
      data: {
        url: payload.url || '/check-in',
        dateOfArrival: Date.now(),
      },
      tag: 'statelink-notification', // Prevent duplicate notifications
    }

    console.log('[SW] Showing notification with options:', JSON.stringify(options))

    event.waitUntil(
      self.registration.showNotification(payload.title || 'Vibe Check!', options)
        .then(() => console.log('[SW] Notification shown successfully'))
        .catch(err => console.error('[SW] Failed to show notification:', err))
    )
  } catch (error) {
    console.error('[SW] Error parsing push payload:', error)
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/check-in'

  if (event.action === 'dismiss') {
    // User clicked "Later", just close the notification
    return
  }

  // Open the check-in page or focus if already open
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
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

self.addEventListener('notificationclose', function (event) {
  // Track notification dismissal if needed
  console.log('Notification closed without action')
})
