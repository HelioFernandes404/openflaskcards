import { Mail, Shield, Calendar, Globe } from 'lucide-react'
import { PageHeader } from '@/shared/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/shared/components/avatar'
import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/button'
import { Card } from '@/shared/components/card'
import { Badge } from '@/shared/components/badge'
import { Select } from '@/shared/components/select'
import { ApiStudyService } from '@/features/study/services/ApiStudyService'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'

const COMMON_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Sao Paulo (UTC-3)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6/-5)' },
  { value: 'America/Denver', label: 'Denver (UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'Europe/London', label: 'London (UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
  { value: 'Pacific/Auckland', label: 'Auckland (UTC+12/+13)' },
]

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useNotification()
  const [savingTimezone, setSavingTimezone] = useState(false)

  if (!user) return null

  const handleTimezoneChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newTimezone = e.target.value || null
    setSavingTimezone(true)
    try {
      const service = new ApiStudyService()
      await service.updateUser({ timezone: newTimezone } as Partial<
        typeof user
      >)
      await refreshUser()
    } catch (err) {
      showToast(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'Failed to update timezone. Please try again.',
        }),
        'error',
      )
    } finally {
      setSavingTimezone(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-4xl" data-testid="profile-page">
      <PageHeader
        title="Your Profile"
        subtitle="Manage your account and preferences"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="p-8 md:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-6">
            <Avatar className="size-24 rounded-2xl">
              <AvatarFallback className="rounded-2xl text-4xl">
                {user.nickname.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                {user.nickname}
              </h2>
              <p className="font-base text-on-surface-variant">
                {user.name || 'Flashcard Enthusiast'}
              </p>
              <div className="flex gap-2 mt-2">
                {user.isEmailVerified && (
                  <Badge
                    variant="neutral"
                    className="bg-success-200 text-success-900 border-outline"
                  >
                    Verified
                  </Badge>
                )}
                <Badge
                  variant="neutral"
                  className="bg-surface-container text-on-surface border-outline"
                >
                  Free Plan
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4 p-4 border border-outline rounded-xl bg-neutral-0">
              <Mail className="opacity-50" size={20} />
              <div>
                <p className="text-xs text-on-surface-variant leading-none mb-1">
                  Email Address
                </p>
                <p className="font-bold">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-outline rounded-xl bg-neutral-0">
              <Calendar className="opacity-50" size={20} />
              <div>
                <p className="text-xs text-on-surface-variant leading-none mb-1">
                  Member Since
                </p>
                <p className="font-bold">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-outline rounded-xl bg-neutral-0">
              <Globe className="opacity-50" size={20} />
              <div className="flex-1">
                <p className="text-xs text-on-surface-variant leading-none mb-1">
                  Timezone
                </p>
                <Select
                  data-testid="profile-timezone-select"
                  value={user.timezone || ''}
                  onChange={handleTimezoneChange}
                  disabled={savingTimezone}
                  className="mt-1"
                >
                  <option value="">UTC (Default)</option>
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </Select>
                <p className="text-[10px] font-medium opacity-50 mt-1">
                  Used for local daily review limits and schedule boundaries
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-outline rounded-xl bg-neutral-0">
              <Shield className="opacity-50" size={20} />
              <div>
                <p className="text-xs text-on-surface-variant leading-none mb-1">
                  Account ID
                </p>
                <p className="font-mono text-xs font-bold">{user.id}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <Card className="p-6 bg-neutral-0">
            <h3 className="font-semibold text-sm mb-4">Account Actions</h3>
            <div className="space-y-3">
              <Button
                variant="neutral"
                className="w-full justify-start gap-2 font-bold"
              >
                Edit Profile
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-surface-container">
            <h3 className="font-semibold text-sm mb-2">Study Progress</h3>
            <p className="text-xs font-semibold text-neutral-700 mb-4">
              You have mastered 124 cards this month!
            </p>
            <Button variant="neutral" className="w-full font-bold bg-neutral-0">
              View Statistics
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
