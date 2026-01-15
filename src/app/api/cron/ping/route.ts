import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groups } from '@/db/schema'
import { lte, isNotNull } from 'drizzle-orm'
import { 
  sendToGroup, 
  calculateNextPingTime, 
  initializeNextPingTime,
  type PushPayload 
} from '@/lib/web-push'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const now = new Date()
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
    
    // Also find groups that have never been pinged (nextPingTime is null)
    const uninitializedGroups = await db.query.groups.findMany({
      where: isNotNull(groups.ownerId), // All groups with owners
    })
    
    // Filter to only those without nextPingTime set
    const needsInit = uninitializedGroups.filter(g => g.nextPingTime === null)
    
    // Initialize nextPingTime for groups that don't have it
    for (const group of needsInit) {
      const nextPing = initializeNextPingTime(group.frequency, group.intervalMode)
      await db.update(groups)
        .set({ nextPingTime: nextPing })
        .where(lte(groups.id, group.id))
      
      console.log(`Initialized nextPingTime for group ${group.name}: ${nextPing.toISOString()}`)
    }
    
    // Process eligible groups
    for (const group of eligibleGroups) {
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
        .where(lte(groups.id, group.id))
      
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
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      groupsProcessed: eligibleGroups.length,
      groupsInitialized: needsInit.length,
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
