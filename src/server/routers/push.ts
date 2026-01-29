import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { pushSubscriptions } from '@/db/schema'
import { sendNotification } from '@/lib/web-push'

export const pushRouter = createTRPCRouter({
  // Subscribe to push notifications
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if subscription already exists
      const existing = await ctx.db.query.pushSubscriptions.findFirst({
        where: eq(pushSubscriptions.endpoint, input.endpoint),
      })

      if (existing) {
        // Update existing subscription with current session ID
        await ctx.db.update(pushSubscriptions)
          .set({
            userId: ctx.user.id,
            sessionId: ctx.session.session.id,
            p256dh: input.p256dh,
            auth: input.auth,
            updatedAt: new Date(),
          })
          .where(eq(pushSubscriptions.endpoint, input.endpoint))
        return { success: true, message: 'Subscription updated' }
      }

      await ctx.db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        sessionId: ctx.session.session.id, // Link to current session for auto-cleanup on logout
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      })

      return { success: true }
    }),

  // Send a test notification to the current user
  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all subscriptions for this user
    const subs = await ctx.db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, ctx.user.id),
    })

    if (subs.length === 0) {
      return { success: false, error: 'No push subscriptions found. Enable notifications first.' }
    }

    let sent = 0
    let failed = 0
    let lastError: string | undefined

    for (const sub of subs) {
      const result = await sendNotification(sub, {
        title: '🎉 Test Notification',
        body: 'Push notifications are working! You\'ll receive vibe check reminders here.',
        url: '/settings',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
      })

      if (result.success) {
        sent++
      } else {
        failed++
        lastError = result.error
      }
    }

    return { success: sent > 0, sent, failed, error: sent > 0 ? undefined : (lastError ?? 'All notifications failed') }
  }),

  // Unsubscribe from push notifications
  unsubscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, input.endpoint))

      return { success: true }
    }),

  // Get user's subscriptions
  list: protectedProcedure.query(async ({ ctx }) => {
    const subs = await ctx.db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, ctx.user.id),
    })

    return subs
  }),
})
