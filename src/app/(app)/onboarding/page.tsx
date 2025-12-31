'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [groupAction, setGroupAction] = useState<'create' | 'join' | null>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNext = () => {
    if (step === 1 && !displayName.trim()) {
      setError('Please enter your name')
      return
    }
    setError('')
    setStep(step + 1)
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First, create the user account
      const userResponse = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
        }),
      })

      const userData = await userResponse.json()

      if (!userResponse.ok) {
        throw new Error(userData.error || 'Failed to create user account')
      }

      // Then create the group with the real user ID
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, userId: userData.user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group')
      }

      // Show invite code to user
      alert(`Group created! Invite code: ${data.group.inviteCode}`)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First, create the user account
      const userResponse = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
        }),
      })

      const userData = await userResponse.json()

      if (!userResponse.ok) {
        throw new Error(userData.error || 'Failed to create user account')
      }

      // Then join the group with the real user ID
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, userId: userData.user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join group')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">🛸 StateLink</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay in sync with your close-knit group
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  What should we call you?
                </label>
                <Input
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <Button onClick={handleNext} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {step === 2 && !groupAction && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-400">
                Do you want to create a new group or join an existing one?
              </p>
              <Button
                onClick={() => setGroupAction('create')}
                className="w-full"
              >
                Create New Group
              </Button>
              <Button
                onClick={() => setGroupAction('join')}
                variant="outline"
                className="w-full"
              >
                Join Existing Group
              </Button>
            </div>
          )}

          {step === 2 && groupAction === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Group Name
                </label>
                <Input
                  placeholder="My awesome group"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={() => setGroupAction(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && groupAction === 'join' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Invite Code
                </label>
                <Input
                  placeholder="XXXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={() => setGroupAction(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoinGroup}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Joining...' : 'Join Group'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
