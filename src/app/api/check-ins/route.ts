import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const groupId = searchParams.get('groupId')

    const scope = searchParams.get('scope')

    try {
        let where: any = {}

        if (scope === 'group' && userId) {
            // Find user's group first
            const user = await payload.findByID({ collection: 'users', id: userId })
            if (!user || !user.groupID) return NextResponse.json([])

            const gId = typeof user.groupID === 'object' ? user.groupID.id : user.groupID
            where.groupID = { equals: gId }
        } else if (userId) {
            where.user = { equals: userId }
        } else if (groupId) {
            where.groupID = { equals: groupId }
        } else {
            return NextResponse.json({ error: 'Missing userId or groupId' }, { status: 400 })
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
    const payload = await getPayload({ config })

    try {
        const body = await request.json()
        const { userId, vibeScore, tags, customNote } = body

        if (!userId || !vibeScore) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get user to find groupID
        const user = await payload.findByID({
            collection: 'users',
            id: userId,
        })

        if (!user || !user.groupID) {
            return NextResponse.json({ error: 'User not found or not in a group' }, { status: 404 })
        }

        // Create Checkin
        // Note: 'tags' in schema is an array of objects { tag: string }, handled by frontend or here?
        // Frontend sends: string[] usually. Schema says: array of fields [ { name: 'tag', type: 'text' } ]
        // So Payload expects: [ { tag: 'Work' }, { tag: 'Tired' } ]

        const formattedTags = Array.isArray(tags)
            ? tags.map((t: string | { tag: string }) => typeof t === 'string' ? { tag: t } : t)
            : []

        const checkin = await payload.create({
            collection: 'checkins',
            data: {
                user: Number(userId), // Ensure runtime number
                groupID: (typeof user.groupID === 'object' ? user.groupID.id : user.groupID) as any,
                vibeScore,
                tags: formattedTags,
                customNote,
            },
            overrideAccess: true, // Needed because we are creating on behalf of user via API without full req context sometimes
        })

        return NextResponse.json(checkin)

    } catch (error) {
        console.error('Error creating checkin:', error)
        return NextResponse.json({ error: 'Failed to create checkin' }, { status: 500 })
    }
}
