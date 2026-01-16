import { z } from 'zod'
import { eq, count } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure, groupMemberProcedure } from '../trpc'
import { users, groups, checkIns } from '@/db/schema'
import { TRPCError } from '@trpc/server'

export const settingsRouter = createTRPCRouter({
  // Get all settings data
  getData: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      with: {
        group: true,
      },
    })
    
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }
    
    let group = null
    
    if (user.groupId && user.group) {
      // Get members
      const members = await ctx.db.query.users.findMany({
        where: eq(users.groupId, user.groupId),
      })
      
      group = {
        id: user.group.id,
        name: user.group.name,
        inviteCode: user.group.inviteCode,
        inviteCodeCreated: user.group.inviteCodeCreated,
        frequency: user.group.frequency,
        intervalMode: user.group.intervalMode,
        quietHoursStart: user.group.quietHoursStart,
        quietHoursEnd: user.group.quietHoursEnd,
        members: members.map(m => ({
          id: m.id,
          name: m.displayName,
          role: m.id === user.group!.ownerId ? 'owner' : 'member',
        })),
      }
    }
    
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
        isGroupOwner: group ? user.group?.ownerId === user.id : false,
      },
      group,
      checkins: userCheckIns,
    }
  }),
})
