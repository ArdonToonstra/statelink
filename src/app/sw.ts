import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

// ============================================
// Auth Cache Configuration
// ============================================
const AUTH_CACHE_NAME = 'auth-session-v1';
const AUTH_SESSION_URL = '/api/auth/get-session';

// ============================================
// Custom fetch handler for auth session caching
// ============================================
async function handleSessionRequest(request: Request): Promise<Response> {
    const cache = await caches.open(AUTH_CACHE_NAME);

    try {
        // Try network first
        const response = await fetch(request);

        // Only cache successful session responses
        if (response.ok) {
            // Clone the response since it can only be read once
            cache.put(request, response.clone());
        }

        return response;
    } catch {
        // Network failed, try to return cached session
        console.log('[SW] Network failed for session, trying cache');
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            console.log('[SW] Returning cached session for offline support');
            return cachedResponse;
        }

        // No cached session, return a proper error response
        return new Response(JSON.stringify({ session: null, user: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ============================================
// Serwist instance
// ============================================
// Note: We handle skipWaiting and clientsClaim manually in the event handlers
// below instead of via Serwist config. This is because iOS Safari requires
// these to be called during the install/activate events (not in constructor)
// for proper service worker lifecycle management.
const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: false, // Handled manually in install event for iOS Safari compatibility
    clientsClaim: false, // Handled manually in activate event for iOS Safari compatibility
    navigationPreload: true,
    runtimeCaching: defaultCache,
    fallbacks: {
        entries: [
            {
                url: "/~offline",
                matcher({ request }) {
                    return request.destination === "document";
                },
            },
        ],
    },
});

// Register Serwist's event listeners first (for precaching, etc.)
serwist.addEventListeners();

// ============================================
// Explicit install event handler (after Serwist)
// ============================================
// iOS Safari requires explicit lifecycle management
// This handler is registered AFTER Serwist's handler, but both will run
// during the install event. The skipWaiting() call activates the service
// worker immediately after installation completes.
self.addEventListener('install', function (event: ExtendableEvent) {
    console.log('[SW] Install event fired - calling skipWaiting for iOS Safari');
    // Skip waiting to activate immediately (critical for iOS Safari)
    // This will activate the SW after Serwist's precaching completes
    event.waitUntil(
        self.skipWaiting().then(() => {
            console.log('[SW] Skip waiting completed during install');
        })
    );
});

// ============================================
// Explicit activate event handler (after Serwist)
// ============================================
// iOS Safari requires explicit client claiming
// This ensures the service worker takes control immediately on activation
self.addEventListener('activate', function (event: ExtendableEvent) {
    console.log('[SW] Activate event fired - claiming clients for iOS Safari');
    // Take control of all clients immediately (critical for iOS Safari)
    event.waitUntil(
        self.clients.claim().then(() => {
            console.log('[SW] Clients claimed during activate');
        })
    );
});

// ============================================
// Message handler for forcing skip waiting
// ============================================
// This message handler allows forcing service worker activation from the page.
// Scenarios:
// 1. When a user refreshes while a new worker is waiting
// 2. Manual activation triggered by the ServiceWorkerRegister component
// 3. iOS Safari edge cases where explicit activation is required
self.addEventListener('message', function (event: ExtendableMessageEvent) {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] SKIP_WAITING message received, activating immediately');
        self.skipWaiting();
    }
});

// ============================================
// Custom fetch event listener for auth session
// ============================================
self.addEventListener('fetch', function (event: FetchEvent) {
    const url = new URL(event.request.url);

    // Only intercept session requests to our origin
    if (url.origin === self.location.origin && url.pathname === AUTH_SESSION_URL) {
        event.respondWith(handleSessionRequest(event.request));
        return;
    }
});

// ============================================
// Push Notifications
// ============================================
self.addEventListener('push', function (event: PushEvent) {
    console.log('[SW] Push event received');

    if (!event.data) {
        console.log('[SW] Push event but no data');
        return;
    }

    try {
        const payload = event.data.json();
        console.log('[SW] Push payload:', JSON.stringify(payload));

        // iOS-compatible notification options (minimal set)
        // iOS doesn't support: actions, vibrate, requireInteraction, renotify
        // Use unique tag with timestamp to allow multiple notifications in iOS notification center
        const timestamp = Date.now();
        const options: NotificationOptions = {
            body: payload.body || 'Time for a vibe check!',
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge || '/icons/icon-192x192.png', // iOS notification center badge
            data: {
                url: payload.url || '/check-in',
                dateOfArrival: timestamp,
            },
            tag: `vibe-check-${timestamp}`, // Unique tag to allow multiple notifications
            silent: false, // Ensure notification is always shown (required for iOS)
        };

        console.log('[SW] Showing notification with options:', JSON.stringify(options));

        // Best practice (per push.foo): combine client messaging + showNotification
        // in a single Promise.all inside one event.waitUntil to keep SW alive.
        const messageClientsPromise = self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    client.postMessage({ type: 'PUSH_RECEIVED', payload });
                }
            });

        const showNotificationPromise = self.registration
            .showNotification(payload.title || 'Vibe Check!', options)
            .then(() => console.log('[SW] Notification shown successfully'))
            .catch((err) => console.error('[SW] Failed to show notification:', err));

        event.waitUntil(Promise.all([messageClientsPromise, showNotificationPromise])
        );
    } catch (error) {
        console.error('[SW] Error parsing push payload:', error);
    }
});

self.addEventListener('notificationclick', function (event: NotificationEvent) {
    event.notification.close();

    const urlToOpen = (event.notification.data as { url?: string })?.url || '/check-in';

    if (event.action === 'dismiss') {
        // User clicked "Later", just close the notification
        return;
    }

    // Open the check-in page or focus if already open
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    (client as WindowClient).navigate(urlToOpen);
                    return (client as WindowClient).focus();
                }
            }
            // If no window is open, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('notificationclose', function () {
    // Track notification dismissal if needed
    console.log('Notification closed without action');
});
