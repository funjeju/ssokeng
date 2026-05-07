'use client'

import { useState } from 'react'
import { TravelSummary as TravelSummaryType } from '@/types/summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import TimestampBadge from './TimestampBadge'
import CopyButton from './CopyButton'
import CommentBubble from '@/components/comments/CommentBubble'
import WishSpotModal from '@/components/travel/WishSpotModal'
import { useAuth } from '@/providers/AuthProvider'
import { getLocalUserId } from '@/lib/user'

interface Props {
  data: TravelSummaryType
  onSeek: (ts: string) => void
  sessionId?: string
  commentCounts?: Record<string, number>
  onComment?: (segmentId: string, segmentLabel: string) => void
  hideTimestamp?: boolean
  videoId?: string
  thumbnail?: string
}

export default function TravelSummary({ data, onSeek, sessionId, commentCounts = {}, videoId, thumbnail }: Props) {
  const { user, openAuthModal } = useAuth()
  const [wishSpot, setWishSpot] = useState<{ name: string; desc: string; price?: string; timestamp: string } | null>(null)

  const handleWish = (place: { name: string; desc: string; price?: string; timestamp: string }) => {
    if (!user) { openAuthModal(); return }
    setWishSpot(place)
  }

  const userId = user?.uid ?? getLocalUserId()
  const copyText = `${data.destination}\n\nPlaces:\n${data.places.map(p => `[${p.timestamp}] ${p.name}\n${p.desc}${p.price ? `\nPrice: ${p.price}` : ''}${p.tip ? `\nTip: ${p.tip}` : ''}`).join('\n\n')}\n\nRecommended Route: ${data.route}\n\nPractical Info:\n${data.practical_info.map(i => `• ${i}`).join('\n')}\n\nWarnings:\n${data.warnings.map(w => `⚠️ ${w}`).join('\n')}`

  return (
    <>
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-cyan-400 text-sm mb-1">🧳 Travel Guide</CardTitle>
          <h2 className="text-xl font-bold text-zinc-100">{data.destination}</h2>
        </div>
        <CopyButton text={copyText} />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">

        {/* 방문지 */}
        <div>
          <h3 className="text-zinc-300 font-semibold mb-3">📍 Places</h3>
          <div className="flex flex-col gap-3">
            {data.places.map((place, i) => {
              const segId = `place-${i}`
              return (
                <div key={i} id={`seg-${segId}`} className="bg-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-cyan-300 font-medium text-sm">{place.name}</span>
                    <TimestampBadge timestamp={place.timestamp} onSeek={onSeek} />
                    {place.price && <span className="text-zinc-400 text-xs">{place.price}</span>}
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        onClick={() => handleWish(place)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-[11px] font-semibold transition-colors"
                        title="Save to wish list"
                      >
                        🗺️ Wish
                      </button>
                      {sessionId && (
                        <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Place - ${place.name}`} initialCount={commentCounts[segId] ?? 0} />
                      )}
                    </div>
                  </div>
                  <p className="text-zinc-300 text-sm">{place.desc}</p>
                  {place.tip && <p className="text-amber-400 text-xs">💡 {place.tip}</p>}
                </div>
              )
            })}
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* 추천 동선 */}
        <div id="seg-route">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-zinc-300 font-semibold">🗺️ Recommended Route</h3>
            {sessionId && (
              <CommentBubble sessionId={sessionId} segmentId="route" segmentLabel="Recommended Route" initialCount={commentCounts['route'] ?? 0} />
            )}
          </div>
          <p className="text-zinc-300 text-sm">{data.route}</p>
        </div>

        {/* 실용 정보 */}
        {data.practical_info.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div>
              <h3 className="text-zinc-300 font-semibold mb-2">Practical Info</h3>
              <ul className="flex flex-col gap-1">
                {data.practical_info.map((info, i) => {
                  const segId = `practical-${i}`
                  return (
                    <li key={i} id={`seg-${segId}`} className="flex items-start gap-2">
                      <span className="text-zinc-300 text-sm flex-1">• {info}</span>
                      {sessionId && (
                        <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Practical Info ${i + 1}`} initialCount={commentCounts[segId] ?? 0} />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}

        {/* 주의사항 */}
        {data.warnings.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div>
              <h3 className="text-amber-400 font-semibold mb-2">⚠️ Warnings</h3>
              <ul className="flex flex-col gap-1">
                {data.warnings.map((warning, i) => {
                  const segId = `warning-${i}`
                  return (
                    <li key={i} id={`seg-${segId}`} className="flex items-start gap-2">
                      <span className="text-amber-300 text-sm flex-1">• {warning}</span>
                      {sessionId && (
                        <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Warning ${i + 1}`} initialCount={commentCounts[segId] ?? 0} />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {wishSpot && user && (
      <WishSpotModal
        userId={userId}
        spot={{
          name: wishSpot.name,
          description: wishSpot.desc,
          sourceType: 'youtube',
          sourceVideoId: videoId,
          sourceSessionId: sessionId,
          videoTimestamp: wishSpot.timestamp,
          thumbnail,
        }}
        onClose={() => setWishSpot(null)}
        onAdded={() => setWishSpot(null)}
      />
    )}
    </>
  )
}
