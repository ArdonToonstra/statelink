import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groups, users, pushSubscriptions, userGroups } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * Debug endpoint to check notification status
 * Only accessible to authenticated users (shows their own data)
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = user.id
  const now = new Date()
  
  // Get user's push subscriptions
  const userSubs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  })
  
  // Get user's group memberships
  const memberships = await db.query.userGroups.findMany({
    where: eq(userGroups.userId, userId),
    with: {
      group: true,
    },
  })
  
  // Get user details
  const userDetails = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })
  
  return NextResponse.json({
    currentTime: now.toISOString(),
    user: {
      id: userId,
      email: user.email,
      activeGroupId: userDetails?.activeGroupId,
      timezone: userDetails?.timezone,
    },
    pushSubscriptions: {
      count: userSubs.length,
      subscriptions: userSubs.map(s => ({
        id: s.id,
        endpoint: s.endpoint,
        endpointHost: new URL(s.endpoint).host,
        p256dhLength: s.p256dh?.length || 0,
        authLength: s.auth?.length || 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    },
    groups: memberships.map(m => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
      frequency: m.group.frequency,
      intervalMode: m.group.intervalMode,
      quietHoursStart: m.group.quietHoursStart,
      quietHoursEnd: m.group.quietHoursEnd,
      lastPingTime: m.group.lastPingTime?.toISOString() || null,
      nextPingTime: m.group.nextPingTime?.toISOString() || null,
      isEligibleNow: m.group.nextPingTime ? m.group.nextPingTime <= now : false,
    })),
    diagnosis: {
      hasPushSubscriptions: userSubs.length > 0,
      hasGroups: memberships.length > 0,
      anyGroupEligible: memberships.some(m => m.group.nextPingTime && m.group.nextPingTime <= now),
    },
  })
}
