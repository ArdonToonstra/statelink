import { z } from 'zod'
import { eq, and, gt, desc, count } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { users, groups, checkIns } from '@/db/schema'

export const dashboardRouter = createTRPCRouter({
  // Get dashboard data
  getData: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      with: {
        group: true,
      },
    })
    
    if (!user) {
      return {
        groupPulse: null,
        memberCount: 0,
        userLastVibe: null,
        groupName: 'No Group',
        vibeAverageHours: 24,
      }
    }
    
    let groupPulse: string | null = null
    let memberCount = 0
    let groupName = 'No Group'
    let vibeAverageHours = 24
    
    if (user.groupId && user.group) {
      groupName = user.group.name
      vibeAverageHours = user.group.vibeAverageHours ?? 24
      
      // Get member count
      const members = await ctx.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.groupId, user.groupId))
      memberCount = members[0]?.count ?? 0
      
      // Calculate group pulse using configurable time window
      const timeWindowStart = new Date(Date.now() - vibeAverageHours * 60 * 60 * 1000)
      
      const recentCheckIns = await ctx.db.query.checkIns.findMany({
        where: and(
          eq(checkIns.groupId, user.groupId),
          gt(checkIns.createdAt, timeWindowStart)
        ),
        limit: 100,
      })
      
      if (recentCheckIns.length > 0) {
        const sum = recentCheckIns.reduce((acc, curr) => acc + curr.vibeScore, 0)
        groupPulse = (sum / recentCheckIns.length).toFixed(1)
      }
    }
    
    // Get user's last vibe
    const userLastCheckIn = await ctx.db.query.checkIns.findFirst({
      where: eq(checkIns.userId, ctx.user.id),
      orderBy: desc(checkIns.createdAt),
    })
    
    return {
      groupPulse,
      memberCount,
      userLastVibe: userLastCheckIn ?? null,
      groupName,
      vibeAverageHours,
    }
  }),
})
