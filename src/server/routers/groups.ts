import { z } from 'zod'
import { eq, and, gt, sql, inArray } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { groups, users, checkIns, userGroups } from '@/db/schema'
import { TRPCError } from '@trpc/server'

// Helper to generate invite code
const generateInviteCode = (length: number = 8) => {
  return crypto.randomUUID().substring(0, length).toUpperCase()
}

export const groupsRouter = createTRPCRouter({
  // List all groups the current user is a member of
  listUserGroups: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.query.userGroups.findMany({
      where: eq(userGroups.userId, ctx.user.id),
      with: {
        group: true,
      },
    })
    
    return memberships.map(m => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
      joinedAt: m.joinedAt,
      isOwner: m.group.ownerId === ctx.user.id,
    }))
  }),

  // Set the active group for the current user
  setActiveGroup: protectedProcedure
    .input(z.object({
      groupId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting to a group, verify membership
      if (input.groupId) {
        const membership = await ctx.db.query.userGroups.findFirst({
          where: and(
            eq(userGroups.userId, ctx.user.id),
            eq(userGroups.groupId, input.groupId)
          ),
        })
        
        if (!membership) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a member of this group',
          })
        }
      }
      
      await ctx.db.update(users)
        .set({ activeGroupId: input.groupId })
        .where(eq(users.id, ctx.user.id))
      
      return { success: true }
    }),

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
      
      // Add user to group via junction table as owner
      await ctx.db.insert(userGroups).values({
        userId: ctx.user.id,
        groupId: group.id,
        role: 'owner',
      })
      
      // Set as active group
      await ctx.db.update(users)
        .set({ activeGroupId: group.id })
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
      
      // Check if already a member
      const existingMembership = await ctx.db.query.userGroups.findFirst({
        where: and(
          eq(userGroups.userId, ctx.user.id),
          eq(userGroups.groupId, group.id)
        ),
      })
      
      if (existingMembership) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You are already a member of this group',
        })
      }
      
      // Add user to group via junction table
      await ctx.db.insert(userGroups).values({
        userId: ctx.user.id,
        groupId: group.id,
        role: 'member',
      })
      
      // Set as active group
      await ctx.db.update(users)
        .set({ activeGroupId: group.id })
        .where(eq(users.id, ctx.user.id))
      
      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
        },
      }
    }),

  // Leave a group
  leave: protectedProcedure
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
      
      // Check membership
      const membership = await ctx.db.query.userGroups.findFirst({
        where: and(
          eq(userGroups.userId, ctx.user.id),
          eq(userGroups.groupId, input.groupId)
        ),
      })
      
      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'You are not a member of this group',
        })
      }
      
      // If user is owner, must transfer ownership first
      if (group.ownerId === ctx.user.id) {
        // Find another member to transfer ownership to
        const otherMember = await ctx.db.query.userGroups.findFirst({
          where: and(
            eq(userGroups.groupId, input.groupId),
            sql`${userGroups.userId} != ${ctx.user.id}`
          ),
        })
        
        if (otherMember) {
          // Transfer ownership
          await ctx.db.update(groups)
            .set({ ownerId: otherMember.userId })
            .where(eq(groups.id, input.groupId))
          
          // Update role in junction table
          await ctx.db.update(userGroups)
            .set({ role: 'owner' })
            .where(and(
              eq(userGroups.userId, otherMember.userId),
              eq(userGroups.groupId, input.groupId)
            ))
        } else {
          // No other members, delete the group
          await ctx.db.delete(userGroups).where(eq(userGroups.groupId, input.groupId))
          await ctx.db.delete(groups).where(eq(groups.id, input.groupId))
          
          // Clear active group if it was this group
          const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.user.id),
          })
          if (user?.activeGroupId === input.groupId) {
            await ctx.db.update(users)
              .set({ activeGroupId: null })
              .where(eq(users.id, ctx.user.id))
          }
          
          return { success: true, groupDeleted: true }
        }
      }
      
      // Remove from junction table
      await ctx.db.delete(userGroups)
        .where(and(
          eq(userGroups.userId, ctx.user.id),
          eq(userGroups.groupId, input.groupId)
        ))
      
      // If this was active group, switch to another group or null
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      })
      
      if (user?.activeGroupId === input.groupId) {
        // Find another group
        const anotherMembership = await ctx.db.query.userGroups.findFirst({
          where: eq(userGroups.userId, ctx.user.id),
        })
        
        await ctx.db.update(users)
          .set({ activeGroupId: anotherMembership?.groupId ?? null })
          .where(eq(users.id, ctx.user.id))
      }
      
      return { success: true, groupDeleted: false }
    }),

  // Regenerate invite code (owner only)
  regenerateInviteCode: protectedProcedure
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
  update: protectedProcedure
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

  // Get group details with members
  getDetails: protectedProcedure
    .input(z.object({
      groupId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.db.query.userGroups.findFirst({
        where: and(
          eq(userGroups.userId, ctx.user.id),
          eq(userGroups.groupId, input.groupId)
        ),
      })
      
      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this group',
        })
      }
      
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      })
      
      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        })
      }
      
      // Get members via junction table
      const memberships = await ctx.db.query.userGroups.findMany({
        where: eq(userGroups.groupId, input.groupId),
        with: {
          user: true,
        },
      })
      
      return {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        inviteCodeCreated: group.inviteCodeCreated,
        frequency: group.frequency,
        intervalMode: group.intervalMode,
        quietHoursStart: group.quietHoursStart,
        quietHoursEnd: group.quietHoursEnd,
        vibeAverageHours: group.vibeAverageHours,
        ownerId: group.ownerId,
        isOwner: group.ownerId === ctx.user.id,
        members: memberships.map(m => ({
          id: m.user.id,
          name: m.user.displayName || m.user.name,
          role: m.role,
          isOwner: m.user.id === group.ownerId,
        })),
      }
    }),

  // Remove a member (owner only)
  removeMember: protectedProcedure
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
      
      // Remove from junction table
      await ctx.db.delete(userGroups)
        .where(and(
          eq(userGroups.userId, input.memberId),
          eq(userGroups.groupId, input.groupId)
        ))
      
      // Clear active group if it was this group
      await ctx.db.update(users)
        .set({ activeGroupId: sql`CASE WHEN ${users.activeGroupId} = ${input.groupId} THEN NULL ELSE ${users.activeGroupId} END` })
        .where(eq(users.id, input.memberId))
      
      return { success: true }
    }),

  // Transfer ownership (owner only)
  transferOwnership: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      newOwnerId: z.string(),
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
          message: 'Only the group owner can transfer ownership',
        })
      }
      
      // Verify new owner is a member
      const newOwnerMembership = await ctx.db.query.userGroups.findFirst({
        where: and(
          eq(userGroups.userId, input.newOwnerId),
          eq(userGroups.groupId, input.groupId)
        ),
      })
      
      if (!newOwnerMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'New owner must be a member of the group',
        })
      }
      
      // Update group owner
      await ctx.db.update(groups)
        .set({ ownerId: input.newOwnerId })
        .where(eq(groups.id, input.groupId))
      
      // Update roles in junction table
      await ctx.db.update(userGroups)
        .set({ role: 'member' })
        .where(and(
          eq(userGroups.userId, ctx.user.id),
          eq(userGroups.groupId, input.groupId)
        ))
      
      await ctx.db.update(userGroups)
        .set({ role: 'owner' })
        .where(and(
          eq(userGroups.userId, input.newOwnerId),
          eq(userGroups.groupId, input.groupId)
        ))
      
      return { success: true }
    }),
})
