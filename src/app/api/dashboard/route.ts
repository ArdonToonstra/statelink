import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(request: Request) {
    // Get authenticated user from JWT token
    const authenticatedUser = await getAuthenticatedUser()

    if (!authenticatedUser) {
        return NextResponse.json(
            { error: 'Unauthorized - Please log in' },
            { status: 401 }
        )
    }

    const payload = await getPayload({ config })
    const userId = authenticatedUser.id

    try {
        // 1. Get User and Group Info
        const user = await payload.findByID({
            collection: 'users',
            id: userId,
        })

        let groupId = null
        let groupName = 'No Group'
        let memberCount = 0
        let groupPulse = null

        if (user && user.groupID) {
            groupId = typeof user.groupID === 'object' ? user.groupID.id : user.groupID
            const group = await payload.findByID({ collection: 'groups', id: groupId as unknown as number })
            groupName = group?.name || 'My Group'

            // Get Member Count
            const members = await payload.find({
                collection: 'users',
                where: {
                    groupID: { equals: groupId }
                },
                limit: 0
            })
            memberCount = members.totalDocs

            // Calculate Group Pulse (Avg of latest 24h)
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

            const recentCheckins = await payload.find({
                collection: 'checkins',
                where: {
                    groupID: { equals: groupId },
                    createdAt: { greater_than: yesterday.toISOString() }
                },
                limit: 100
            })

            if (recentCheckins.docs.length > 0) {
                const sum = recentCheckins.docs.reduce((acc, curr) => acc + curr.vibeScore, 0)
                groupPulse = (sum / recentCheckins.docs.length).toFixed(1)
            }
        }

        // 3. Get User's Last Vibe (Always fetch this)
        const userCheckins = await payload.find({
            collection: 'checkins',
            where: {
                user: { equals: userId }
            },
            sort: '-createdAt',
            limit: 1
        })
        const userLastVibe = userCheckins.docs[0] || null

        return NextResponse.json({
            groupPulse,
            memberCount,
            userLastVibe,
            groupName
        })

    } catch (error) {
        console.error('Error fetching dashboard data:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
