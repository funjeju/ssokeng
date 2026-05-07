'use client'

import { NewsSummary as NewsSummaryType } from '@/types/summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import TimestampBadge from './TimestampBadge'
import CopyButton from './CopyButton'
import CommentBubble from '@/components/comments/CommentBubble'
import TranslateButton from './TranslateButton'

interface Props {
  data: NewsSummaryType
  onSeek: (ts: string) => void
  sessionId?: string
  commentCounts?: Record<string, number>
  onComment?: (segmentId: string, segmentLabel: string) => void
  hideTimestamp?: boolean
  showTranslate?: boolean
}

export default function NewsSummary({ data, onSeek, sessionId, commentCounts = {}, showTranslate }: Props) {
  const fiveW = [
    { key: 'Who',   value: data.five_w.who },
    { key: 'When',  value: data.five_w.when },
    { key: 'Where', value: data.five_w.where },
    { key: 'What',  value: data.five_w.what },
    { key: 'How',   value: data.five_w.how },
    { key: 'Why',   value: data.five_w.why },
  ]

  const copyText = `${data.headline}\n\n${data.three_line_summary}\n\n5 W's:\n${fiveW.map(f => `${f.key}: ${f.value}`).join('\n')}\n\nBackground [${data.background.timestamp}]:\n${data.background.desc}\n\nTakeaways:\n${data.implications.map(i => `[${i.timestamp}] ${i.point}`).join('\n')}`

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-zinc-400 text-sm mb-1">🗞️ News Brief</CardTitle>
          <h2 className="text-xl font-bold text-zinc-100">{data.headline}</h2>
        </div>
        <CopyButton text={copyText} />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">

        {/* 3-line summary */}
        <div id="seg-three-line" className="bg-zinc-800 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-blue-400 font-semibold text-sm">📌 3-Line Summary</h3>
            {sessionId && (
              <CommentBubble sessionId={sessionId} segmentId="three-line" segmentLabel="3-Line Summary" initialCount={commentCounts['three-line'] ?? 0} />
            )}
          </div>
          <div className="text-zinc-200 text-sm leading-relaxed space-y-1.5">
            {data.three_line_summary.split('\n').filter(Boolean).map((line, i) => (
              <p key={i} className="flex gap-2">
                <span className="shrink-0 text-blue-400 font-bold">{i + 1}.</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
          {showTranslate && <TranslateButton text={data.three_line_summary} className="mt-2" />}
        </div>

        {/* 5 W's */}
        <div>
          <h3 className="text-zinc-300 font-semibold mb-3">5 W&apos;s</h3>
          <Table>
            <TableBody>
              {fiveW.map((item, i) => {
                const segId = `fivew-${i}`
                return (
                  <TableRow key={item.key} id={`seg-${segId}`} className="border-zinc-800">
                    <TableCell className="text-zinc-400 font-medium w-20">{item.key}</TableCell>
                    <TableCell className="text-zinc-200">{item.value}</TableCell>
                    <TableCell className="w-10 text-right">
                      {sessionId && (
                        <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`5W - ${item.key}`} initialCount={commentCounts[segId] ?? 0} />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Background */}
        <div id="seg-background">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-zinc-300 font-semibold">Background</h3>
            {sessionId && (
              <CommentBubble sessionId={sessionId} segmentId="background" segmentLabel="Background" initialCount={commentCounts['background'] ?? 0} />
            )}
          </div>
          <p className="text-zinc-300 text-sm">{data.background.desc}{' '}<TimestampBadge timestamp={data.background.timestamp} onSeek={onSeek} /></p>
        </div>

        {/* Key moments timeline */}
        {data.key_moments?.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div>
              <h3 className="text-zinc-300 font-semibold mb-3">🕐 Key Moments</h3>
              <div className="flex flex-col gap-2">
                {data.key_moments.map((km, i) => {
                  const segId = `key-moment-${i}`
                  return (
                    <div key={i} id={`seg-${segId}`} className="flex items-start gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="text-zinc-200 text-sm">{km.point}{' '}<TimestampBadge timestamp={km.timestamp} onSeek={onSeek} /></p>
                      </div>
                      {sessionId && (
                        <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Key Moment ${i + 1}`} initialCount={commentCounts[segId] ?? 0} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Takeaways */}
        {data.implications.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div>
              <h3 className="text-zinc-300 font-semibold mb-3">Takeaways</h3>
              <div className="flex flex-col gap-2">
                {data.implications.map((imp, i) => {
                  const segId = `implication-${i}`
                  return (
                    <div key={i} id={`seg-${segId}`} className="flex items-start gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="text-zinc-200 text-sm">{imp.point}{' '}<TimestampBadge timestamp={imp.timestamp} onSeek={onSeek} /></p>
                        {showTranslate && <TranslateButton text={imp.point} />}
                      </div>
                      {sessionId && (
                        <CommentBubble sessionId={sessionId} segmentId={segId} segmentLabel={`Takeaway ${i + 1}`} initialCount={commentCounts[segId] ?? 0} />
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
