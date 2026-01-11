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
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')
    const userId = authenticatedUser.id

    try {
        let where: any = {}

        if (scope === 'group') {
            // Find user's group first
            const user = await payload.findByID({ collection: 'users', id: userId })
            if (!user || !user.groupID) return NextResponse.json([])

            const gId = typeof user.groupID === 'object' ? user.groupID.id : user.groupID
            where.groupID = { equals: gId }
        } else {
            // Default to user's own check-ins
            where.user = { equals: userId }
        }

        const checkins = await payload.find({
            collection: 'checkins',
            where,
            sort: '-createdAt',
            depth: 2 // expand user
        })

        return NextResponse.json(checkins)

    } catch (error) {
        console.error('Error fetching checkins:', error)
        return NextResponse.json({ error: 'Failed to fetch checkins' }, { status: 500 })
    }
}

export async function POST(request: Request) {
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
        const body = await request.json()
        const { vibeScore, tags, customNote } = body

        if (!vibeScore) {
            return NextResponse.json({ error: 'Missing required field: vibeScore' }, { status: 400 })
        }

        // Get user to find groupID
        const user = await payload.findByID({
            collection: 'users',
            id: userId,
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Format tags for Payload
        const formattedTags = Array.isArray(tags)
            ? tags.map((t: string | { tag: string }) => typeof t === 'string' ? { tag: t } : t)
            : []

        const checkin = await payload.create({
            collection: 'checkins',
            data: {
                user: Number(userId),
                groupID: (user.groupID && typeof user.groupID === 'object' ? user.groupID.id : user.groupID) as any || null,
                vibeScore,
                tags: formattedTags,
                customNote,
            },
            overrideAccess: true,
        })

        return NextResponse.json(checkin)

    } catch (error) {
        console.error('Error creating checkin:', error)
        return NextResponse.json({ error: 'Failed to create checkin' }, { status: 500 })
    }
}
