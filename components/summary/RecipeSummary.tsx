'use client'

import { RecipeSummary as RecipeSummaryType } from '@/types/summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import TimestampBadge from './TimestampBadge'
import CopyButton from './CopyButton'
import CommentBubble from '@/components/comments/CommentBubble'

interface Props {
  data: RecipeSummaryType
  onSeek: (ts: string) => void
  sessionId?: string
  commentCounts?: Record<string, number>
  onComment?: (segmentId: string, segmentLabel: string) => void
  hideTimestamp?: boolean
}

const GROUP_COLORS: Record<string, string> = {
  'Main Ingredients': 'text-orange-400',
  'Seasonings':       'text-red-400',
  'Sauce':            'text-red-400',
  'Broth':            'text-blue-400',
  'Batter':           'text-yellow-400',
  'Vegetables':       'text-green-400',
  'Garnish':          'text-pink-400',
}
function groupColor(group: string) {
  return GROUP_COLORS[group] ?? 'text-zinc-400'
}

export default function RecipeSummary({ data, onSeek, sessionId, commentCounts = {} }: Props) {
  const groups = data.ingredient_groups ??
    (data.ingredients ? [{ group: 'Ingredients', items: data.ingredients }] : [])

  const allItems = groups.flatMap(g => g.items)
  const copyText = `${data.dish_name}\nDifficulty: ${data.difficulty} | ${data.total_time} | ${data.servings}\n\nIngredients:\n${allItems.map(i => `- ${i.name} ${i.amount}`).join('\n')}\n\nSteps:\n${data.steps.map(s => `${s.step}. [${s.timestamp}] ${s.desc}${s.tip ? ` (Tip: ${s.tip})` : ''}`).join('\n')}\n\nKey Tips:\n${data.key_tips.map(t => `• ${t}`).join('\n')}`

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-orange-400 text-sm mb-1">🍳 Recipe Card</CardTitle>
          <h2 className="text-xl font-bold text-zinc-100">{data.dish_name}</h2>
          <p className="text-zinc-400 text-sm mt-1">{data.difficulty} · {data.total_time}</p>
        </div>
        <CopyButton text={copyText} />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">

        {/* Ingredients (by group) */}
        <div>
          <h3 className="text-zinc-300 font-semibold mb-3">Ingredients ({data.servings})</h3>
          <div className="flex flex-col gap-3">
            {groups.map((grp, gi) => (
              <div key={gi} className="bg-zinc-800 rounded-xl overflow-hidden">
                {groups.length > 1 && (
                  <div className={`px-3 py-1.5 text-xs font-semibold bg-zinc-700/60 ${groupColor(grp.group)}`}>
                    {grp.group}
                  </div>
                )}
                <div className="p-3 flex flex-col gap-1">
                  {grp.items.map((ing, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-zinc-200">{ing.name}</span>
                      <span className="text-zinc-400">{ing.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Steps */}
        <div>
          <h3 className="text-zinc-300 font-semibold mb-3">Instructions</h3>
          <div className="flex flex-col gap-4">
            {data.steps.map((step) => {
              const segId = `step-${step.step}`
              const segLabel = `Step ${step.step}`
              return (
                <div key={step.step} id={`seg-${segId}`} className="flex gap-3 transition-all rounded-lg p-1 -m-1">
                  <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-bold text-[11px] leading-tight whitespace-nowrap">Step {step.step}</span>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {step.tip && <span className="text-emerald-400 text-xs">★</span>}
                      {sessionId && (
                        <CommentBubble
                          sessionId={sessionId}
                          segmentId={segId}
                          segmentLabel={segLabel}
                          initialCount={commentCounts[segId] ?? 0}
                        />
                      )}
                    </div>
                    <p className="text-zinc-200 text-sm">{step.desc}{' '}<TimestampBadge timestamp={step.timestamp} onSeek={onSeek} /></p>
                    {step.tip && <p className="text-emerald-400 text-xs">{step.tip}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key tips */}
        {data.key_tips.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div>
              <h3 className="text-emerald-400 font-semibold mb-2">💡 Key Tips</h3>
              <ul className="flex flex-col gap-2">
                {data.key_tips.map((tip, i) => {
                  const segId = `tip-${i}`
                  const segLabel = `Tip ${i + 1}`
                  return (
                    <li key={i} id={`seg-${segId}`} className="flex items-start justify-between gap-2 transition-all rounded-lg p-1 -m-1">
                      <span className="text-zinc-300 text-sm">• {tip}</span>
                      {sessionId && (
                        <CommentBubble
                          sessionId={sessionId}
                          segmentId={segId}
                          segmentLabel={segLabel}
                          initialCount={commentCounts[segId] ?? 0}
                        />
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
  )
}
