'use client'

import { LearningSummary as LearningSummaryType } from '@/types/summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import TimestampBadge from './TimestampBadge'
import CopyButton from './CopyButton'
import CommentBubble from '@/components/comments/CommentBubble'
import TranslateButton from './TranslateButton'

interface Props {
  data: LearningSummaryType
  onSeek: (ts: string) => void
  sessionId?: string
  commentCounts?: Record<string, number>
  onComment?: (segmentId: string, segmentLabel: string) => void
  hideTimestamp?: boolean
  showTranslate?: boolean
}

export default function LearningSummary({ data, onSeek, sessionId, commentCounts = {}, showTranslate }: Props) {
  const copyText = `${data.subject}\n\nKey Concepts:\n${data.concepts.map(c => `[${c.timestamp}] ${c.name}: ${c.desc}`).join('\n')}\n\nKey Points:\n${data.key_points.map(p => `[${p.timestamp}] • ${p.point}`).join('\n')}\n\nExamples:\n${data.examples.map(e => `[${e.timestamp}] ${e.desc}`).join('\n')}`

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-violet-400 text-sm mb-1">📐 Learning Summary</CardTitle>
          <h2 className="text-xl font-bold text-zinc-100">{data.subject}</h2>
        </div>
        <CopyButton text={copyText} />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">

        {/* Key concepts */}
        <div>
          <h3 className="text-zinc-300 font-semibold mb-3">Key Concepts</h3>
          <div className="flex flex-col gap-3">
            {data.concepts.map((concept, i) => {
              const segId = `concept-${i}`
              return (
                <div key={i} id={`seg-${segId}`} className="bg-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-violet-300 font-medium text-sm">{concept.name}</span>
                    <TimestampBadge timestamp={concept.timestamp} onSeek={onSeek} />
                    {sessionId && (
                      <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Concept - ${concept.name}`} initialCount={commentCounts[segId] ?? 0} />
                    )}
                    {showTranslate && <TranslateButton text={`${concept.name}: ${concept.desc}`} />}
                  </div>
                  <p className="text-zinc-300 text-sm">{concept.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Key points */}
        <div>
          <h3 className="text-zinc-300 font-semibold mb-3">Key Points</h3>
          <div className="flex flex-col gap-2">
            {data.key_points.map((kp, i) => {
              const segId = `keypoint-${i}`
              return (
                <div key={i} id={`seg-${segId}`} className="flex items-start gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="text-zinc-200 text-sm">• {kp.point}{' '}<TimestampBadge timestamp={kp.timestamp} onSeek={onSeek} /></p>
                    {showTranslate && <TranslateButton text={kp.point} />}
                  </div>
                  {sessionId && (
                    <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Key Point ${i + 1}`} initialCount={commentCounts[segId] ?? 0} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Examples */}
        {data.examples.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div>
              <h3 className="text-zinc-300 font-semibold mb-3">Examples</h3>
              <div className="flex flex-col gap-2">
                {data.examples.map((ex, i) => {
                  const segId = `example-${i}`
                  return (
                    <div key={i} id={`seg-${segId}`} className="flex items-start gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="text-zinc-300 text-sm">{ex.desc}{' '}<TimestampBadge timestamp={ex.timestamp} onSeek={onSeek} /></p>
                      </div>
                      {sessionId && (
                        <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Example ${i + 1}`} initialCount={commentCounts[segId] ?? 0} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
