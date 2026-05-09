'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { SavedSummary } from '@/lib/db'

interface ChatMsg {
  role: 'user' | 'model'
  content: string
  relatedIds?: string[]
}

interface SummaryMeta {
  id: string
  sessionId: string
  title: string
  category: string
  channel?: string
  tags: string[]
  shortText?: string
  createdAt?: string
}

interface FloatingChatProps {
  summaries: SavedSummary[]
  source: 'mypage' | 'square'
  userId?: string
}

const CAT_SYNONYMS: Record<string, string[]> = {
  recipe:   ['recipe', 'cooking', 'food', 'cook', 'dish', 'meal', 'ingredient', 'bake', 'chef', 'kitchen'],
  english:  ['english', 'language', 'grammar', 'pronunciation', 'vocabulary', 'listening', 'speaking', 'esl'],
  learning: ['learning', 'study', 'lecture', 'education', 'course', 'tutorial', 'lesson', 'math', 'science', 'school'],
  news:     ['news', 'current events', 'politics', 'economy', 'world', 'breaking', 'report', 'media'],
  selfdev:  ['self-dev', 'motivation', 'productivity', 'habit', 'mindset', 'growth', 'self improvement', 'goal'],
  travel:   ['travel', 'trip', 'destination', 'tour', 'vacation', 'place', 'country', 'city', 'explore'],
  story:    ['story', 'drama', 'movie', 'film', 'series', 'plot', 'character', 'entertainment', 'fiction'],
  tips:     ['tips', 'hacks', 'trick', 'how-to', 'advice', 'guide', 'life hack', 'diy'],
}

function stripKoreanParticles(word: string): string {
  return word.replace(/(에서|에게|이라고|부터|까지|으로|에는|과는|와는|이나|거나|고는|은|는|이|가|을|를|의|로|와|과|도|만|나|에|서|께)$/u, '')
}

function formatSavedDate(createdAt: any): string {
  if (!createdAt) return ''
  try {
    const d = createdAt?.toDate?.() ?? (createdAt?.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt))
    return d.toISOString().slice(0, 10).replace(/-/g, '.')
  } catch { return '' }
}

function extractShortText(category: string, summary: any): string {
  if (!summary) return ''
  try {
    let parts: string[] = []
    switch (category) {
      case 'recipe':
        parts = [summary.dish_name, summary.key_tips?.slice(0, 2).join(' '), summary.steps?.slice(0, 2).map((s: any) => s.desc).join(' ')]
        break
      case 'english':
        parts = [summary.song_or_title, summary.expressions?.slice(0, 3).map((e: any) => e.text).join(' '), summary.patterns?.slice(0, 2).join(' ')]
        break
      case 'learning':
        parts = [summary.subject, summary.concepts?.slice(0, 2).map((c: any) => c.name + ' ' + c.desc).join(' '), summary.key_points?.slice(0, 2).map((k: any) => k.point).join(' ')]
        break
      case 'news':
        parts = [summary.headline, summary.three_line_summary, summary.five_w?.what]
        break
      case 'selfdev':
        parts = [summary.core_message?.text, summary.insights?.slice(0, 2).map((i: any) => i.point).join(' '), summary.checklist?.slice(0, 2).join(' ')]
        break
      case 'travel':
        parts = [summary.destination, summary.places?.slice(0, 2).map((p: any) => p.name + ' ' + p.desc).join(' '), summary.route]
        break
      case 'story':
        parts = [summary.title, summary.genre, summary.conclusion]
        break
      case 'tips':
        parts = [summary.topic, summary.key_message, summary.top3?.join(' ')]
        break
      default:
        parts = [JSON.stringify(summary).slice(0, 200)]
    }
    return parts.filter(Boolean).join(' ').slice(0, 200)
  } catch { return '' }
}

const CATEGORY_LABEL: Record<string, string> = {
  recipe: '🍳 Cooking', english: '🔤 English', learning: '📐 Learning', news: '🗞️ News',
  selfdev: '💪 Self-dev', travel: '🧳 Travel', story: '🍿 Story', tips: '💡 Tips',
}

const QUICK_QUESTIONS: Record<'mypage' | 'square', string[]> = {
  mypage: ['Do I have any saved cooking videos?', 'Show me study-related saves', 'What did I save recently?'],
  square: ['Recommend English content for beginners', 'Any new tips videos lately?', 'What cooking videos are popular?'],
}

function buildCandidates(summaries: SavedSummary[], query: string, limit = 50): SummaryMeta[] {
  const tokens = query.toLowerCase().split(/\s+/).map(stripKoreanParticles).filter(w => w.length >= 2)

  const sorted = [...summaries].sort((a, b) => {
    const aT = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)
    const bT = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)
    return bT - aT
  })

  const scored = sorted.map(s => {
    const title = s.title.toLowerCase()
    const channel = (s.channel ?? '').toLowerCase()
    const tags = (s.square_meta?.tags ?? []).join(' ').toLowerCase()
    const shortText = (s.contextSummary || extractShortText(s.category, s.summary)).toLowerCase()
    const catSynonyms = (CAT_SYNONYMS[s.category] ?? []).join(' ').toLowerCase()
    const catLabel = (CATEGORY_LABEL[s.category] ?? s.category).toLowerCase()

    let score = 0
    for (const token of tokens) {
      if (title.includes(token)) score += 3
      if (catSynonyms.includes(token) || catLabel.includes(token) || s.category.includes(token)) score += 2
      if (tags.includes(token)) score += 2
      if (channel.includes(token)) score += 1
      if (shortText.includes(token)) score += 1
    }
    return { s, score }
  })

  const withScore = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score)
  const toMeta = (x: { s: SavedSummary }): SummaryMeta => ({
    id: x.s.id,
    sessionId: x.s.sessionId,
    title: x.s.title,
    category: x.s.category,
    channel: x.s.channel,
    tags: x.s.square_meta?.tags ?? [],
    shortText: x.s.contextSummary || extractShortText(x.s.category, x.s.summary),
    createdAt: formatSavedDate(x.s.createdAt),
  })

  const result = withScore.slice(0, limit).map(toMeta)

  if (result.length < limit) {
    const resultIds = new Set(result.map(r => r.id))
    const fill = scored
      .filter(x => x.score === 0 && !resultIds.has(x.s.id))
      .slice(0, limit - result.length)
      .map(toMeta)
    result.push(...fill)
  }

  return result
}

export default function FloatingChat({ summaries, source, userId }: FloatingChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastCandidatesRef = useRef<SummaryMeta[]>([])

  const contextLabel = source === 'mypage' ? 'My Library' : 'Square'

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getSummaryById = (id: string) =>
    summaries.find(s => s.id === id || s.sessionId === id)

  const handleSend = async (text?: string) => {
    const query = (text ?? input).trim()
    if (!query || loading) return

    const userMsg: ChatMsg = { role: 'user', content: query }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const fresh = buildCandidates(summaries, query, 50)
      let summaryMeta = fresh
      if (messages.length > 0 && lastCandidatesRef.current.length > 0) {
        const freshIds = new Set(fresh.map(m => m.id))
        summaryMeta = [
          ...fresh,
          ...lastCandidatesRef.current.filter(m => !freshIds.has(m.id)),
        ].slice(0, 50)
      }
      lastCandidatesRef.current = summaryMeta

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          source,
          summaryMeta,
        }),
      })

      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'model',
        content: data.text ?? 'An error occurred.',
        relatedIds: data.relatedIds ?? [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-50 shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          open
            ? 'w-14 h-14 rounded-full bg-[var(--bg-elevated-2)] text-white text-xl'
            : 'h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white px-4 gap-2'
        }`}
        title={`${contextLabel} AI Search`}
      >
        {open ? (
          <span className="text-xl">✕</span>
        ) : (
          <>
            <span className="text-lg leading-none">🔍</span>
            <span className="hidden md:inline text-sm font-bold whitespace-nowrap">AI Search</span>
          </>
        )}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-[380px] h-[500px] bg-[var(--bg-base)] rounded-2xl flex flex-col shadow-2xl border border-[var(--border-default)] overflow-hidden">

          {/* 헤더 */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm">🔍</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">AI Search Assistant</p>
              <p className="text-[var(--text-subtle)] text-[11px]">{contextLabel} · {summaries.length} items</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); lastCandidatesRef.current = [] }}
                className="text-[var(--text-subtle)] hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-[var(--overlay-subtle)] transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[var(--text-subtle)] text-sm text-center pt-2">
                  Search {contextLabel} with natural language.
                </p>
                <div className="space-y-1.5">
                  {QUICK_QUESTIONS[source].map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-elevated-2)] transition-colors border border-[var(--border-subtle)]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%] space-y-1.5">
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>

                  {msg.relatedIds && msg.relatedIds.length > 0 && (
                    <div className="space-y-1">
                      {msg.relatedIds.map(id => {
                        const item = getSummaryById(id)
                        if (!item) return null
                        return (
                          <Link
                            key={id}
                            href={`/result/${item.sessionId}`}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-orange-500/40 transition-colors group"
                          >
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="w-12 h-8 object-cover rounded-md shrink-0 bg-[var(--bg-elevated)]" />
                            ) : (
                              <div className="w-12 h-8 rounded-md bg-[var(--bg-elevated)] shrink-0 flex items-center justify-center text-base">
                                {item.category === 'pdf' ? '📄' : '🌐'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-white text-xs font-medium truncate group-hover:text-orange-400 transition-colors">
                                {item.title}
                              </p>
                              <p className="text-[var(--text-subtle)] text-[10px]">
                                {CATEGORY_LABEL[item.category] ?? item.category}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-[var(--bg-elevated)] text-[var(--text-subtle)] text-sm">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)] animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)] animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-3 py-3 border-t border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Search videos in natural language..."
                disabled={loading}
                className="flex-1 h-9 px-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors disabled:opacity-60"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
