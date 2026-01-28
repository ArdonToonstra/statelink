import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groups, users, pushSubscriptions } from '@/db/schema'
import { lte, isNotNull, isNull, eq } from 'drizzle-orm'
import { 
  sendToGroup,
  sendNotification,
  calculateNextPingTime, 
  initializeNextPingTime,
  type PushPayload 
} from '@/lib/web-push'

// Verify cron secret to prevent unauthorized access
// Vercel cron jobs automatically include CRON_SECRET in the Authorization header
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }
  
  // Vercel cron sends the secret in the Authorization header as "Bearer {CRON_SECRET}"
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  // Also check for vercel's cron signature header (for older setups)
  const vercelCronHeader = request.headers.get('x-vercel-cron-auth-token')
  if (vercelCronHeader === cronSecret) {
    return true
  }
  
  console.error('Cron authorization failed - no valid auth header found')
  return false
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const now = new Date()
  console.log(`[Cron Ping] Starting at ${now.toISOString()}`)
  
  const results: Array<{
    groupId: string
    groupName: string
    sent: number
    failed: number
    skippedQuietHours: number
    nextPingTime: Date
  }> = []
  
  try {
    // Find all groups where nextPingTime <= now
    const eligibleGroups = await db.query.groups.findMany({
      where: lte(groups.nextPingTime, now),
    })
    
    console.log(`[Cron Ping] Found ${eligibleGroups.length} eligible groups with nextPingTime <= now`)
    
    // Also find groups that have never been pinged (nextPingTime is null)
    const uninitializedGroups = await db.query.groups.findMany({
      where: isNotNull(groups.ownerId), // All groups with owners
    })
    
    // Filter to only those without nextPingTime set
    const needsInit = uninitializedGroups.filter(g => g.nextPingTime === null)
    
    console.log(`[Cron Ping] Total groups: ${uninitializedGroups.length}, needs init: ${needsInit.length}`)
    
    // Log all groups with their next ping times for debugging
    for (const group of uninitializedGroups) {
      console.log(`[Cron Ping] Group "${group.name}": nextPingTime=${group.nextPingTime?.toISOString() || 'null'}, frequency=${group.frequency}`)
    }
    
    // Initialize nextPingTime for groups that don't have it
    for (const group of needsInit) {
      const nextPing = initializeNextPingTime(group.frequency, group.intervalMode)
      await db.update(groups)
        .set({ nextPingTime: nextPing })
        .where(eq(groups.id, group.id))
      
      console.log(`[Cron Ping] Initialized nextPingTime for group ${group.name}: ${nextPing.toISOString()}`)
    }
    
    // Process eligible groups
    for (const group of eligibleGroups) {
      console.log(`[Cron Ping] Processing group "${group.name}" (id: ${group.id})`)
      
      const payload: PushPayload = {
        title: 'Vibe Check! 🎯',
        body: `How are you feeling right now?`,
        url: '/check-in',
        icon: '/icons/icon-192x192.png',
      }
      
      // Send notifications to group members (respecting quiet hours per user)
      const { sent, failed, skippedQuietHours } = await sendToGroup(
        group.id,
        payload,
        group.quietHoursStart,
        group.quietHoursEnd
      )
      
      // Calculate next ping time based on interval mode
      const nextPingTime = calculateNextPingTime(group.frequency, group.intervalMode)
      
      // Update group with last and next ping times
      await db.update(groups)
        .set({ 
          lastPingTime: now,
          nextPingTime: nextPingTime,
          updatedAt: now,
        })
        .where(eq(groups.id, group.id))
      
      results.push({
        groupId: group.id,
        groupName: group.name,
        sent,
        failed,
        skippedQuietHours,
        nextPingTime,
      })
      
      console.log(`Pinged group ${group.name}: sent=${sent}, failed=${failed}, skipped=${skippedQuietHours}, next=${nextPingTime.toISOString()}`)
    }
    
    // ============================================
    // Solo users: Users with push subscriptions but no group memberships
    // Send them notifications too (simplified: every cron run)
    // ============================================
    let soloSent = 0
    let soloFailed = 0
    
    // Get all users with push subscriptions who have no active group
    const soloUsersWithSubs = await db.query.users.findMany({
      where: isNull(users.activeGroupId),
      with: {
        pushSubscriptions: true,
      },
    })
    
    // Filter to only those with subscriptions
    const soloUsersToNotify = soloUsersWithSubs.filter(u => u.pushSubscriptions.length > 0)
    
    console.log(`[Cron Ping] Found ${soloUsersToNotify.length} solo users with push subscriptions`)
    
    if (soloUsersToNotify.length > 0) {
      const soloPayload: PushPayload = {
        title: 'Vibe Check! 🎯',
        body: 'How are you feeling right now?',
        url: '/check-in',
        icon: '/icons/icon-192x192.png',
      }
      
      for (const user of soloUsersToNotify) {
        console.log(`[Cron Ping] Notifying solo user ${user.email}`)
        for (const subscription of user.pushSubscriptions) {
          const result = await sendNotification(subscription, soloPayload)
          if (result.success) {
            soloSent++
          } else {
            console.log(`[Cron Ping] Failed to notify solo user ${user.email}: ${result.error}`)
            soloFailed++
          }
        }
      }
    }
    
    console.log(`[Cron Ping] Solo users: sent=${soloSent}, failed=${soloFailed}`)
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      groupsProcessed: eligibleGroups.length,
      groupsInitialized: needsInit.length,
      soloUsersNotified: soloUsersToNotify.length,
      soloSent,
      soloFailed,
      results,
    })
    
  } catch (error) {
    console.error('Cron ping error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process pings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering in development
export async function POST(request: NextRequest) {
  return GET(request)
}
