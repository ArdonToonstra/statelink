import type { CollectionConfig } from 'payload'

export const CheckIns: CollectionConfig = {
  slug: 'checkins',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'vibeScore', 'createdAt'],
  },
  access: {
    // Users can only read check-ins from their group
    read: ({ req: { user } }) => {
      if (!user) return false
      return {
        groupID: {
          equals: user.groupID,
        },
      }
    },
    // Users can only create their own check-ins
    create: ({ req: { user } }) => !!user,
    // Users can only update their own check-ins (for 24h edit window)
    update: ({ req: { user } }) => {
      if (!user) return false
      return {
        user: {
          equals: user.id,
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return {
        user: {
          equals: user.id,
        },
      }
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User who made this check-in',
      },
    },
    {
      name: 'groupID',
      type: 'relationship',
      relationTo: 'groups',
      required: false,
      admin: {
        description: 'Group this check-in belongs to',
      },
    },
    {
      name: 'vibeScore',
      type: 'number',
      required: true,
      min: 1,
      max: 10,
      admin: {
        description: 'Vibe score from 1-10',
      },
    },
    {
      name: 'tags',
      type: 'array',
      admin: {
        description: 'Context tags for this check-in',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'customNote',
      type: 'textarea',
      admin: {
        description: 'Optional custom note',
      },
    },
  ],
  timestamps: true,
}
