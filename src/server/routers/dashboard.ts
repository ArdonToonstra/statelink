import { z } from 'zod'
import { eq, and, gt, desc, count, inArray } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { users, groups, checkIns, userGroups } from '@/db/schema'

export const dashboardRouter = createTRPCRouter({
  // Get dashboard data
  getData: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      with: {
        activeGroup: true,
        userGroups: {
          with: {
            group: true,
          },
        },
      },
    })
    
    if (!user) {
      return {
        groupPulse: null,
        memberCount: 0,
        userLastVibe: null,
        groupName: 'No Group',
        vibeAverageHours: 24,
        activeGroupId: null,
        groups: [],
      }
    }
    
    let groupPulse: string | null = null
    let memberCount = 0
    let groupName = 'Solo Mode'
    let vibeAverageHours = 24
    let activeGroupId = user.activeGroupId
    
    // Get all user's groups for the switcher
    const userGroupsList = user.userGroups.map(ug => ({
      id: ug.group.id,
      name: ug.group.name,
      role: ug.role,
      isOwner: ug.group.ownerId === user.id,
    }))
    
    // If user has no active group but has groups, auto-select the first one
    if (!activeGroupId && userGroupsList.length > 0) {
      activeGroupId = userGroupsList[0].id
      // Update the database to persist this choice
      await ctx.db.update(users)
        .set({ activeGroupId })
        .where(eq(users.id, ctx.user.id))
    }
    
    // Get the active group data
    const activeGroup = activeGroupId 
      ? user.userGroups.find(ug => ug.group.id === activeGroupId)?.group 
      : null
    
    if (activeGroupId && activeGroup) {
      groupName = activeGroup.name
      vibeAverageHours = activeGroup.vibeAverageHours ?? 24
      
      // Get member count via junction table
      const memberships = await ctx.db
        .select({ count: count() })
        .from(userGroups)
        .where(eq(userGroups.groupId, activeGroupId))
      memberCount = memberships[0]?.count ?? 0
      
      // Get all member IDs for this group
      const groupMemberships = await ctx.db.query.userGroups.findMany({
        where: eq(userGroups.groupId, activeGroupId),
      })
      const memberIds = groupMemberships.map(m => m.userId)
      
      // Calculate group pulse using configurable time window and user membership lookup
      const timeWindowStart = new Date(Date.now() - vibeAverageHours * 60 * 60 * 1000)
      
      if (memberIds.length > 0) {
        const recentCheckIns = await ctx.db.query.checkIns.findMany({
          where: and(
            inArray(checkIns.userId, memberIds),
            gt(checkIns.createdAt, timeWindowStart)
          ),
          limit: 100,
        })
        
        if (recentCheckIns.length > 0) {
          const sum = recentCheckIns.reduce((acc, curr) => acc + curr.vibeScore, 0)
          groupPulse = (sum / recentCheckIns.length).toFixed(1)
        }
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
      activeGroupId,
      groups: userGroupsList,
    }
  }),
})
