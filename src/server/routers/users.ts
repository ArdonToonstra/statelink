import { z } from 'zod'
import { eq, and, gt, desc, count } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { users, groups, checkIns, pushSubscriptions, sessions, accounts, userGroups } from '@/db/schema'
import { TRPCError } from '@trpc/server'

export const usersRouter = createTRPCRouter({
  // Get current user profile with all groups
  me: protectedProcedure.query(async ({ ctx }) => {
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
    
    return {
      ...user,
      groups: user.userGroups.map(ug => ({
        id: ug.group.id,
        name: ug.group.name,
        role: ug.role,
        isOwner: ug.group.ownerId === user.id,
      })),
    }
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).optional(),
      customActivityIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set(input)
        .where(eq(users.id, ctx.user.id))
      
      return { success: true }
    }),

  // Get user preferences (for check-in page)
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: {
        customActivityIds: true,
      },
    })
    
    return {
      customActivityIds: user?.customActivityIds ?? null,
    }
  }),

  // Delete account
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id
    
    // Delete all check-ins by this user
    await ctx.db.delete(checkIns).where(eq(checkIns.userId, userId))
    
    // Delete all push subscriptions
    await ctx.db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
    
    // Find groups owned by this user
    const ownedGroups = await ctx.db.query.groups.findMany({
      where: eq(groups.ownerId, userId),
    })
    
    for (const group of ownedGroups) {
      // Get all members of this group
      const allMembers = await ctx.db.query.userGroups.findMany({
        where: eq(userGroups.groupId, group.id),
      })
      const otherMemberRecord = allMembers.find(m => m.userId !== userId)
      
      if (otherMemberRecord) {
        // Transfer ownership
        await ctx.db.update(groups)
          .set({ ownerId: otherMemberRecord.userId })
          .where(eq(groups.id, group.id))
        
        await ctx.db.update(userGroups)
          .set({ role: 'owner' })
          .where(and(
            eq(userGroups.userId, otherMemberRecord.userId),
            eq(userGroups.groupId, group.id)
          ))
      } else {
        // No other members, delete the group
        await ctx.db.delete(userGroups).where(eq(userGroups.groupId, group.id))
        await ctx.db.delete(groups).where(eq(groups.id, group.id))
      }
    }
    
    // Remove user from all groups
    await ctx.db.delete(userGroups).where(eq(userGroups.userId, userId))
    
    // Clean up Better Auth sessions and accounts before deleting user
    await ctx.db.delete(sessions).where(eq(sessions.userId, userId))
    await ctx.db.delete(accounts).where(eq(accounts.userId, userId))
    
    // Delete the user (Better Auth user table is unified)
    await ctx.db.delete(users).where(eq(users.id, userId))
    
    return { success: true, message: 'Account deleted successfully' }
  }),
})
