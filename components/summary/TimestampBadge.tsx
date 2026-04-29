'use client'

import { Badge } from '@/components/ui/badge'

interface TimestampBadgeProps {
  timestamp: string
  onSeek: (ts: string) => void
}

export default function TimestampBadge({ timestamp, onSeek }: TimestampBadgeProps) {
  // 빈 문자열이거나 "00:00"이면 PDF/웹 소스 → 숨김
  if (!timestamp || timestamp === '00:00') return null

  return (
    <Badge
      variant="outline"
      data-ts={timestamp}
      className="cursor-pointer font-mono text-xs rounded border-zinc-700 text-zinc-500 hover:text-blue-300 hover:border-zinc-500 transition-colors inline-flex"
      onClick={() => onSeek(timestamp)}
    >
      ▶ {timestamp}
    </Badge>
  )
}
