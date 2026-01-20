import { z } from 'zod'
import { eq, count } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { users, groups, checkIns, userGroups } from '@/db/schema'
import { TRPCError } from '@trpc/server'

export const settingsRouter = createTRPCRouter({
  // Get all settings data
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
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }
    
    // Build list of all user's groups
    const allGroups = await Promise.all(user.userGroups.map(async (ug) => {
      // Get members for each group via junction table
      const memberships = await ctx.db.query.userGroups.findMany({
        where: eq(userGroups.groupId, ug.group.id),
        with: {
          user: true,
        },
      })
      
      return {
        id: ug.group.id,
        name: ug.group.name,
        inviteCode: ug.group.inviteCode,
        inviteCodeCreated: ug.group.inviteCodeCreated,
        frequency: ug.group.frequency,
        intervalMode: ug.group.intervalMode,
        quietHoursStart: ug.group.quietHoursStart,
        quietHoursEnd: ug.group.quietHoursEnd,
        vibeAverageHours: ug.group.vibeAverageHours,
        ownerId: ug.group.ownerId,
        isOwner: ug.group.ownerId === user.id,
        members: memberships.map(m => ({
          id: m.user.id,
          name: m.user.displayName || m.user.name,
          role: m.role,
        })),
      }
    }))
    
    // Get the active group details (for backwards compatibility)
    const activeGroup = allGroups.find(g => g.id === user.activeGroupId) ?? null
    
    // Get user's check-ins
    const userCheckIns = await ctx.db.query.checkIns.findMany({
      where: eq(checkIns.userId, ctx.user.id),
      limit: 1000,
    })
    
    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        activeGroupId: user.activeGroupId,
      },
      group: activeGroup, // For backwards compatibility
      groups: allGroups, // All groups user is member of
      checkins: userCheckIns,
    }
  }),
})
