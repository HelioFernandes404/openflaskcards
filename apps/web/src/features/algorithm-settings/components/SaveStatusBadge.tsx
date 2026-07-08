import { Badge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'

interface SaveStatusBadgeProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function SaveStatusBadge({ status }: SaveStatusBadgeProps) {
  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <Badge variant="neutral" className="gap-2">
        <Spinner size="sm" />
        Saving…
      </Badge>
    )
  }

  if (status === 'saved') {
    return <Badge variant="outlined">Saved</Badge>
  }

  return <Badge variant="default">Save failed</Badge>
}
