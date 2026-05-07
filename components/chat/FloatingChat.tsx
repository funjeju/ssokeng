'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { SavedSummary } from '@/lib/db'

interface ChatMsg {
  role: 'user' | 'model'
  content: string
  relatedIds?: string[]
}

interface FloatingChatProps {
  summaries: SavedSummary[]
  source: 'mypage' | 'square'
  userId?: string  // mypage: 유저 ID (서버사이드 검색용), square: 불필요
}

// 카테고리별 summary 객체에서 핵심 텍스트 200자 추출
function extractShortText(category: string, summary: any): string {
  if (!summary) return ''
  try {
    let parts: string[] = []
    switch (category) {
      case 'recipe':
        parts = [
          summary.dish_name,
          summary.key_tips?.slice(0, 2).join(' '),
          summary.steps?.slice(0, 2).map((s: any) => s.desc).join(' '),
        ]
        break
      case 'english':
        parts = [
          summary.song_or_title,
          summary.expressions?.slice(0, 3).map((e: any) => e.text).join(' '),
          summary.patterns?.slice(0, 2).join(' '),
        ]
        break
      case 'learning':
        parts = [
          summary.subject,
          summary.concepts?.slice(0, 2).map((c: any) => c.name + ' ' + c.desc).join(' '),
          summary.key_points?.slice(0, 2).map((k: any) => k.point).join(' '),
        ]
        break
      case 'news':
        parts = [
          summary.headline,
          summary.three_line_summary,
          summary.five_w?.what,
        ]
        break
      case 'selfdev':
        parts = [
          summary.core_message?.text,
          summary.insights?.slice(0, 2).map((i: any) => i.point).join(' '),
          summary.checklist?.slice(0, 2).join(' '),
        ]
        break
      case 'travel':
        parts = [
          summary.destination,
          summary.places?.slice(0, 2).map((p: any) => p.name + ' ' + p.desc).join(' '),
          summary.route,
        ]
        break
      case 'story':
        parts = [
          summary.title,
          summary.genre,
          summary.conclusion,
        ]
        break
      case 'tips':
        parts = [
          summary.topic,
          summary.key_message,
          summary.top3?.join(' '),
        ]
        break
      default:
        parts = [JSON.stringify(summary).slice(0, 200)]
    }
    return parts.filter(Boolean).join(' ').slice(0, 200)
  } catch {
    return ''
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  recipe: '🍳 Cooking', english: '🔤 English', learning: '📐 Learning', news: '🗞️ News',
  selfdev: '💪 Self-dev', travel: '🧳 Travel', story: '🍿 Story', tips: '💡 Tips',
}

const QUICK_QUESTIONS: Record<'mypage' | 'square', string[]> = {
  mypage: ['Do I have any saved cooking videos?', 'Show me study-related saves', 'What did I save recently?'],
  square: ['Recommend English content for beginners', 'Any new tips videos lately?', 'What cooking videos are popular?'],
}

export default function FloatingChat({ summaries, source, userId }: FloatingChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      const summaryMeta = summaries.map(s => ({
        id: s.id,
        sessionId: s.sessionId,
        title: s.title,
        category: s.category,
        tags: s.square_meta?.tags ?? [],
        // contextSummary 우선, 없으면 기존 필드 추출로 폴백
        shortText: s.contextSummary || extractShortText(s.category, s.summary),
      }))

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
      {/* 플로팅 버튼 — 모바일: 원형 아이콘 / PC: 아이콘 + 텍스트 pill */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-50 shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          open
            ? 'w-14 h-14 rounded-full bg-[var(--bg-elevated-2)] text-white text-xl'
            : 'h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white px-4 gap-2'
        }`}
        title={`${contextLabel} AI Assistant`}
      >
        {open ? (
          <span className="text-xl">✕</span>
        ) : (
          <>
            <span className="text-lg leading-none">💬</span>
            <span className="hidden md:inline text-sm font-bold whitespace-nowrap">AI Search</span>
          </>
        )}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-[380px] h-[500px] bg-[var(--bg-base)] rounded-2xl flex flex-col shadow-2xl border border-[var(--border-default)] overflow-hidden">

          {/* 헤더 */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm">💬</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">AI Assistant</p>
              <p className="text-[var(--text-subtle)] text-[11px]">{contextLabel} · {summaries.length} items</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
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
                  Ask anything about {contextLabel}.
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

                  {/* 관련 콘텐츠 카드 */}
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
                              <img
                                src={item.thumbnail}
                                alt=""
                                className="w-12 h-8 object-cover rounded-md shrink-0 bg-[var(--bg-elevated)]"
                              />
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
                placeholder={`Search in ${contextLabel}...`}
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
