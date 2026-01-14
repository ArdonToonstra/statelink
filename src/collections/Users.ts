import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'displayName',
  },
  auth: true,
  fields: [
    {
      name: 'displayName',
      type: 'text',
      required: true,
      admin: {
        description: 'Display name shown to group members',
      },
    },

    {
      name: 'groupID',
      type: 'relationship',
      relationTo: 'groups',
      admin: {
        description: 'Group this user belongs to',
      },
    },

    // Verification Fields
    {
      name: 'verificationCode',
      type: 'text',
      admin: {
        hidden: true,
        disabled: true,
      },
    },
    {
      name: 'verificationCodeExpiresAt',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'lastVerificationEmailSentAt',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'isVerified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has the user verified their email?',
      },
    },
  ],
}
