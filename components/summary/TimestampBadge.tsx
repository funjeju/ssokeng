'use client'

import { Badge } from '@/components/ui/badge'

interface TimestampBadgeProps {
  timestamp: string
  onSeek: (ts: string) => void
}

export default function TimestampBadge({ timestamp, onSeek }: TimestampBadgeProps) {
  if (!timestamp || timestamp === '00:00') return null

  const isPdfRef = /^p\.?\d+/i.test(timestamp)

  return (
    <Badge
      variant="outline"
      data-ts={timestamp}
      className="cursor-pointer font-mono text-xs rounded border-zinc-700 text-zinc-500 hover:text-blue-300 hover:border-zinc-500 transition-colors inline-flex"
      onClick={() => onSeek(timestamp)}
    >
      {isPdfRef ? `📄 ${timestamp}` : `▶ ${timestamp}`}
    </Badge>
  )
}
