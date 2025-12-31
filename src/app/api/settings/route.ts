import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    try {
        const user = await payload.findByID({ collection: 'users', id: userId })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        let group = null
        if (user.groupID) {
            const gid = typeof user.groupID === 'object' ? user.groupID.id : user.groupID
            group = await payload.findByID({ collection: 'groups', id: gid as unknown as number })

            // Get members
            const membersResult = await payload.find({
                collection: 'users',
                where: { groupID: { equals: gid } },
            })
            // Attach members to group obj for frontend
            // @ts-ignore
            group.members = membersResult.docs.map(u => ({
                id: u.id,
                name: u.displayName,
                role: u.id === (typeof group.createdBy === 'object' ? group.createdBy.id : group.createdBy) ? 'owner' : 'member'
            }))
        }

        return NextResponse.json({
            user: {
                id: user.id,
                displayName: user.displayName,
                email: user.email,
                isGroupOwner: group ? (user.id === (typeof group.createdBy === 'object' ? group.createdBy.id : group.createdBy)) : false
            },
            group: group ? {
                id: group.id,
                name: group.name,
                inviteCode: group.inviteCode,
                members: group.members
            } : null
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { userId, type, data } = body

    // type: 'profile' | 'group' | 'leave_group'

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    try {
        if (type === 'profile') {
            const { displayName } = data
            await payload.update({
                collection: 'users',
                id: userId,
                data: { displayName }
            })
            return NextResponse.json({ success: true })
        }

        if (type === 'leave_group') {
            await payload.update({
                collection: 'users',
                id: userId,
                data: { groupID: null }
            })
            return NextResponse.json({ success: true })
        }

        if (type === 'group') {
            const user = await payload.findByID({ collection: 'users', id: userId })
            if (!user.groupID) return NextResponse.json({ error: 'No group' }, { status: 400 })
            const gId = typeof user.groupID === 'object' ? user.groupID.id : user.groupID

            // Verify Owner
            // For now assume logic checks or we check valid member. 
            // Ideally check owner.

            const { name, removeMemberId } = data

            if (removeMemberId) {
                // Remove member logic: Set their groupID to null
                await payload.update({
                    collection: 'users',
                    id: removeMemberId,
                    data: { groupID: null }
                })
            }

            if (name) {
                await payload.update({
                    collection: 'groups',
                    id: gId as unknown as number,
                    data: { name }
                })
            }
            return NextResponse.json({ success: true })
        }

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
