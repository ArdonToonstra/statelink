import webpush from 'web-push'
import { db } from '@/db'
import { pushSubscriptions, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Configure VAPID keys lazily to avoid build-time errors
let vapidConfigured = false

function ensureVapidConfigured(): void {
  if (vapidConfigured) return
  
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.')
  }
  
  webpush.setVapidDetails(
    'mailto:notifications@groupvibes.nl',
    vapidPublicKey,
    vapidPrivateKey
  )
  
  vapidConfigured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
}

/**
 * Send a push notification to a single subscription
 */
export async function sendNotification(
  subscription: {
    endpoint: string
    p256dh: string
    auth: string
  },
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  ensureVapidConfigured()
  
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    )
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Push notification failed:', errorMessage)
    
    // If subscription is invalid (410 Gone), we should clean it up
    if (error instanceof webpush.WebPushError && error.statusCode === 410) {
      await db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    }
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Check if a user is currently in quiet hours based on their timezone
 */
export function isInQuietHours(
  quietHoursStart: number | null,
  quietHoursEnd: number | null,
  userTimezone: string
): boolean {
  if (quietHoursStart === null || quietHoursEnd === null) {
    return false
  }
  
  // Get current hour in user's timezone
  const now = new Date()
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
  const currentHour = userTime.getHours()
  
  // Handle quiet hours that span midnight (e.g., 23:00 to 07:00)
  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd
  }
  
  // Normal range (e.g., 22:00 to 06:00 where start < end doesn't happen, but 09:00 to 17:00)
  return currentHour >= quietHoursStart && currentHour < quietHoursEnd
}

/**
 * Send push notifications to all members of a group
 * Respects individual user quiet hours based on their timezone
 */
export async function sendToGroup(
  groupId: string,
  payload: PushPayload,
  quietHoursStart: number | null,
  quietHoursEnd: number | null
): Promise<{ sent: number; failed: number; skippedQuietHours: number }> {
  // Get all users in the group with their subscriptions and timezone
  const groupUsers = await db.query.users.findMany({
    where: eq(users.groupId, groupId),
    with: {
      pushSubscriptions: true,
    },
  })
  
  let sent = 0
  let failed = 0
  let skippedQuietHours = 0
  
  for (const user of groupUsers) {
    const userTimezone = user.timezone || 'UTC'
    
    // Check if user is in quiet hours
    if (isInQuietHours(quietHoursStart, quietHoursEnd, userTimezone)) {
      skippedQuietHours++
      continue
    }
    
    // Send to all subscriptions for this user
    for (const subscription of user.pushSubscriptions) {
      const result = await sendNotification(subscription, payload)
      if (result.success) {
        sent++
      } else {
        failed++
      }
    }
  }
  
  return { sent, failed, skippedQuietHours }
}

/**
 * Calculate the next ping time using Poisson-like distribution
 * This creates more natural, random-feeling intervals
 * 
 * @param frequency - Number of pings per week
 * @returns Next ping time as Date
 */
export function calculateNextPingTime(frequency: number, intervalMode: 'random' | 'fixed'): Date {
  const now = new Date()
  
  if (intervalMode === 'fixed') {
    // For fixed mode, distribute evenly across the week
    // e.g., 7 pings/week = every 24 hours
    const hoursPerPing = (7 * 24) / frequency
    const nextPing = new Date(now.getTime() + hoursPerPing * 60 * 60 * 1000)
    return nextPing
  }
  
  // For random mode, use exponential distribution (Poisson process)
  // The expected time between events is (7 * 24) / frequency hours
  const expectedHoursPerPing = (7 * 24) / frequency
  
  // Generate exponentially distributed random interval
  // Using inverse transform sampling: -ln(U) * mean
  const u = Math.random()
  // Avoid log(0) and ensure minimum interval of 1 hour
  const randomHours = Math.max(1, -Math.log(1 - u) * expectedHoursPerPing)
  
  // Cap at 2x the expected interval to avoid extremely long waits
  const cappedHours = Math.min(randomHours, expectedHoursPerPing * 2)
  
  const nextPing = new Date(now.getTime() + cappedHours * 60 * 60 * 1000)
  return nextPing
}

/**
 * Initialize next ping time for a group if not set
 */
export function initializeNextPingTime(frequency: number, intervalMode: 'random' | 'fixed'): Date {
  // For new groups, schedule first ping within the next few hours
  const now = new Date()
  const hoursUntilFirst = intervalMode === 'random' 
    ? Math.random() * 4 + 1 // 1-5 hours for random
    : 1 // 1 hour for fixed
  
  return new Date(now.getTime() + hoursUntilFirst * 60 * 60 * 1000)
}
