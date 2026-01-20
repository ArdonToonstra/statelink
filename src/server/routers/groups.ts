import { z } from 'zod'
import { eq, and, gt, sql } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure, groupMemberProcedure } from '../trpc'
import { groups, users, checkIns } from '@/db/schema'
import { TRPCError } from '@trpc/server'

// Helper to generate invite code
const generateInviteCode = (length: number = 8) => {
  return crypto.randomUUID().substring(0, length).toUpperCase()
}

export const groupsRouter = createTRPCRouter({
  // Create a new group
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate unique invite code
      let inviteCode = generateInviteCode(8)
      let isUnique = false
      let retryCount = 0
      const maxRetries = 10
      
      while (!isUnique && retryCount < maxRetries) {
        const existing = await ctx.db.query.groups.findFirst({
          where: eq(groups.inviteCode, inviteCode),
        })
        
        if (!existing) {
          isUnique = true
        } else {
          inviteCode = generateInviteCode(8)
          retryCount++
        }
      }
      
      if (!isUnique) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate unique invite code. Please try again.',
        })
      }
      
      // Create the group
      const [group] = await ctx.db.insert(groups).values({
        name: input.name,
        inviteCode,
        inviteCodeCreated: new Date(),
        ownerId: ctx.user.id,
        frequency: 2,
        intervalMode: 'random',
      }).returning()
      
      // Update user's groupId
      await ctx.db.update(users)
        .set({ groupId: group.id })
        .where(eq(users.id, ctx.user.id))
      
      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          inviteCode: group.inviteCode,
        },
      }
    }),

  // Join a group by invite code
  join: protectedProcedure
    .input(z.object({
      inviteCode: z.string().min(1),
      migrationAction: z.enum(['merge', 'delete', 'keep']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the group by invite code
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.inviteCode, input.inviteCode.toUpperCase()),
      })
      
      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invite code',
        })
      }
      
      // Check for expiration (7 days)
      if (group.inviteCodeCreated) {
        const createdTime = new Date(group.inviteCodeCreated).getTime()
        const now = Date.now()
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000
        
        if (now - createdTime > oneWeekMs) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Invite code has expired (valid for 7 days)',
          })
        }
      } else {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Invite code is old/invalid. Please ask the group owner to regenerate it.',
        })
      }
      
      // Check for solo check-ins that need migration
      const soloCheckIns = await ctx.db.query.checkIns.findMany({
        where: and(
          eq(checkIns.userId, ctx.user.id),
          sql`${checkIns.groupId} IS NULL`
        ),
        limit: 1,
      })
      
      if (soloCheckIns.length > 0 && !input.migrationAction) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Existing data found',
          cause: { confirmationRequired: true },
        })
      }
      
      if (input.migrationAction === 'merge') {
        // Update all solo check-ins to new groupId
        await ctx.db.update(checkIns)
          .set({ groupId: group.id })
          .where(and(
            eq(checkIns.userId, ctx.user.id),
            sql`${checkIns.groupId} IS NULL`
          ))
      } else if (input.migrationAction === 'delete') {
        // Delete all solo check-ins
        await ctx.db.delete(checkIns)
          .where(and(
            eq(checkIns.userId, ctx.user.id),
            sql`${checkIns.groupId} IS NULL`
          ))
      }
      
      // Update user's groupId
      await ctx.db.update(users)
        .set({ groupId: group.id })
        .where(eq(users.id, ctx.user.id))
      
      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
        },
      }
    }),

  // Regenerate invite code (owner only)
  regenerateInviteCode: groupMemberProcedure
    .input(z.object({
      groupId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      })
      
      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        })
      }
      
      if (group.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the group owner can regenerate invite codes',
        })
      }
      
      const newCode = generateInviteCode(6)
      
      const [updatedGroup] = await ctx.db.update(groups)
        .set({
          inviteCode: newCode,
          inviteCodeCreated: new Date(),
        })
        .where(eq(groups.id, input.groupId))
        .returning()
      
      return {
        success: true,
        inviteCode: updatedGroup.inviteCode,
        inviteCodeCreated: updatedGroup.inviteCodeCreated,
      }
    }),

  // Update group settings (owner only)
  update: groupMemberProcedure
    .input(z.object({
      groupId: z.string(),
      name: z.string().min(1).optional(),
      frequency: z.number().min(1).max(10).optional(),
      intervalMode: z.enum(['random', 'fixed']).optional(),
      quietHoursStart: z.number().min(0).max(23).optional().nullable(),
      quietHoursEnd: z.number().min(0).max(23).optional().nullable(),
      vibeAverageHours: z.number().min(1).max(168).optional(), // 1 hour to 1 week
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      })
      
      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        })
      }
      
      if (group.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the group owner can update group settings',
        })
      }
      
      const { groupId, ...updateData } = input
      
      await ctx.db.update(groups)
        .set(updateData)
        .where(eq(groups.id, groupId))
      
      return { success: true }
    }),

  // Remove a member (owner only)
  removeMember: groupMemberProcedure
    .input(z.object({
      groupId: z.string(),
      memberId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      })
      
      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        })
      }
      
      if (group.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the group owner can remove members',
        })
      }
      
      if (input.memberId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Group owner cannot remove themselves. Use leave instead.',
        })
      }
      
      // Remove user from group but keep their check-in data
      // Set groupId to null on their check-ins so they keep their history
      await ctx.db.update(checkIns)
        .set({ groupId: null })
        .where(and(
          eq(checkIns.userId, input.memberId),
          eq(checkIns.groupId, input.groupId)
        ))
      
      // Remove user from group
      await ctx.db.update(users)
        .set({ groupId: null })
        .where(eq(users.id, input.memberId))
      
      return { success: true }
    }),
})
